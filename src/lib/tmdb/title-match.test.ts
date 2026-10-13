import { describe, expect, it } from 'vitest';
import { normalizeTitle, pickBestMatch, type SearchCandidate } from './title-match';

const c = (id: number, title: string, release_date: string, vote_count = 100, original_title = title): SearchCandidate => ({
    id,
    title,
    original_title,
    release_date,
    vote_count,
});

describe('normalizeTitle', () => {
    it('ignora acentos, mayúsculas y puntuación', () => {
        expect(normalizeTitle('Amélie')).toBe('amelie');
        expect(normalizeTitle('Crouching Tiger, Hidden Dragon')).toBe('crouching tiger hidden dragon');
        expect(normalizeTitle('Fast & Furious')).toBe('fast and furious');
        expect(normalizeTitle('  WALL·E ')).toBe('wall e');
    });
});

describe('pickBestMatch', () => {
    it('elige el título exacto del año correcto entre remakes', () => {
        const candidates = [c(1, 'Dune', '2021-09-15', 9000), c(2, 'Dune', '1984-12-14', 3000), c(3, 'Dune: Part Two', '2024-02-27', 6000)];
        expect(pickBestMatch(candidates, 'Dune', 1984)?.id).toBe(2);
        expect(pickBestMatch(candidates, 'Dune', 2021)?.id).toBe(1);
    });

    it('tolera un año de diferencia (estreno en festival vs. comercial)', () => {
        const candidates = [c(10, 'Parasite', '2019-05-30')];
        expect(pickBestMatch(candidates, 'Parasite', 2020)?.id).toBe(10);
    });

    it('descarta coincidencias con más de un año de diferencia', () => {
        const candidates = [c(10, 'Parasite', '1982-03-12')];
        expect(pickBestMatch(candidates, 'Parasite', 2019)).toBeNull();
    });

    it('acepta el título original (películas extranjeras)', () => {
        const candidates = [c(20, 'Amelie', '2001-04-25', 100, "Le Fabuleux Destin d'Amélie Poulain")];
        expect(pickBestMatch(candidates, "Le Fabuleux Destin d'Amélie Poulain", 2001)?.id).toBe(20);
    });

    it('sin año: entre títulos exactos gana el más votado', () => {
        const candidates = [c(1, 'Crash', '2004-09-10', 4000), c(2, 'Crash', '1996-05-17', 1500)];
        expect(pickBestMatch(candidates, 'Crash', undefined)?.id).toBe(1);
    });

    it('acepta un título parecido solo si el año coincide exacto', () => {
        const candidates = [c(30, 'Birdman or (The Unexpected Virtue of Ignorance)', '2014-10-17')];
        expect(pickBestMatch(candidates, 'Birdman', 2014)?.id).toBe(30);
        expect(pickBestMatch(candidates, 'Birdman', 2015)).toBeNull();
    });

    it('rechaza títulos que no se parecen', () => {
        const candidates = [c(40, 'Something Else Entirely', '2014-10-17')];
        expect(pickBestMatch(candidates, 'Birdman', 2014)).toBeNull();
    });

    it('prefiere la película conocida con un año de diferencia antes que un homónimo casi sin votos', () => {
        // Crash (2004) de Haggis: Letterboxd usa el año del festival, TMDB el estreno de 2005
        const candidates = [c(1353802, 'Crash', '2004-10-16', 2), c(1640, 'Crash', '2005-05-06', 4000)];
        expect(pickBestMatch(candidates, 'Crash', 2004)?.id).toBe(1640);
    });

    it('con el año confirmado por TMDB acepta un título exacto aunque el estreno principal sea otro año', () => {
        const candidates = [c(5, 'Some Film', '2019-03-01')];
        expect(pickBestMatch(candidates, 'Some Film', 2017, { yearConfirmed: true })?.id).toBe(5);
        expect(pickBestMatch(candidates, 'Some Film', 2017)).toBeNull();
    });

    it('con el año confirmado, un reestreno de un clásico no gana al film de ese año', () => {
        const candidates = [c(1091, 'The Thing', '1982-06-25', 6000), c(60935, 'The Thing', '2011-10-12', 2500)];
        expect(pickBestMatch(candidates, 'The Thing', 2011, { yearConfirmed: true })?.id).toBe(60935);
    });

    it('sin candidatos devuelve null', () => {
        expect(pickBestMatch([], 'Parasite', 2019)).toBeNull();
    });
});
