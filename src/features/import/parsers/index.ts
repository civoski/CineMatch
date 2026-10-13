import Papa from 'papaparse';
import { strFromU8, unzipSync } from 'fflate';
import type { CsvMovieImport, ImportSource } from '../types';

/**
 * Lectura de los archivos que exporta cada plataforma (IMDb, TMDB, Letterboxd).
 * Todo corre en el navegador: el resultado es la lista de películas que se manda
 * a `processImport`. El formato se detecta por la cabecera del CSV.
 */

export type ParsedImport = {
    source: ImportSource;
    movies: CsvMovieImport[];
    skipped: number; // Filas descartadas (episodios de TV, filas sin título ni ID)
};

// Error con un mensaje pensado para mostrarse tal cual al usuario.
export class ImportFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImportFormatError';
    }
}

const UNKNOWN_FORMAT_MESSAGE =
    'No reconocemos el formato de este archivo. Subí el CSV que exporta IMDb o TMDB, o el .zip (o el ratings.csv) que descargás de Letterboxd en Ajustes → Datos.';

const NO_ROWS_MESSAGE: Record<ImportSource, string> = {
    imdb: 'No encontramos ninguna película en el archivo. Revisá que sea el export de IMDb y que no esté vacío.',
    tmdb: 'No encontramos ninguna película en el archivo de TMDB. Revisá que no esté vacío (los episodios sueltos de series no se importan).',
    letterboxd: 'No encontramos ninguna película en el archivo de Letterboxd. Revisá que no esté vacío.',
};

type Row = Record<string, string | undefined>;

// ============ Conversión de valores ============

