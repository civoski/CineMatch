import { createClient } from '@supabase/supabase-js';
import { tmdb, TmdbClient } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';
import { syncMoviePeople } from '@/features/rankings/people-sync'; // Lógica compartida para sincronizar People
import { resolveTmdbConflict } from '@/features/movie/tmdb-conflict';

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

    // 4. Enriquecimiento de datos
    // Optimización: Si ya tenemos extended_data, runtime y fotos, evitamos llamar a TMDB.
    const hasExtendedData = savedMovie.extended_data &&
        savedMovie.extended_data.technical &&
        savedMovie.extended_data.technical.runtime &&
        savedMovie.extended_data.crew_details &&
        savedMovie.poster_url;

    // 5. Vincular a Historial de Importación
    if (movie.import_id) {
        const { error: linkError } = await supabase.from('import_items').insert({
            import_id: movie.import_id,
            movie_id: savedMovie.id,
            user_id: userId
        }).select().single();

        // Ignorar duplicados (23505)
        if (linkError && linkError.code !== '23505') {
            console.error(`Error vinculando película ${savedMovie.id} al import ${movie.import_id}:`, linkError);
        }
    }

    if (!hasExtendedData) {
        await enrichMovieData(supabase, savedMovie.id, movie.imdb_id);
    }
}

// Obtiene detalles adicionales de TMDB (créditos, videos, etc.)
async function enrichMovieData(supabase: any, movieId: string, imdbId: string) {
    const details = await tmdb.findByImdbId(imdbId);

    if (details) {
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
}

