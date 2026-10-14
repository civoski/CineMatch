# Importación desde Letterboxd y TMDB — Diseño

**Fecha:** 2026-10-13
**Estado:** Aprobado (presupuesto aceptado por el cliente)
**Alcance cotizado:** importación de TMDB + Letterboxd, incluida la subida directa del `.zip` de Letterboxd

## Contexto

Hoy el importador solo acepta el CSV de IMDb. Todo el flujo gira alrededor del
ID de IMDb (columna `Const`):

- [`upload/page.tsx`](../../../src/app/app/upload/page.tsx) rechaza cualquier CSV sin `Const`.
- El worker ([`process-import/route.ts`](../../../src/app/api/workers/process-import/route.ts))
  guarda la película con `upsert(..., { onConflict: 'imdb_id' })` y la enriquece con
  `tmdb.findByImdbId()`.

La landing ya anuncia "Compatible con IMDb, TMDb y Letterboxd".

## Formatos de entrada

| Origen | Cabecera | Identificador |
|---|---|---|
| IMDb | `Const, Your Rating, Date Rated, Title, ..., Year, ...` | `Const` (IMDb ID) |
| TMDB (Export CSV de calificaciones / watchlist / favoritos) | `TMDb ID, IMDb ID, Type, Name, Release Date, Season Number, Episode Number, Rating, Your Rating, Date Rated` | `TMDb ID` (+ `IMDb ID` si viene) |
| Letterboxd `ratings.csv` (y `watched.csv`, `watchlist.csv`, `diary.csv`) | `Date, Name, Year, Letterboxd URI, Rating` | **ninguno**: título + año |
| Letterboxd, lista exportada | `Letterboxd list export v7` + metadatos + línea en blanco + `Position, Name, Year, URL, Description` | ninguno |
| Letterboxd `.zip` (Ajustes → Datos → Exportar) | contiene `watched.csv` y `ratings.csv` (entre otros) | ninguno |

El formato se detecta por la cabecera, sin que el usuario elija nada. Las columnas
se buscan sin distinguir mayúsculas y con alias (`Name`/`Title`, `Your Rating`/`Rating`),
porque no tenemos los archivos de ejemplo del cliente.

## Decisiones

| Decisión | Elección |
|---|---|
| Del `.zip` de Letterboxd se importa | `watched.csv` (vistas, aunque no tengan nota) + `ratings.csv` (notas). Una película que está en los dos entra una vez, con su nota. Si falta uno, se usa el otro; si faltan los dos, se informa. (Ampliado el 2026-10-14 a pedido del cliente: originalmente solo `ratings.csv`.) |
| Escala Letterboxd (0,5–5 ★) | `round(rating × 2)` → 1–10 enteros exactos. |
| Escala TMDB (`Your Rating`, admite medios puntos) | `round(rating)`, acotado a 1–10. |
| Filas de episodios en el export de TMDB | Se descartan (`Type = episode` o `Season/Episode Number` con valor). |
| Series en el export de TMDB | Se identifican por IMDb ID (del CSV, o de TMDB si falta) y siguen el camino de IMDb, que ya maneja series. No se usa su TMDb ID para buscar la fila: TMDB numera películas y series por separado y `movies.tmdb_id` es una sola columna. |
| Identificación Letterboxd | Búsqueda en TMDB por título + año, en inglés porque Letterboxd toma sus títulos de TMDB. Primero `year` (cualquier estreno ese año: Letterboxd usa el año del festival, TMDB el estreno principal), después sin año con ±1 año. Se elige: título normalizado exacto (traducido u original) → año más cercano → más votos; una ficha con menos de 10 votos cuenta como un año más lejos para que un homónimo oscuro no le gane al film conocido (caso real: *Crash* 2004 de Haggis, estreno principal 2005). |
| Película no encontrada | El item de la cola queda `failed` con `error_message = 'No encontrada en TMDB'`. |
| Dónde se ven las no encontradas | En el historial de importaciones, por importación, con título y año. El aviso flotante de progreso ya no corta la importación con "Error" ante el primer fallo: al terminar indica cuántas no se encontraron. |
| Misma película importada desde dos plataformas | Gana la nota de la última importación (comportamiento actual del `upsert` en `watchlists`). |

## Flujo en el worker

Los items de IMDb (o los encolados antes de este cambio, sin `source`) siguen por el
camino actual, sin cambios. Para `source = 'tmdb' | 'letterboxd'`:

1. Obtener `tmdb_id`: directo del CSV (TMDB) o por búsqueda (Letterboxd).
2. Traer detalles con `getMovieDetails` (las series ya se desviaron al camino de IMDb).
3. `findOrCreateMovieId({ imdbId, tmdbId })`: reutiliza la fila existente por
   cualquiera de las dos llaves, fusiona gemelas, o crea una nueva. No pisa datos
   enriquecidos de películas que ya existen.
4. Upsert de la nota en `watchlists` y vínculo en `import_items`.
5. Si la película no tiene datos extendidos o póster, aplicar los detalles ya
   descargados (misma lógica de enriquecimiento que IMDb, extraída a una función).

## Limpieza

Al eliminar una importación se borran también sus items `failed` de la cola
(con el cliente de servicio, filtrando por el usuario autenticado, porque
`import_queue` no tiene política de DELETE para usuarios).

## Pruebas

- Unitarias (Vitest, nuevo, `pnpm test`): detección de formato, parsers, conversión
  de notas, lectura del `.zip`, elección del mejor candidato de búsqueda.
- Integración (manual, no commiteada): búsqueda real contra TMDB con 63 títulos de
  Letterboxd elegidos por difíciles (remakes con el mismo nombre, títulos extranjeros,
  símbolos como `8½` o `WALL·E`, cine argentino con título en inglés): 63/63 correctos.
- Punta a punta (manual, no commiteada): usuario descartable → CSV de TMDB, `.zip` de
  Letterboxd y CSV de IMDb → worker local → filas en `movies` / `watchlists` /
  `import_items`, todas con póster; la no encontrada queda visible en el historial;
  borrar la importación limpia la cola. Luego, lo mismo desde el navegador (login,
  subida, aviso de progreso, historial). Todo se borró al terminar.
