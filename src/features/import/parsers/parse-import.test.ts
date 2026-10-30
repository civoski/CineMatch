import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
    ImportFormatError,
    letterboxdStarsToTen,
    parseLetterboxdZip,
    parseImportCsv,
    readImportFile,
    tmdbRatingToTen,
} from './index';

const IMDB_CSV = [
    'Const,Your Rating,Date Rated,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors',
    'tt0111161,10,2023-01-05,The Shawshank Redemption,The Shawshank Redemption,https://www.imdb.com/title/tt0111161/,Movie,9.3,142,1994,Drama,2900000,1994-09-23,Frank Darabont',
    'tt0068646,,2023-01-06,The Godfather,The Godfather,https://www.imdb.com/title/tt0068646/,Movie,9.2,175,1972,"Crime, Drama",2000000,1972-03-24,Francis Ford Coppola',
].join('\n');

const TMDB_CSV = [
    'TMDb ID,IMDb ID,Type,Name,Release Date,Season Number,Episode Number,Rating,Your Rating,Date Rated',
    '550,tt0137523,movie,Fight Club,1999-10-15,,,8.4,9.0,2024-03-01T12:00:00Z',
    '1399,tt0944947,tv,Game of Thrones,2011-04-17,,,8.5,7.5,2024-03-02T12:00:00Z',
    '1399,,episode,Winter Is Coming,2011-04-17,1,1,8.0,8.0,2024-03-03T12:00:00Z',
    '12345,,movie,Sin IMDb,2020-01-01,,,6.0,,2024-03-04',
].join('\n');

const LETTERBOXD_RATINGS_CSV = [
    'Date,Name,Year,Letterboxd URI,Rating',
    '2024-01-10,Parasite,2019,https://boxd.it/hTha,5',
    '2024-01-11,"Crouching Tiger, Hidden Dragon",2000,https://boxd.it/1Zw6,4.5',
    '2024-01-12,Amélie,2001,https://boxd.it/2bfe,0.5',
].join('\n');

const LETTERBOXD_LIST_CSV = [
    'Letterboxd list export v7',
    'Date,Name,Tags,URL,Description',
    '2024-02-01,Favoritas,,https://letterboxd.com/user/list/favoritas/,',
    '',
    'Position,Name,Year,URL,Description',
    '1,Parasite,2019,https://letterboxd.com/film/parasite-2019/,',
    '2,Amélie,2001,https://letterboxd.com/film/amelie/,',
].join('\n');

describe('conversión de notas', () => {
    it('Letterboxd: estrellas 0,5–5 pasan a 1–10', () => {
        expect(letterboxdStarsToTen(0.5)).toBe(1);
        expect(letterboxdStarsToTen(3.5)).toBe(7);
        expect(letterboxdStarsToTen(5)).toBe(10);
        expect(letterboxdStarsToTen(undefined)).toBeUndefined();
        expect(letterboxdStarsToTen(0)).toBeUndefined();
    });

    it('TMDB: redondea medios puntos y acota a 1–10', () => {
        expect(tmdbRatingToTen(9)).toBe(9);
        expect(tmdbRatingToTen(7.5)).toBe(8);
        expect(tmdbRatingToTen(0.5)).toBe(1);
        expect(tmdbRatingToTen(12)).toBe(10);
        expect(tmdbRatingToTen(undefined)).toBeUndefined();
    });
});

