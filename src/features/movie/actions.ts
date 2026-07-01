'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { syncMoviePeople } from '@/features/rankings/people-sync';
import { resolveTmdbConflict, findOrCreateMovieId } from '@/features/movie/tmdb-conflict';
import { mapTmdbMovieToPayload, type MoviePayload } from '@/lib/tmdb/mappers';
export type MovieDetail = {
    id: string;
    imdb_id: string | null;
    title: string;
    year: number;
    release_date: string | null; // Fecha de estreno (para detectar películas sin estrenar)
    poster_url: string | null;
    backdrop_url: string | null;
    director: string | null;
    genres: string[];
    synopsis: string | null;
    imdb_rating: number | null; // Calificación IMDb
    rating?: number; // Calificación del usuario si existe
    personalRating?: number; // Puntaje personal del ranking (watchlists.user_rating)
    watchlist?: {
        status: string;
        added_at: string;
    } | null;
    extended_data: {
        technical?: {
            runtime?: number;
            certification?: string;
            tagline?: string;
            trailer_key?: string;
        };
        cast?: Array<{
            name: string;
            role: string;
            photo?: string;
        }>;
        crew?: {
            director?: string;
            screenplay?: string;
            photography?: string;
            music?: string;
        };
        crew_details?: Array<{
            name: string;
            job: string;
            photo?: string;
        }>;
        recommendations?: Array<{
            id: number;
            title: string;
            year: number;
            poster: string | null;
            tmdb_id: number;
        }>;
    };
};