function text(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function toNumber(value: string | undefined): number | undefined {
    const raw = text(value);
    if (!raw) return undefined;
    const n = Number(raw.replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
}

function toInt(value: string | undefined): number | undefined {
    const n = toNumber(value);
    return n === undefined ? undefined : Math.trunc(n);
}

// Acepta "1999" o "1999-10-15".
function toYear(value: string | undefined): number | undefined {
    const match = text(value)?.match(/^(\d{4})/);
    if (!match) return undefined;
    const year = parseInt(match[1], 10);
    return year >= 1880 && year <= 2100 ? year : undefined;
}

const clampRating = (n: number) => Math.min(10, Math.max(1, n));

/** Letterboxd califica de 0,5 a 5 estrellas: ×2 da exactamente la escala 1–10. */
export function letterboxdStarsToTen(stars: number | undefined): number | undefined {
    if (stars === undefined || stars <= 0) return undefined;
    return clampRating(Math.round(stars * 2));
}

/** TMDB califica de 0,5 a 10: redondeamos al entero porque la app usa 1–10 enteros. */
export function tmdbRatingToTen(rating: number | undefined): number | undefined {
    if (rating === undefined || rating <= 0) return undefined;
    return clampRating(Math.round(rating));
}

// ============ Detección de formato ============

function detectFormat(fields: string[]): ImportSource | null {
    const has = (name: string) => fields.includes(name);

    if (has('const')) return 'imdb';
    if (has('tmdb id') || has('tmdb_id')) return 'tmdb';
    if (has('letterboxd uri')) return 'letterboxd';
    // Listas de Letterboxd: "Position, Name, Year, URL, Description"
    if (has('name') && has('year')) return 'letterboxd';
    return null;
}

// Las listas exportadas de Letterboxd empiezan con un bloque de metadatos
// ("Letterboxd list export v7", datos de la lista y una línea en blanco)
// antes de la tabla de películas. Nos quedamos solo con la tabla.
function stripLetterboxdListPreamble(csv: string): string {
    if (!/^letterboxd list export/i.test(csv)) return csv;
    const lines = csv.split(/\r?\n/);
    const tableStart = lines.findIndex((line) => /^position,/i.test(line.trim()));
    return tableStart === -1 ? csv : lines.slice(tableStart).join('\n');
}

// ============ Mapeo por plataforma ============

function mapImdbRow(row: Row): CsvMovieImport | null {
    const imdb_id = text(row['const']);
    if (!imdb_id) return null;

    return {
        source: 'imdb',
        imdb_id,
        title: text(row['title']) ?? '',
        year: toInt(row['year']),
        position: toInt(row['position']),
        user_rating: toInt(row['your rating']),
        date_rated: text(row['date rated']),
        genres: text(row['genres']),
        url: text(row['url']),
        imdb_rating: toNumber(row['imdb rating']),
        runtime_mins: toInt(row['runtime (mins)']),
        release_date: text(row['release date']),
        directors: text(row['directors']),
        num_votes: toInt(row['num votes']),
    };
}

function mapTmdbRow(row: Row): CsvMovieImport | null {
    const type = (text(row['type']) ?? 'movie').toLowerCase();

    // Los exports de TMDB pueden traer episodios sueltos de series: no son películas.
    if (type.includes('episode') || type.includes('season') || text(row['episode number']) || text(row['season number'])) {
        return null;
    }

    const tmdb_id = toInt(row['tmdb id'] ?? row['tmdb_id']);
    const imdbRaw = text(row['imdb id'] ?? row['imdb_id']);
    const imdb_id = imdbRaw && /^tt\d+$/i.test(imdbRaw) ? imdbRaw : undefined;
    if (!tmdb_id && !imdb_id) return null;

    return {
        source: 'tmdb',
        tmdb_id,
        imdb_id,
        media_type: type === 'tv' || type.includes('series') || type.includes('show') ? 'tv' : 'movie',
        title: text(row['name'] ?? row['title']) ?? '',
        year: toYear(row['release date'] ?? row['year']),
        release_date: text(row['release date']),
        // "Rating" es el promedio de TMDB; la nota del usuario es "Your Rating".
        user_rating: tmdbRatingToTen(toNumber(row['your rating'])),
        date_rated: text(row['date rated']),
    };
}

function mapLetterboxdRow(row: Row): CsvMovieImport | null {
    const title = text(row['name'] ?? row['title']);
    if (!title) return null;

    return {
        source: 'letterboxd',
        title,
        year: toYear(row['year']),
        user_rating: letterboxdStarsToTen(toNumber(row['rating'])),
        date_rated: text(row['watched date'] ?? row['date']),
        url: text(row['letterboxd uri'] ?? row['url']),
    };
}

const MAPPERS: Record<ImportSource, (row: Row) => CsvMovieImport | null> = {
    imdb: mapImdbRow,
    tmdb: mapTmdbRow,
    letterboxd: mapLetterboxdRow,
};

function movieKey(movie: CsvMovieImport): string {
    if (movie.tmdb_id) return `tmdb:${movie.media_type}:${movie.tmdb_id}`;
    if (movie.imdb_id) return `imdb:${movie.imdb_id}`;
    return `title:${movie.title.toLowerCase()}|${movie.year ?? ''}`;
}

// El diario de Letterboxd repite un film por cada vez que se vio. Dejamos una sola
// entrada: la última, conservando la nota anterior si la última no tiene.
function dedupe(movies: CsvMovieImport[]): CsvMovieImport[] {
    const byKey = new Map<string, CsvMovieImport>();
    for (const movie of movies) {
        const key = movieKey(movie);
        const previous = byKey.get(key);
        byKey.set(key, previous ? { ...movie, user_rating: movie.user_rating ?? previous.user_rating } : movie);
    }
    return [...byKey.values()];
}

// ============ API pública ============

/** Detecta la plataforma por la cabecera y convierte el CSV en películas a importar. */
export function parseImportCsv(csv: string): ParsedImport {
    const content = stripLetterboxdListPreamble(csv.replace(/^﻿/, ''));

    const results = Papa.parse<Row>(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.replace(/^﻿/, '').trim().toLowerCase(),
    });

    const source = detectFormat(results.meta.fields ?? []);
    if (!source) throw new ImportFormatError(UNKNOWN_FORMAT_MESSAGE);

    const mapped = results.data.map(MAPPERS[source]);
    const movies = dedupe(mapped.filter((m): m is CsvMovieImport => m !== null));
    if (movies.length === 0) throw new ImportFormatError(NO_ROWS_MESSAGE[source]);

    return { source, movies, skipped: mapped.length - movies.length };
}

/**
 * Del .zip que exporta Letterboxd (Ajustes → Datos) sacamos `ratings.csv`.
 * Ignora las copias de las carpetas `deleted/` y `orphaned/`.
 */
export function extractLetterboxdRatings(zipBytes: Uint8Array): string {
    let files: Record<string, Uint8Array>;
    try {
        files = unzipSync(zipBytes, {
            filter: (file) => {
                const path = file.name.toLowerCase();
                return path.split('/').pop() === 'ratings.csv' && !/(^|\/)(deleted|orphaned)\//.test(path);
            },
        });
    } catch {
        throw new ImportFormatError('No pudimos abrir el .zip. Descargalo de nuevo desde Letterboxd (Ajustes → Datos) y volvé a subirlo.');
    }

    // Si hubiera más de uno, el de menor profundidad es el principal.
    const [ratingsPath] = Object.keys(files).sort((a, b) => a.split('/').length - b.split('/').length);
    if (!ratingsPath) {
        throw new ImportFormatError('El .zip no contiene el archivo ratings.csv. Subí el .zip que descargás de Letterboxd en Ajustes → Datos.');
    }

    return strFromU8(files[ratingsPath]);
}

/** Lee el archivo elegido por el usuario: un CSV de cualquier plataforma o el .zip de Letterboxd. */
export async function readImportFile(file: File): Promise<ParsedImport> {
    if (file.name.toLowerCase().endsWith('.zip')) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return parseImportCsv(extractLetterboxdRatings(bytes));
    }
    return parseImportCsv(await file.text());
}
