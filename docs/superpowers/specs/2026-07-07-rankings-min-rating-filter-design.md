# Filtro de puntuación mínima en Rankings — Diseño

**Fecha:** 2026-07-07
**Estado:** Aprobado
**Alcance cotizado:** media jornada (rediseño de interfaz; la lógica ya existe)

## Contexto

La página de rankings/análisis tiene hoy un único control, "Cantidad a mostrar"
(Top N / `limit`, rango 1–50), en
[`AnalysisClientWrapper.tsx`](../../../src/app/app/analysis/AnalysisClientWrapper.tsx).

El filtro de puntuación mínima existió en su momento (commit `6b1c5c5`,
"slide para controlar ranking desde calificación") y se perdió en un refactor
posterior. El objetivo es recuperarlo.

El backend ya soporta el filtro por completo:

- `getRanking(userId, type, { minRating, limit })` acepta `minRating`
  ([`actions.ts:41`](../../../src/features/rankings/actions.ts#L41)).
- Los tres RPCs de Postgres (`get_person_rankings`, `get_genre_rankings`,
  `get_year_rankings`) reciben `p_min_rating` y filtran en la base de datos.
- Hoy ese valor está fijo en `1` en
  [`RankingsExpandedView.tsx:42`](../../../src/features/rankings/components/RankingsExpandedView.tsx#L42),
  es decir el filtro está conectado pero clavado y sin control en pantalla.

El usuario califica las películas en escala **1 a 10**
([`FastMovieCard.tsx:92`](../../../src/features/reviews/components/FastMovieCard.tsx#L92)),
por lo que el nuevo control opera en ese rango.

**Conclusión:** el trabajo es puramente frontend, reutilizando el patrón del
control de "Cantidad a mostrar" que ya existe al lado. No se toca base de datos,
RPCs ni lógica de filtrado.

## Decisiones de diseño

| Decisión | Elección |
|---|---|
| Valor por defecto del filtro | **6** — el ranking arranca depurado (cineastas cuyas películas se calificaron 6 o más). |
| Tipo de control | **Slider idéntico** al de "Cantidad a mostrar" (slider + input numérico + botones −/+). |
| Rango del control | **1 a 10** (coincide con la escala de calificación). |
| Alcance | **Solo** la página de rankings/análisis (`AnalysisClientWrapper`), donde vive el control de cantidad. No se agrega al bloque compacto del dashboard. |

## Cambios

### 1. `src/app/app/analysis/AnalysisClientWrapper.tsx`

Agregar un segundo control gemelo al de "Cantidad a mostrar":

- Nuevo par de estados con el mismo patrón que `limit`:
  - `minRatingDraft` / `minRatingCommitted` (valor inicial **6**), más su `inputStr`.
  - Debounce de **600 ms** de `draft` → `committed` (mismo `useEffect` de timer).
  - `clamp` al rango `MIN_RATING = 1` … `MAX_RATING = 10`.
- Un segundo bloque de UI, copia del actual: etiqueta **"Puntuación mínima"**,
  valor mostrado como **"★ N"**, slider (`min=1 max=10 step=1`), input numérico
  y botones −/+ con sus `disabled` en los extremos y `aria-label`s.
- Los dos controles conviven en el header:
  - **Desktop:** lado a lado.
  - **Mobile:** apilados (usar el `flex-wrap` ya presente y anchos mín/máx
    equivalentes a los del control existente).
- Pasar `minRating={minRatingCommitted}` a `RankingsExpandedView` y sumar
  `minRatingCommitted` al `key` (`` key={`${activeTab}-${committed}-${minRatingCommitted}`} ``)
  para forzar el refetch al cambiar.

### 2. `src/features/rankings/components/RankingsExpandedView.tsx`

- Agregar prop `minRating?: number` a `RankingsExpandedViewProps`. El default del
  componente es **1** (idéntico al comportamiento previo fijo), para no alterar a
  otros consumidores como `collection/components/RankingsSection.tsx` que no pasan
  el prop. El valor por defecto de UI (**6**) lo impone la página de análisis
  pasándolo explícitamente.
- Usar `minRating` en la llamada a `getRanking` en lugar del `1` fijo
  ([`línea 42`](../../../src/features/rankings/components/RankingsExpandedView.tsx#L42)).
- Agregar `minRating` a las dependencias del `useEffect` de carga.

### 3. Estado vacío

Cuando el filtro deja el ranking sin resultados, se usa el empty state ya
existente; se ajusta el texto para sugerir bajar la puntuación mínima
(ej. "Ninguna película supera esa puntuación mínima. Probá bajarla.").

## Constantes

- `MIN = 1`, `MAX = 50` ya existen para "Cantidad a mostrar" (no cambian).
- Nuevas: `MIN_RATING = 1`, `MAX_RATING = 10`, default `6`.

## Pruebas (QA manual)

- Los 7 tipos de ranking: directores, actores, guionistas, fotografía, música,
  géneros, años.
- Mover el slider de puntuación mínima refleja el cambio tras el debounce y
  respeta el filtro (sube el piso ⇒ quedan menos resultados / mejor puntuados).
- Combinación con el control de cantidad (ambos filtros a la vez).
- Caso límite: puntuación mínima = 10 que vacía el ranking ⇒ empty state con
  el texto ajustado.
- Modo claro y oscuro.
- Layout mobile (controles apilados, sin desbordes).

## Fuera de alcance

- Bloque compacto de rankings del dashboard (`RankingsSection`).
- Cambios de backend, RPCs o migraciones.
- Persistencia del filtro entre sesiones.
