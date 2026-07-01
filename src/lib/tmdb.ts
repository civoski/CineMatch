// Configuración y credenciales
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Control de tasa: TMDB permite ~40 req/10s
const RATE_LIMIT_DELAY_MS = 250;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export type TmdbImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';

export type TmdbMovieDetails = {
    id: number;
    imdb_id: string | null;
    title: string;
    original_title: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    runtime: number | null;
    budget: number;
    revenue: number;
    vote_average: number;
    vote_count: number;
    overview: string | null;
    tagline: string | null;
    genres: Array<{ id: number; name: string }>;
    production_companies: Array<{ id: number; name: string; logo_path: string | null; origin_country: string }>;
    spoken_languages: Array<{ iso_639_1: string; name: string }>;
    credits: {
        cast: Array<{
            id: number;
            name: string;
            original_name: string;
            character: string;
            profile_path: string | null;
            order: number;
        }>;
        crew: Array<{
            id: number;
            name: string;
            original_name: string;
            job: string;
            department: string;
            profile_path: string | null;
        }>;
    };
    videos: {
        results: Array<{
            id: string;
            key: string;
            name: string;
            site: string;
            type: string;
            official: boolean;
        }>;
    };
    release_dates: {
        results: Array<{
            iso_3166_1: string;
            release_dates: Array<{
                certification: string;
                type: number;
                note?: string;
            }>;
        }>;
    };
    images: {
        posters: Array<{ file_path: string; iso_639_1: string | null; aspect_ratio: number; width: number; height: number }>;
        backdrops: Array<{ file_path: string; iso_639_1: string | null; aspect_ratio: number; width: number; height: number; vote_average: number; vote_count: number }>;
    };
    belongs_to_collection?: {
        id: number;
        name: string;
        poster_path: string | null;
        backdrop_path: string | null;
    } | null;
    recommendations?: {
        page: number;
        results: Array<{
            id: number;
            title: string;
            poster_path: string | null;
            backdrop_path: string | null;
            release_date: string;
            vote_average: number;
        }>;
        total_pages: number;
        total_results: number;
    };
};

export type TmdbTrendingResponse = {
    page: number;
    results: Array<{
        id: number;
        title: string;
        poster_path: string | null;
        backdrop_path: string | null;
        vote_average: number;
        release_date: string;
    }>;
    total_pages: number;
    total_results: number;
};

// Control de tasa simple para evitar 429
let lastRequestTime = 0;

