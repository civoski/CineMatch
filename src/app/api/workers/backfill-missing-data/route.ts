import { createClient } from '@supabase/supabase-js';
import { tmdb, TmdbClient } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';
import { syncMoviePeople } from '@/features/rankings/people-sync';
import { resolveTmdbConflict } from '@/features/movie/tmdb-conflict';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
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
            auth: { autoRefreshToken: false, persistSession: false }
        });

        let totalProcessed = 0;
        let totalUpdated = 0;
        let totalErrors = 0;

        // Fetch movies with null poster_url and non-null imdb_id
        const { data: movies, error: fetchError } = await supabase
            .from('movies')
            .select('id, imdb_id, title')
            .is('poster_url', null)
            .not('imdb_id', 'is', null)
            .limit(10); // small batches

        if (fetchError) {
            throw new Error(`Error fetching movies: ${fetchError.message}`);
        }

        if (!movies || movies.length === 0) {
            return NextResponse.json({ message: 'No movies to process', processed: 0 });
        }

        for (const movie of movies) {
            const elapsed = Date.now() - startTime;
            if (elapsed > 50000) break;

            totalProcessed++;
            try {
                const details = await tmdb.findByImdbId(movie.imdb_id);

                if (details) {
                    // Libera el tmdb_id si una fila gemela huérfana lo posee (evita 23505).
                    await resolveTmdbConflict(supabase, movie.id, details.id);

                    if (details.credits) {
                        await syncMoviePeople(supabase, movie.id, details.credits);
                    }

                    const certification = details.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US')?.release_dates[0]?.certification;
                    const trailer = details.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key;

                    const extendedData = {
                        cast: details.credits?.cast?.slice(0, 50).map((c: any) => ({
                            name: c.name,
                            role: c.character,
                            photo: TmdbClient.getImageUrl(c.profile_path, 'w185')
                        })) || [],
                        crew: {
                            director: details.credits?.crew?.filter((c: any) => c.job === 'Director').map((c: any) => c.name).join(', ') || '',
                            screenplay: details.credits?.crew?.find((c: any) => c.job === 'Screenplay' || c.job === 'Writer')?.name,
                            photography: details.credits?.crew?.find((c: any) => c.job === 'Director of Photography')?.name,
                            music: details.credits?.crew?.find((c: any) => c.job === 'Original Music Composer')?.name
                        },
                        crew_details: details.credits?.crew
                            ?.filter((c: any) => ['Director', 'Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer'].includes(c.job))
                            .map((c: any) => ({
                                name: c.name,
                                job: c.job,
                                photo: TmdbClient.getImageUrl(c.profile_path, 'w185')
                            })) || [],
                        technical: {
                            runtime: details.runtime,
                            budget: details.budget,
                            revenue: details.revenue,
                            vote_average: details.vote_average,
                            vote_count: details.vote_count,
                            genres: details.genres?.map((g: any) => g.name) || [],
                            overview: details.overview,
                            certification: certification,
                            trailer_key: trailer,
                            tagline: details.tagline
                        },
                        recommendations: []
                    };

                    const { error } = await supabase.from('movies').update({
                        title: details.title,
                        year: details.release_date ? parseInt(details.release_date.split('-')[0]) : undefined,
                        extended_data: extendedData,
                        poster_url: TmdbClient.getImageUrl(details.poster_path, 'w500'),
                        backdrop_url: TmdbClient.getBestBackdropUrl(details.images, details.backdrop_path),
                        synopsis: details.overview,
                        director: extendedData.crew.director,
                        genres: extendedData.technical.genres,
                        tmdb_id: details.id
                    }).eq('id', movie.id);

                    if (error) {
                        console.error(`Error updating movie ${movie.id} with TMDB data:`, error);
                        totalErrors++;
                    } else {
                        totalUpdated++;
                    }
                } else {
                    // Mark with an empty string so we don't try again if TMDB doesn't have it
                    await supabase.from('movies').update({ poster_url: '' }).eq('id', movie.id);
                }
            } catch (err) {
                console.error(`Failed to backfill ${movie.id}:`, err);
                totalErrors++;
            }
        }

        const { count } = await supabase
            .from('movies')
            .select('*', { count: 'exact', head: true })
            .is('poster_url', null)
            .not('imdb_id', 'is', null);

        const hasMore = count && count > 0;

        if (hasMore && totalProcessed > 0) {
            const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/workers/backfill-missing-data`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);

            try {
                await fetch(workerUrl, {
                    method: 'POST',
                    headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
                    signal: controller.signal
                });
            } catch (err: unknown) {
                // Ignore abort errors
            } finally {
                clearTimeout(timeoutId);
            }
        }

        return NextResponse.json({
            processed: totalProcessed,
            updated: totalUpdated,
            errors: totalErrors,
            remaining: count || 0,
            recursive: !!hasMore
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Backfill Missing Data Worker Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
