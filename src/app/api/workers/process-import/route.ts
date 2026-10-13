import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { tmdb, TmdbClient, type TmdbMovieDetails } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';
import { syncMoviePeople } from '@/features/rankings/people-sync'; // Lógica compartida para sincronizar People
import { findOrCreateMovieId, resolveTmdbConflict } from '@/features/movie/tmdb-conflict';
import type { CsvMovieImport } from '@/features/import/types';

// Payload de un item de import_queue
type QueuedMovie = CsvMovieImport & { import_id?: string };

type MovieDataCheck = {
    extended_data?: { technical?: { runtime?: number | null }; crew_details?: unknown } | null;
    poster_url?: string | null;
} | null;

// Tiempo máximo de ejecución por lote (limitado por Vercel)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    try {
        // 1. Verificar seguridad
        const authHeader = request.headers.get('x-cron-secret');
        if (authHeader !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        let keepProcessing = true;
        let totalProcessed = 0;
        let totalSuccess = 0;
        let totalFailed = 0;

        const userIdsEncountered = new Set<string>();

        // Loop de procesamiento: Se mantiene vivo mientras tenga tiempo (< 50s)
        while (keepProcessing) {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime > 50000) {
                break;
            }

            // Obtener items pendientes (lotes de 10 para feedback rápido)
            const { data: queueItems, error: queueError } = await supabase
                .from('import_queue')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(10);

            if (queueError) throw new Error(`Error getting queue: ${queueError.message}`);

            if (!queueItems || queueItems.length === 0) {
                keepProcessing = false;
                break;
            }

            queueItems.forEach(item => userIdsEncountered.add(item.user_id));

            // 3. Procesar items individualmente
            const results = await Promise.allSettled(queueItems.map(async (item) => {
                const payload = item.payload;
                // Marcar como procesando
                const { error: updateQueueError } = await supabase.from('import_queue')
                    .update({ status: 'processing', updated_at: new Date().toISOString() })
                    .eq('id', item.id);
                if (updateQueueError) throw new Error(`Failed to mark queue item as processing: ${updateQueueError.message}`);

                try {
                    await processQueueItem(supabase, item.user_id, item.payload);
                    const { error: deleteError } = await supabase.from('import_queue').delete().eq('id', item.id);
                    if (deleteError) throw new Error(`Failed to delete queue item: ${deleteError.message}`);
                    return item.id;
                } catch (err: any) {
                    console.error(`Item failed ${item.id}:`, err);
                    // Marcar como fallido para reintento o inspección
                    const { error: updateError } = await supabase.from('import_queue')
                        .update({ status: 'failed', error_message: err.message || 'Error', updated_at: new Date().toISOString() })
                        .eq('id', item.id);
                    if (updateError) console.error(`Failed to mark queue item as failed: ${updateError.message}`);
                    throw err;
                }
            }));

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failCount = results.filter(r => r.status === 'rejected').length;

            totalProcessed += queueItems.length;
            totalSuccess += successCount;
            totalFailed += failCount;

            // Si trajimos menos del límite, es que ya no hay más pendientes, terminamos el bucle
            if (queueItems.length < 10) {
                keepProcessing = false;
            }
        }

        // 4. Trigger recursivo: verificamos si quedan items pendientes (Globales)
        const { count } = await supabase
            .from('import_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        const hasMore = count && count > 0;

        // La nueva lógica calcula rankings al vuelo, no necesita workers de estadísticas

        if (hasMore) {
            const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/workers/process-import`;

            // Disparo "Fire & Forget" con AbortController para no esperar respuesta
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);

            try {
                await fetch(workerUrl, {
                    method: 'POST',
                    headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
                    signal: controller.signal
                });
            } catch (err: unknown) {
                const errorName = err instanceof Error ? err.name : 'Unknown';
                if (errorName !== 'AbortError') {
                    console.error('Error triggering recursion:', err);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        } else {
            // Marcar imports como completados para usuarios sin items pendientes
            for (const userId of userIdsEncountered) {
                // Verificar si quedan items para este usuario específico
                const { count: userItemsLeft } = await supabase
                    .from('import_queue')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('status', 'pending');

                if (!userItemsLeft || userItemsLeft === 0) {
                    // No quedan items para este usuario, marcar sus imports como completados
                    await supabase
                        .from('user_imports')
                        .update({ status: 'completed' })
                        .eq('user_id', userId)
                        .eq('status', 'processing');
                }
            }
        }

        return NextResponse.json({
            processed: totalProcessed,
            success: totalSuccess,
            failed: totalFailed,
            recursive: !!hasMore,
            remaining: count
        });

    } catch (error: any) {
        console.error("Worker Global Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function processQueueItem(supabase: any, userId: string, movie: any) {
    // Series de TMDB: su TMDb ID puede coincidir con el de una película distinta
    // (TMDB numera películas y series por separado), así que las identificamos por
    // IMDb ID siguiendo el camino de IMDb, que ya maneja series.
    if (movie.source === 'tmdb' && movie.media_type === 'tv') {
        const imdbId = movie.imdb_id || (movie.tmdb_id ? (await tmdb.getTvAsMovieDetails(movie.tmdb_id))?.imdb_id : null);
        if (!imdbId) throw new Error('Serie sin IMDb ID en TMDB');
        movie = { ...movie, imdb_id: imdbId, source: 'imdb' };
    }

    // TMDB y Letterboxd se identifican por TMDb ID (directo o buscando por título).
    // Una fila de TMDB sin TMDb ID pero con IMDb ID sigue el camino de IMDb.
    if ((movie.source === 'tmdb' && movie.tmdb_id) || movie.source === 'letterboxd') {
        return processTmdbQueueItem(supabase, userId, movie);
    }

    // 1. Insertar/Actualizar Película Básica
    const { data: savedMovie, error: movieError } = await supabase.from('movies').upsert({
        imdb_id: movie.imdb_id,
        title: movie.title,
        year: movie.year,
        director: movie.directors,
        genres: movie.genres ? movie.genres.split(',').map((g: any) => g.trim()) : [],
        imdb_rating: movie.imdb_rating,
        extended_data: {
            technical: {
                runtime: movie.runtime_mins,
            }
        }
    }, { onConflict: 'imdb_id' }).select('id, extended_data, poster_url').single();

    if (movieError || !savedMovie) throw new Error(`Movie Save Error: ${movieError?.message}`);

    // 2. Watchlist (Calificación)
    const watchlistData: any = {
        user_id: userId,
        movie_id: savedMovie.id,
        updated_at: new Date().toISOString(),
    };
    if (movie.user_rating) watchlistData.user_rating = movie.user_rating;

    const { error: watchlistError } = await supabase.from('watchlists').upsert(watchlistData, { onConflict: 'user_id, movie_id' });
    if (watchlistError) throw new Error(`Watchlist Save Error: ${watchlistError.message}`);

    // 4. Vincular a Historial de Importación
    await linkToImport(supabase, userId, savedMovie.id, movie.import_id);

    // 5. Enriquecimiento de datos
    // Optimización: Si ya tenemos extended_data, runtime y fotos, evitamos llamar a TMDB.
    if (!hasExtendedData(savedMovie)) {
        await enrichMovieData(supabase, savedMovie.id, movie.imdb_id);
    }
}

/**
 * Películas de TMDB (traen TMDb ID) y de Letterboxd (solo título y año).
 * A diferencia del camino de IMDb, no pisa la fila de una película que ya existe:
 * la busca por ambas llaves (imdb_id / tmdb_id) y solo la enriquece si le faltan datos.
 */
async function processTmdbQueueItem(supabase: SupabaseClient, userId: string, movie: QueuedMovie) {
    // 1. Identificar la película en TMDB
    const tmdbId: number | null = movie.tmdb_id ?? await tmdb.findMovieIdByTitle(movie.title, movie.year);
    if (!tmdbId) throw new Error('No encontrada en TMDB');

    // Las series no llegan acá (ver processQueueItem): siempre es una película.
    const details = await tmdb.getMovieDetails(tmdbId);
    if (!details) throw new Error(`No se pudieron obtener los datos de TMDB (id ${tmdbId})`);

    // 2. Reutilizar la fila existente o crear una nueva
    const imdbId = movie.imdb_id || details.imdb_id || null;
    const year = details.release_date ? parseInt(details.release_date.slice(0, 4), 10) : movie.year;
    const findOrCreate = () => findOrCreateMovieId(supabase, {
        imdbId,
        tmdbId: details.id,
        insertPayload: {
            imdb_id: imdbId,
            tmdb_id: details.id,
            title: details.title || movie.title,
            year: year && year >= 1880 ? year : null, // CHECK (year >= 1880)
        },
    });
    // Si otro item del mismo lote insertó la película justo antes (choque del índice
    // UNIQUE), el segundo intento ya la encuentra.
    const movieId = (await findOrCreate()).id ?? (await findOrCreate()).id;
    if (!movieId) throw new Error('Movie Save Error: no se pudo crear la película');

    // Si reutilizamos una fila creada al navegar (sin imdb_id), le completamos el
    // imdb_id para que una futura importación de IMDb la encuentre y no cree una gemela.
    if (imdbId) {
        const { error: imdbError } = await supabase.from('movies').update({ imdb_id: imdbId }).eq('id', movieId).is('imdb_id', null);
        if (imdbError) console.error(`Error completando imdb_id de ${movieId}:`, imdbError);
    }

    // 3. Watchlist (Calificación)
    const watchlistData: Record<string, unknown> = {
        user_id: userId,
        movie_id: movieId,
        updated_at: new Date().toISOString(),
    };
    if (movie.user_rating) watchlistData.user_rating = movie.user_rating;

    const { error: watchlistError } = await supabase.from('watchlists').upsert(watchlistData, { onConflict: 'user_id, movie_id' });
    if (watchlistError) throw new Error(`Watchlist Save Error: ${watchlistError.message}`);

    // 4. Vincular a Historial de Importación
    await linkToImport(supabase, userId, movieId, movie.import_id);

    // 5. Enriquecer con los detalles ya descargados si a la película le faltan datos
    const { data: current } = await supabase.from('movies').select('extended_data, poster_url').eq('id', movieId).single();
    if (!hasExtendedData(current)) {
        await applyTmdbDetails(supabase, movieId, details);
    }
}

// Si ya tenemos extended_data, runtime, crew y póster, no hace falta volver a TMDB.
function hasExtendedData(movie: MovieDataCheck): boolean {
    return Boolean(
        movie?.extended_data?.technical?.runtime &&
        movie.extended_data.crew_details &&
        movie.poster_url
    );
}

async function linkToImport(supabase: SupabaseClient, userId: string, movieId: string, importId: string | undefined) {
    if (!importId) return;

    const { error: linkError } = await supabase.from('import_items').insert({
        import_id: importId,
        movie_id: movieId,
        user_id: userId
    }).select().single();

    // Ignorar duplicados (23505)
    if (linkError && linkError.code !== '23505') {
        console.error(`Error vinculando película ${movieId} al import ${importId}:`, linkError);
    }
}

// Obtiene detalles adicionales de TMDB (créditos, videos, etc.)
async function enrichMovieData(supabase: any, movieId: string, imdbId: string) {
    const details = await tmdb.findByImdbId(imdbId);

    if (details) {
        await applyTmdbDetails(supabase, movieId, details);
    }
}

// Guarda en la película los datos de TMDB: póster, sinopsis, cast, crew, etc.
async function applyTmdbDetails(supabase: SupabaseClient, movieId: string, details: TmdbMovieDetails) {
    // Resolvemos colisión de tmdb_id ANTES de escribir: si otra fila (huérfana,
    // creada al navegar) ya posee este tmdb_id, la fusionamos en esta película.
    // Sin esto, el UPDATE de abajo falla con 23505 y la película queda sin póster.
    await resolveTmdbConflict(supabase, movieId, details.id);

    // Sync people to relational tables
    if (details.credits) {
        await syncMoviePeople(supabase, movieId, details.credits);
    }

    const certification = details.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US')?.release_dates[0]?.certification;
    const trailer = details.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key;

    // Capturamos datos de colección/saga para agrupar roles de actores
    const collectionId = details.belongs_to_collection?.id || null;
    const collectionName = details.belongs_to_collection?.name || null;

    const extendedData = {
        cast: details.credits.cast.slice(0, 50).map((c: any) => ({
            name: c.name,
            role: c.character,
            photo: TmdbClient.getImageUrl(c.profile_path, 'w185')
        })),
        crew: {
            director: details.credits.crew.filter((c: any) => c.job === 'Director').map((c: any) => c.name).join(', '),
            screenplay: details.credits.crew.find((c: any) => c.job === 'Screenplay' || c.job === 'Writer')?.name,
            photography: details.credits.crew.find((c: any) => c.job === 'Director of Photography')?.name,
            music: details.credits.crew.find((c: any) => c.job === 'Original Music Composer')?.name
        },
        // IMPORTANTE: Incluimos detalles del crew (con fotos) para los rankings
        crew_details: details.credits.crew
            .filter((c: any) => ['Director', 'Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer'].includes(c.job))
            .map((c: any) => ({
                name: c.name,
                job: c.job,
                photo: TmdbClient.getImageUrl(c.profile_path, 'w185')
            })),
        technical: {
            runtime: details.runtime,
            budget: details.budget,
            revenue: details.revenue,
            vote_average: details.vote_average,
            vote_count: details.vote_count,
            genres: details.genres.map((g: any) => g.name),
            overview: details.overview,
            certification: certification,
            trailer_key: trailer,
            tagline: details.tagline
        },
        // Recomendaciones se cargan on-demand al visitar la película
        recommendations: []
    };

    const { error } = await supabase.from('movies').update({
        title: details.title, // Force update title from TMDB for consistency
        year: details.release_date ? parseInt(details.release_date.split('-')[0]) : undefined,
        extended_data: extendedData,
        poster_url: TmdbClient.getImageUrl(details.poster_path, 'w500'),
        backdrop_url: TmdbClient.getBestBackdropUrl(details.images, details.backdrop_path),
        synopsis: details.overview,
        director: extendedData.crew.director,
        genres: extendedData.technical.genres,
        tmdb_id: details.id
    }).eq('id', movieId);

    if (error) {
        console.error(`Error updating movie ${movieId} with TMDB data:`, error);
    }
}