describe('parseImportCsv', () => {
    it('IMDb: mantiene el mapeo actual', () => {
        const { source, movies } = parseImportCsv(IMDB_CSV);
        expect(source).toBe('imdb');
        expect(movies).toHaveLength(2);
        expect(movies[0]).toMatchObject({
            source: 'imdb',
            imdb_id: 'tt0111161',
            title: 'The Shawshank Redemption',
            year: 1994,
            user_rating: 10,
            imdb_rating: 9.3,
            runtime_mins: 142,
            directors: 'Frank Darabont',
        });
        expect(movies[1].user_rating).toBeUndefined();
        expect(movies[1].genres).toBe('Crime, Drama');
    });

    it('IMDb: tolera el BOM al inicio del archivo', () => {
        const { source, movies } = parseImportCsv('﻿' + IMDB_CSV);
        expect(source).toBe('imdb');
        expect(movies).toHaveLength(2);
    });

    it('TMDB: usa TMDb ID, convierte la nota y descarta episodios', () => {
        const { source, movies, skipped } = parseImportCsv(TMDB_CSV);
        expect(source).toBe('tmdb');
        expect(skipped).toBe(1);
        expect(movies).toHaveLength(3);
        expect(movies[0]).toMatchObject({
            source: 'tmdb',
            tmdb_id: 550,
            imdb_id: 'tt0137523',
            media_type: 'movie',
            title: 'Fight Club',
            year: 1999,
            user_rating: 9,
        });
        expect(movies[1]).toMatchObject({ tmdb_id: 1399, media_type: 'tv', user_rating: 8 });
        expect(movies[2].imdb_id).toBeUndefined();
        expect(movies[2].user_rating).toBeUndefined();
    });

    it('Letterboxd ratings.csv: título y año, estrellas a escala 1–10', () => {
        const { source, movies } = parseImportCsv(LETTERBOXD_RATINGS_CSV);
        expect(source).toBe('letterboxd');
        expect(movies.map((m) => [m.title, m.year, m.user_rating])).toEqual([
            ['Parasite', 2019, 10],
            ['Crouching Tiger, Hidden Dragon', 2000, 9],
            ['Amélie', 2001, 1],
        ]);
        expect(movies[0].imdb_id).toBeUndefined();
        expect(movies[0].tmdb_id).toBeUndefined();
    });

    it('Letterboxd watched.csv: películas sin nota', () => {
        const csv = 'Date,Name,Year,Letterboxd URI\n2024-01-10,Parasite,2019,https://boxd.it/hTha';
        const { source, movies } = parseImportCsv(csv);
        expect(source).toBe('letterboxd');
        expect(movies).toEqual([
            expect.objectContaining({ title: 'Parasite', year: 2019, user_rating: undefined }),
        ]);
    });

    it('Letterboxd diary.csv: un mismo film visto dos veces se importa una vez con la última nota', () => {
        const csv = [
            'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date',
            '2023-01-01,Parasite,2019,https://boxd.it/a,4,,,2023-01-01',
            '2024-01-01,Parasite,2019,https://boxd.it/b,5,Yes,,2024-01-01',
        ].join('\n');
        const { movies } = parseImportCsv(csv);
        expect(movies).toHaveLength(1);
        expect(movies[0].user_rating).toBe(10);
    });

    it('Letterboxd: lista exportada (con bloque de metadatos al principio)', () => {
        const { source, movies } = parseImportCsv(LETTERBOXD_LIST_CSV);
        expect(source).toBe('letterboxd');
        expect(movies.map((m) => m.title)).toEqual(['Parasite', 'Amélie']);
    });

    it('formato desconocido: error explicativo', () => {
        expect(() => parseImportCsv('foo,bar\n1,2')).toThrow(ImportFormatError);
    });

    it('formato reconocido pero sin filas útiles: error explicativo', () => {
        expect(() => parseImportCsv('Date,Name,Year,Letterboxd URI,Rating\n')).toThrow(ImportFormatError);
    });
});

describe('.zip de Letterboxd', () => {
    const WATCHED_CSV = [
        'Date,Name,Year,Letterboxd URI',
        '2024-01-01,Parasite,2019,https://boxd.it/hTha',
        '2024-01-02,Otra,2019,https://boxd.it/x',
        '2024-01-03,Amélie,2001,https://boxd.it/2bfe',
    ].join('\n');

    it('combina watched.csv y ratings.csv: entran las vistas sin nota y las calificadas conservan su nota', () => {
        const zip = zipSync({
            'ratings.csv': strToU8(LETTERBOXD_RATINGS_CSV),
            'watched.csv': strToU8(WATCHED_CSV),
            'deleted/ratings.csv': strToU8('Date,Name,Year,Letterboxd URI,Rating\n2024-01-10,Borrada,2019,https://boxd.it/y,1'),
        });
        const { source, movies } = parseLetterboxdZip(zip);
        expect(source).toBe('letterboxd');
        const byTitle = Object.fromEntries(movies.map((m) => [m.title, m.user_rating]));
        expect(byTitle).toEqual({
            Parasite: 10,
            'Crouching Tiger, Hidden Dragon': 9,
            Amélie: 1,
            Otra: undefined,
        });
    });

    it('acepta los archivos dentro de una carpeta', () => {
        const nested = zipSync({ 'letterboxd-user-2026/ratings.csv': strToU8(LETTERBOXD_RATINGS_CSV) });
        expect(parseLetterboxdZip(nested).movies).toHaveLength(3);
    });

    it('solo watched.csv: importa las vistas sin nota', () => {
        const soloVistas = zipSync({ 'watched.csv': strToU8(WATCHED_CSV) });
        const { movies } = parseLetterboxdZip(soloVistas);
        expect(movies).toHaveLength(3);
        expect(movies.every((m) => m.user_rating === undefined)).toBe(true);
    });

    it('sin ratings.csv ni watched.csv: error explicativo', () => {
        const sinDatos = zipSync({ 'watchlist.csv': strToU8('Date,Name,Year,Letterboxd URI\n2024-01-10,Otra,2019,https://boxd.it/x') });
        expect(() => parseLetterboxdZip(sinDatos)).toThrow(ImportFormatError);
    });

    it('un archivo que no es zip: error explicativo', () => {
        expect(() => parseLetterboxdZip(strToU8('esto no es un zip'))).toThrow(ImportFormatError);
    });
});

describe('readImportFile', () => {
    it('lee un .csv', async () => {
        const file = new File([TMDB_CSV], 'ratings_tmdb.csv', { type: 'text/csv' });
        const { source, movies } = await readImportFile(file);
        expect(source).toBe('tmdb');
        expect(movies).toHaveLength(3);
    });

    it('lee el .zip de Letterboxd', async () => {
        const zip = zipSync({ 'ratings.csv': strToU8(LETTERBOXD_RATINGS_CSV) });
        const file = new File([zip], 'letterboxd-export.zip', { type: 'application/zip' });
        const { source, movies } = await readImportFile(file);
        expect(source).toBe('letterboxd');
        expect(movies).toHaveLength(3);
    });
});