async function rateLimitedDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest));
    }

    lastRequestTime = Date.now();
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class TmdbClient {
    private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        let queryParams = new URLSearchParams({
            language: 'es-MX', // Predeterminado a Español Latino
            ...params,
        });

        if (TMDB_READ_TOKEN) {
            headers['Authorization'] = `Bearer ${TMDB_READ_TOKEN}`;
        } else if (TMDB_API_KEY) {
            // Fallback a query param si no hay token (aunque desaconsejado)
            queryParams.append('api_key', TMDB_API_KEY);
        } else {
            console.error('TMDB credentials missing (TMDB_READ_TOKEN or TMDB_API_KEY)');
            return null;
        }

        const url = `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`;

        // Retry loop with exponential backoff
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                // Apply rate limiting delay
                await rateLimitedDelay();

                const res = await fetch(url, {
                    headers,
                    next: { revalidate: 3600 }, // Cache 1 hora
                });

                // Handle rate limit (429)
                if (res.status === 429) {
                    const retryAfter = parseInt(res.headers.get('Retry-After') || '1', 10);
                    const backoffMs = Math.max(retryAfter * 1000, INITIAL_BACKOFF_MS * Math.pow(2, attempt));
                    await sleep(backoffMs);
                    continue;
                }

                if (!res.ok) {
                    console.error(`TMDb Error [${res.status}]: ${res.statusText} for ${url}`);
                    return null;
                }

                return res.json();
            } catch (error) {
                if (attempt === MAX_RETRIES - 1) {
                    console.error('TMDb Fetch Exception (all retries exhausted):', error);
                    return null;
                }
                const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
                await sleep(backoffMs);
            }
        }

        return null;
    }

    /**
     * Construye la URL completa para una imagen de TMDb.
     */
    static getImageUrl(path: string | null, size: TmdbImageSize = 'w500'): string | null {
        if (!path) return null;
        return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
    }

    /**
     * Selecciona el mejor backdrop de las imágenes disponibles.
     * Prioridad: 1920x1080, sin idioma (null), ordenado por votos.
     * Fallback: backdrop_path por defecto si no hay match.
     */
    static getBestBackdropUrl(
        images: TmdbMovieDetails['images'] | undefined,
        fallbackPath: string | null
    ): string | null {
        if (images?.backdrops && images.backdrops.length > 0) {
            // Solo resolución 1920x1080
            const hdBackdrops = images.backdrops.filter(b => b.width === 1920 && b.height === 1080);

            // Priorizar imágenes sin idioma (null según docs TMDB)
            const textlessHd = hdBackdrops.filter(b => b.iso_639_1 === null);

            // Ordenar por popularidad (votos), estilo Letterboxd
            const sorted = (textlessHd.length > 0 ? textlessHd : hdBackdrops)
                .sort((a, b) => b.vote_count - a.vote_count);

            if (sorted[0]?.file_path) {
                return `${TMDB_IMAGE_BASE_URL}/original${sorted[0].file_path}`;
            }
        }

        // Si no hay match, usar backdrop_path por defecto
        return fallbackPath ? `${TMDB_IMAGE_BASE_URL}/original${fallbackPath}` : null;
    }

    /**
     * Buscar película por ID externo (IMDb ID).
     * Endpoint: /find/{external_id}
     */
    async findByImdbId(imdbId: string): Promise<TmdbMovieDetails | null> {
        // 1. Buscar el ID de TMDb usando el ID de IMDb
        const findRes = await this.fetch<{
            movie_results: Array<{ id: number }>;
            tv_results: Array<{ id: number }>;
        }>(`/find/${imdbId}`, {
            external_source: 'imdb_id'
        });

        if (!findRes) return null;

        // 2. Caso normal: película
        if (findRes.movie_results?.[0]) {
            return this.getMovieDetails(findRes.movie_results[0].id);
        }

        // 3. Fallback: los watchlists de IMDb incluyen series de TV. TMDB las devuelve
        // en `tv_results` (no en `movie_results`), por lo que antes se ignoraban y
        // quedaban sin póster para siempre. Las normalizamos al shape de película.
        if (findRes.tv_results?.[0]) {
            return this.getTvAsMovieDetails(findRes.tv_results[0].id, imdbId);
        }

        return null;
    }

    /**
     * Obtiene una serie de TV y la normaliza al shape de `TmdbMovieDetails`, para que
     * las series presentes en watchlists de IMDb obtengan póster, sinopsis y cast
     * reutilizando toda la lógica de enriquecimiento (originalmente pensada para películas).
     */
    async getTvAsMovieDetails(tvId: number, imdbId: string | null = null): Promise<TmdbMovieDetails | null> {
        const tv = await this.fetch<any>(`/tv/${tvId}`, {
            append_to_response: 'credits,videos,content_ratings,images,recommendations,external_ids',
            include_image_language: 'null'
        });

        if (!tv) return null;

        return {
            id: tv.id,
            imdb_id: imdbId ?? tv.external_ids?.imdb_id ?? null,
            title: tv.name,
            original_title: tv.original_name,
            poster_path: tv.poster_path ?? null,
            backdrop_path: tv.backdrop_path ?? null,
            release_date: tv.first_air_date || '',
            runtime: Array.isArray(tv.episode_run_time) && tv.episode_run_time.length > 0
                ? tv.episode_run_time[0]
                : null,
            budget: 0,
            revenue: 0,
            vote_average: tv.vote_average ?? 0,
            vote_count: tv.vote_count ?? 0,
            overview: tv.overview ?? null,
            tagline: tv.tagline ?? null,
            genres: tv.genres ?? [],
            production_companies: tv.production_companies ?? [],
            spoken_languages: tv.spoken_languages ?? [],
            credits: {
                cast: tv.credits?.cast ?? [],
                crew: tv.credits?.crew ?? []
            },
            videos: { results: tv.videos?.results ?? [] },
            // TV usa `content_ratings` en vez de `release_dates`; lo dejamos vacío para
            // que la búsqueda de certificación devuelva undefined sin romper.
            release_dates: { results: [] },
            images: {
                posters: tv.images?.posters ?? [],
                backdrops: tv.images?.backdrops ?? []
            },
            belongs_to_collection: null,
            recommendations: tv.recommendations ?? undefined
        } as TmdbMovieDetails;
    }

    /**
     * Obtener detalles completos de una película por su TMDb ID.
     * Incluye créditos, videos, fechas de estreno, imágenes (sin idioma) y recomendaciones.
     */
    async getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails | null> {
        return this.fetch<TmdbMovieDetails>(`/movie/${tmdbId}`, {
            append_to_response: 'credits,videos,release_dates,images,keywords,recommendations',
            include_image_language: 'null' // Incluir imágenes sin idioma (textless)
        });
    }

    /**
     * Busca una persona (director, actor, etc.) por nombre.
     */
    async searchPerson(query: string): Promise<any[]> {
        const res = await this.fetch<{ results: any[] }>('/search/person', {
            query: query,
            page: '1'
        });
        return res?.results || [];
    }

    /**
     * Obtiene los créditos de películas de una persona.
     */
    async getPersonMovieCredits(personId: number): Promise<any | null> {
        return this.fetch<any>(`/person/${personId}/movie_credits`);
    }

    /**
     * Obtener detalles de una persona (biografía, fecha namicmiento, etc).
     */
    async getPersonDetails(personId: number, language?: string): Promise<any | null> {
        const params: Record<string, string> = {};
        if (language) params.language = language;
        return this.fetch<any>(`/person/${personId}`, params);
    }
    /**
     * Obtener recomendaciones (fallback si falla append_to_response)
     */
    async getRecommendations(tmdbId: number): Promise<any[]> {
        const res = await this.fetch<{ results: any[] }>(`/movie/${tmdbId}/recommendations`);
        return res?.results || [];
    }

    /**
     * Obtener películas trending del día
     * Endpoint: /trending/movie/day
     */
    async getTrendingMovies(page: number = 1): Promise<TmdbTrendingResponse | null> {
        return this.fetch<TmdbTrendingResponse>('/trending/movie/day', {
            page: page.toString()
        });
    }
}

export const tmdb = new TmdbClient();