export async function getMovie(id: string): Promise<MovieDetail | null> {
    const supabase = await createClient();

    // Obtener usuario actual en paralelo (no bloquea el resto de la lógica inicial)
    const userPromise = supabase.auth.getUser();

    // Detectar tipo de ID y buscar en cache primero
    const isTmdbId = /^\d+$/.test(id);
    let movieId = id;

    if (isTmdbId) {
        // Buscar en DB local por tmdb_id
        const { data: localMovie } = await supabase
            .from('movies')
            .select('id')
            .eq('tmdb_id', parseInt(id))
            .maybeSingle();

        if (localMovie) {
            movieId = localMovie.id;
        } else {
            // Cache MISS - fetch desde TMDB
            try {
                const { tmdb } = await import('@/lib/tmdb');
                const tmdbMovie = await tmdb.getMovieDetails(parseInt(id));

                if (tmdbMovie) {

                    // Si no hay recomendaciones, obtenerlas explícitamente
                    let validRecommendations = tmdbMovie.recommendations?.results || [];
                    if (validRecommendations.length === 0) {
                        try {
                            validRecommendations = await tmdb.getRecommendations(tmdbMovie.id);
                        } catch (e) {
                            console.error('Error fetching on-demand recommendations:', e);
                        }
                    }

                    const payload = mapTmdbMovieToPayload(tmdbMovie, validRecommendations);

                    // Punto único de creación: deduplica por imdb_id Y tmdb_id (y fusiona
                    // filas gemelas si existieran), en vez de insertar a ciegas.
                    const { id: resolvedId, created } = await findOrCreateMovieId(supabase, {
                        imdbId: tmdbMovie.imdb_id,
                        tmdbId: tmdbMovie.id,
                        insertPayload: payload,
                    });

                    if (resolvedId) {
                        movieId = resolvedId;
                        // Si reutilizamos una fila existente, la refrescamos con los datos de TMDB.
                        if (!created) {
                            const { error: updateError } = await supabase
                                .from('movies')
                                .update({ ...payload, tmdb_id: tmdbMovie.id })
                                .eq('id', movieId);
                            if (updateError) console.error(`Error updating movie ${movieId}:`, updateError);
                        }
                    }

                    // Sincronizar actores y crew con la DB
                    if (tmdbMovie.credits && movieId && movieId !== id) {
                        const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
                            auth: { persistSession: false }
                        });
                        await syncMoviePeople(adminClient, movieId, tmdbMovie.credits);
                    }
                }
            } catch (e) {
                console.error('Error in on-demand import:', e);
            }
        }
    }


    // 1. Obtener datos básicos de la película (ahora en paralelo con la autenticación)

    if (isTmdbId && movieId === id) {
        return null;
    }

    // Ejecutamos ambas promesas y esperamos
    const [userResult, movieResult] = await Promise.all([
        userPromise,
        supabase.from('movies').select('*').eq('id', movieId).single()
    ]);

    const user = userResult.data.user;
    const { data: movie, error } = movieResult;

    if (error || !movie) {
        console.error('Error fetching movie:', error, 'ID tried:', movieId);
        return null;
    }


    // 1.5 ENRIQUECIMIENTO ON-DEMAND (Full Repair & UUID Lookup)
    // Verificamos si la película está incompleta (falta sinopsis, cast o recomendaciones)
    const extended = movie.extended_data as any || {};
    const hasRecommendations = extended.recommendations && extended.recommendations.length > 0;
    const isIncomplete = !movie.synopsis || !extended.cast || extended.cast.length === 0 || !hasRecommendations;

    if (isIncomplete && (movie.tmdb_id || movie.imdb_id)) {
        let enrichmentSucceeded = false;
        try {
            const { tmdb } = await import('@/lib/tmdb');
            let tmdbMovie = null;

            if (movie.tmdb_id) {
                tmdbMovie = await tmdb.getMovieDetails(movie.tmdb_id);
            } else if (movie.imdb_id) {
                tmdbMovie = await tmdb.findByImdbId(movie.imdb_id);
            }

            if (tmdbMovie) {
                // Recommendations Fallback
                let validRecommendations = tmdbMovie.recommendations?.results || [];
                if (validRecommendations.length === 0) {
                    try {
                        validRecommendations = await tmdb.getRecommendations(tmdbMovie.id);
                    } catch (e) {
                        console.error('Error fetching on-demand recommendations:', e);
                    }
                }

                const payload = mapTmdbMovieToPayload(tmdbMovie, validRecommendations);

                // Si otra fila gemela (huérfana) ya posee este tmdb_id, la fusionamos
                // en esta película para liberar el índice UNIQUE antes de actualizar.
                // Sin esto el UPDATE falla con 23505 y la película nunca obtiene póster.
                await resolveTmdbConflict(supabase, movie.id, tmdbMovie.id);

                // TRANSACCIÓN: Actualizar película primero
                const { error: updateError } = await supabase
                    .from('movies')
                    .update(payload)
                    .eq('id', movie.id);

                if (updateError) {
                    throw new Error(`Movie update failed: ${updateError.message}`);
                }

                // Actualizar objeto en memoria para esta request
                Object.assign(movie, payload);

                // TRANSACCIÓN: Sync People (si falla, marcamos para retry)
                if (tmdbMovie.credits) {
                    try {
                        const adminClient = createAdminClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.SUPABASE_SERVICE_ROLE_KEY!,
                            { auth: { persistSession: false } }
                        );
                        await syncMoviePeople(adminClient, movie.id, tmdbMovie.credits);
                        enrichmentSucceeded = true;
                    } catch (syncError) {
                        console.error('syncMoviePeople failed, marking for retry:', syncError);
                        // Marcar película como parcialmente sincronizada
                        await supabase
                            .from('movies')
                            .update({ sync_status: 'people_sync_pending' })
                            .eq('id', movie.id);
                    }
                } else {
                    enrichmentSucceeded = true;
                }
            }
        } catch (e) {
            console.error('Error repairing movie data:', e);
            // Marcar película para re-intento futuro
            try {
                await supabase
                    .from('movies')
                    .update({ sync_status: 'enrichment_failed' })
                    .eq('id', movie.id);
            } catch { /* Silenciar error del rollback */ }
        }
    }

    // 2. Obtener interacciones del usuario si está logueado
    let userWatchlist = null;

    if (user) {
        const { data } = await supabase
            .from('watchlists')
            .select('updated_at, user_rating')
            .eq('movie_id', movieId)
            .eq('user_id', user.id)
            .maybeSingle();

        userWatchlist = data;
    }

    // 3. Armar respuesta
    return {
        id: movie.id,
        imdb_id: movie.imdb_id,
        title: movie.title,
        year: movie.year,
        release_date: movie.release_date || null,
        poster_url: movie.poster_url,
        backdrop_url: movie.backdrop_url,
        director: movie.director,
        genres: movie.genres || [],
        synopsis: movie.synopsis,
        imdb_rating: movie.imdb_rating || null,
        extended_data: movie.extended_data || {},
        rating: userWatchlist?.user_rating,
        personalRating: userWatchlist?.user_rating,
        watchlist: userWatchlist ? {
            status: 'listed',
            added_at: userWatchlist.updated_at!
        } : null
    };
}
