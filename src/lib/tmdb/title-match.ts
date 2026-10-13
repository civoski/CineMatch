/**
 * Elección del resultado correcto de `/search/movie` cuando solo tenemos título y
 * año (exports de Letterboxd, que no traen IDs). Funciones puras, sin red.
 */

export type SearchCandidate = {
    id: number;
    title: string;
    original_title: string;
    release_date?: string;
    vote_count?: number;
};

/** Minúsculas, sin acentos ni puntuación, "&" como "and". */
export function normalizeTitle(title: string): string {
    return title
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function candidateYear(candidate: SearchCandidate): number | null {
    const year = parseInt(candidate.release_date?.slice(0, 4) ?? '', 10);
    return Number.isFinite(year) ? year : null;
}

// Uno de los títulos contiene al otro palabra por palabra
// ("Birdman" ⊂ "Birdman or (The Unexpected Virtue of Ignorance)").
function containsWords(a: string, b: string): boolean {
    if (!a || !b) return false;
    return ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `);
}

// Fichas con menos votos que esto suelen ser cargas recientes u homónimos oscuros.
const FEW_VOTES = 10;

/**
 * Devuelve el candidato que corresponde a `title` + `year`, o null si ninguno es
 * confiable. Prioriza: título exacto (traducido u original) → año más cercano →
 * más votos. Un título solo parecido se acepta únicamente si el año coincide exacto.
 *
 * El año de Letterboxd suele ser el del primer estreno (festival) y el `release_date`
 * de TMDB el estreno principal, así que se tolera ±1 año y una ficha casi sin votos
 * cuenta como un año más lejos (para que no le gane al film conocido).
 *
 * `yearConfirmed`: los candidatos vienen de una búsqueda con `year`, es decir TMDB
 * confirma que todos tienen algún estreno ese año; se aceptan títulos exactos aunque
 * el estreno principal esté más lejos.
 */
export function pickBestMatch(
    candidates: SearchCandidate[],
    title: string,
    year: number | undefined,
    { yearConfirmed = false }: { yearConfirmed?: boolean } = {}
): SearchCandidate | null {
    const wanted = normalizeTitle(title);

    const scored = candidates
        .map((candidate) => {
            const titles = [normalizeTitle(candidate.title), normalizeTitle(candidate.original_title)];
            const exact = titles.includes(wanted);
            const similar = exact || titles.some((t) => containsWords(t, wanted));
            const cYear = candidateYear(candidate);
            const yearDiff = year !== undefined && cYear !== null ? Math.abs(cYear - year) : null;
            const fewVotes = (candidate.vote_count ?? 0) < FEW_VOTES;
            const distance = (yearDiff ?? 0) + (fewVotes ? 1 : 0);
            return { candidate, exact, similar, yearDiff, distance };
        })
        .filter(({ exact, similar, yearDiff }) => {
            if (year === undefined) return exact;
            if (yearDiff === null) return yearConfirmed && exact;
            if (yearDiff > 1 && !(yearConfirmed && exact)) return false;
            return exact || (similar && yearDiff === 0);
        })
        .sort(
            (a, b) =>
                Number(b.exact) - Number(a.exact) ||
                a.distance - b.distance ||
                (b.candidate.vote_count ?? 0) - (a.candidate.vote_count ?? 0)
        );

    return scored[0]?.candidate ?? null;
}
