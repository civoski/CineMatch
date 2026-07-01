import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resuelve una colisión del índice UNIQUE `movies_tmdb_id_key`.
 *
 * El mismo film puede existir como dos filas: una creada por la importación
 * (indexada por `imdb_id`, con `tmdb_id` nulo) y otra creada al navegar
 * recomendaciones/trending (indexada por `tmdb_id`, con `imdb_id` nulo).
 *
 * Cuando el enriquecimiento intenta escribir `tmdb_id` en la fila de importación,
 * choca con la fila huérfana que ya lo posee (error 23505) y el `UPDATE` falla en
 * silencio: la película queda sin póster/sinopsis aunque el cast ya se sincronizó.
 *
 * Esta función detecta la fila gemela y la fusiona en `keepMovieId` (repunta todas
 * las referencias FK y elimina la fila huérfana), liberando el `tmdb_id` para que el
 * `UPDATE` posterior tenga éxito. Es idempotente y segura de llamar siempre.
 *
 * @returns true si se fusionó una fila gemela.
 */
export async function resolveTmdbConflict(
    supabase: SupabaseClient,
    keepMovieId: string,
    tmdbId: number | null | undefined
): Promise<boolean> {
    if (!tmdbId) return false;

    const { data: twin, error } = await supabase
        .from('movies')
        .select('id')
        .eq('tmdb_id', tmdbId)
        .maybeSingle();

    if (error) {
        console.error(`resolveTmdbConflict: error buscando gemela para tmdb_id ${tmdbId}:`, error);
        return false;
    }

    if (!twin || twin.id === keepMovieId) return false;

    // Fusiona la fila huérfana (twin) dentro de la fila que queremos conservar.
    const { error: mergeError } = await supabase.rpc('merge_movies', {
        keep_id: keepMovieId,
        drop_id: twin.id,
    });

    if (mergeError) {
        console.error(`resolveTmdbConflict: merge_movies falló (keep ${keepMovieId}, drop ${twin.id}):`, mergeError);
        return false;
    }

    return true;
}

/**
 * Punto único de creación de películas: deduplica por AMBAS llaves de identidad
 * (`imdb_id` y `tmdb_id`) antes de insertar, evitando que se generen filas gemelas.
 *
 * - Si el film ya existe indexado por cualquiera de las dos llaves, reutiliza esa fila.
 * - Si existe como DOS filas distintas (una por llave), las fusiona en la fila con
 *   `imdb_id` (que suele ser la que está en watchlists) y devuelve esa.
 * - Si no existe, inserta `insertPayload`.
 *
 * Esto cierra en el origen el problema que hacía perder pósters: dos filas para el
 * mismo film que luego colisionaban en el índice UNIQUE `tmdb_id`.
 */
export async function findOrCreateMovieId(
    supabase: SupabaseClient,
    params: {
        imdbId: string | null | undefined;
        tmdbId: number | null | undefined;
        insertPayload: Record<string, unknown>;
    }
): Promise<{ id: string | null; created: boolean }> {
    const { imdbId, tmdbId, insertPayload } = params;

    let byTmdb: string | null = null;
    let byImdb: string | null = null;

    if (tmdbId) {
        const { data } = await supabase.from('movies').select('id').eq('tmdb_id', tmdbId).maybeSingle();
        byTmdb = data?.id ?? null;
    }
    // Sólo buscamos por imdb_id si tenemos uno real (evita el footgun `.eq('imdb_id', null)`).
    if (imdbId) {
        const { data } = await supabase.from('movies').select('id').eq('imdb_id', imdbId).maybeSingle();
        byImdb = data?.id ?? null;
    }

    // El mismo film existe como dos filas distintas → fusionar (conservar la de imdb_id).
    if (byTmdb && byImdb && byTmdb !== byImdb) {
        const { error } = await supabase.rpc('merge_movies', { keep_id: byImdb, drop_id: byTmdb });
        if (error) console.error('findOrCreateMovieId: merge_movies falló:', error);
        return { id: byImdb, created: false };
    }

    const existingId = byImdb ?? byTmdb;
    if (existingId) return { id: existingId, created: false };

    const { data: created, error } = await supabase
        .from('movies')
        .insert(insertPayload)
        .select('id')
        .single();

    if (error || !created) {
        console.error('findOrCreateMovieId: insert falló:', error);
        return { id: null, created: false };
    }

    return { id: created.id, created: true };
}
