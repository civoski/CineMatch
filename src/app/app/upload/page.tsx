"use client";

import { PageHeader, Section, Container } from "@/components/layout";
import { UploadWatchlistForm } from "@/features/watchlist";
import { processImport } from "@/features/import/actions";
import { readImportFile } from "@/features/import/parsers";
import { toast } from "sonner";

export default function UploadPage() {
  const handleUpload = async (file: File) => {
    try {
      // Detecta la plataforma (IMDb, TMDB o Letterboxd) por la cabecera del CSV;
      // el .zip de Letterboxd se abre en el navegador y se usa su ratings.csv.
      const { movies } = await readImportFile(file);

      const result = await processImport(movies, file.name);

      if (!result.success) {
        throw new Error("Hubo un error en la importación.");
      }
    } catch (error) {
      console.error(error);
      // Propagamos el mensaje real para que el formulario pueda mostrarlo.
      const mensaje =
        error instanceof Error
          ? error.message
          : "Error procesando los datos del archivo.";
      toast.error(mensaje);
      throw error instanceof Error ? error : new Error(mensaje);
    }
  };

  return (
    <Container className="py-6 space-y-8">
      <PageHeader
        title="Subida de Watchlist"
        description="Importá tu lista de IMDb, TMDB o Letterboxd para enriquecer datos y empezar el análisis."
      />

      <Section>
        <UploadWatchlistForm onUpload={handleUpload} maxSizeMB={10} />
      </Section>
    </Container>
  );
}
