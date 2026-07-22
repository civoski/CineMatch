"use client";

import { PageHeader, Section, Container } from "@/components/layout";
import { UploadWatchlistForm } from "@/features/watchlist";
import Papa from "papaparse";
import { processImport, type CsvMovieImport } from "@/features/import/actions";
import { toast } from "sonner";

export default function UploadPage() {
  const handleUpload = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // El importador se guía por la columna "Const" (el ID de IMDb), que
            // solo traen los exports de IMDb. Sin ella no se puede identificar
            // ninguna película, así que avisamos en vez de importar 0 en silencio.
            const fields = (results.meta?.fields ?? []).map((f) => f.trim());
            const tieneConst = fields.some(
              (f) => f.toLowerCase() === "const"
            );

            if (!tieneConst) {
              throw new Error(
                'Este archivo no tiene el formato de IMDb. Exportá tu lista desde IMDb: el CSV debe incluir la columna "Const". Por ahora los archivos de TMDB u otros sitios no están soportados.'
              );
            }

            const movies: CsvMovieImport[] = results.data
              .map((row: any) => ({
                imdb_id: row["Const"],
                title: row["Title"],
                year: parseInt(row["Year"]),
                position: row["Position"]
                  ? parseInt(row["Position"])
                  : undefined,
                user_rating: row["Your Rating"]
                  ? parseInt(row["Your Rating"])
                  : undefined,
                date_rated: row["Date Rated"],
                genres: row["Genres"],
                url: row["URL"],
                imdb_rating: row["IMDb Rating"]
                  ? parseFloat(row["IMDb Rating"])
                  : undefined,
                runtime_mins: row["Runtime (mins)"]
                  ? parseInt(row["Runtime (mins)"])
                  : undefined,
                release_date: row["Release Date"],
                directors: row["Directors"],
                num_votes: row["Num Votes"]
                  ? parseInt(row["Num Votes"])
                  : undefined,
              }))
              .filter((m) => m.imdb_id); // Filtrar filas sin ID

            // El archivo tiene la columna correcta pero ninguna fila utilizable
            // (vacío, o todas sin ID).
            if (movies.length === 0) {
              throw new Error(
                "No encontramos ninguna película en el archivo. Revisá que sea el export de IMDb y que no esté vacío."
              );
            }

            const result = await processImport(movies, file.name);

            if (result.success) {
              resolve();
            } else {
              toast.error("Hubo un error en la importación.");
              reject();
            }
          } catch (error) {
            console.error(error);
            // Propagamos el mensaje real para que el formulario pueda mostrarlo.
            const mensaje =
              error instanceof Error
                ? error.message
                : "Error procesando los datos del CSV.";
            toast.error(mensaje);
            reject(error instanceof Error ? error : new Error(mensaje));
          }
        },
        error: (error) => {
          console.error(error);
          toast.error("Error leyendo el archivo CSV.");
          reject(error);
        },
      });
    });
  };

  return (
    <Container className="py-6 space-y-8">
      <PageHeader
        title="Subida de Watchlist"
        description="Importá tu lista para enriquecer datos y empezar el análisis."
      />

      <Section>
        <UploadWatchlistForm onUpload={handleUpload} maxSizeMB={10} />
      </Section>
    </Container>
  );
}
