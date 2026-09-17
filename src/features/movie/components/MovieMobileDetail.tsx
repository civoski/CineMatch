import Image from "@/components/CloudinaryImage";
import { Film, Bookmark, Star, Clock } from "lucide-react";
import { PersonLink } from "@/components/shared/PersonLink";
import { MovieBackButton } from "./MovieBackButton";
import type { MovieDetail } from "../actions";
import { QualificationModal } from "@/features/qualifications/components/QualificationModal";
import { Button } from "@/components/ui/button";

type MovieMobileDetailProps = {
  movie: MovieDetail;
};

export function MovieMobileDetail({ movie }: MovieMobileDetailProps) {
  const technical = movie.extended_data?.technical;

  // Detectar si la película aún no se ha estrenado
  const isUnreleased = movie.release_date
    ? new Date(movie.release_date) > new Date()
    : false;

  // Formatear la fecha de estreno para mostrarla
  const formattedReleaseDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : null;

  return (
    <div className="md:hidden relative -mx-4 sm:-mx-6">
      {/* ==================== BACKDROP - IMAGEN COMPLETA ==================== */}
      <div className="relative w-full -mt-8 bg-black">
        {/* Imagen backdrop - aspect ratio natural 16:9 */}
        {movie.backdrop_url || movie.poster_url ? (
          <div className="relative w-full aspect-video">
            <Image
              src={movie.backdrop_url || movie.poster_url || ""}
              alt={movie.title}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-muted/50">
            <Film className="h-16 w-16 opacity-20" />
          </div>
        )}

        {/* Botón Volver - flotante sobre el backdrop */}
        <div className="absolute top-16 left-4 sm:left-6 z-20">
          <MovieBackButton variant="dark" />
        </div>
      </div>

      {/* ==================== CONTENIDO DEBAJO DEL BACKDROP ==================== */}
      {/* Esta sección está DEBAJO del backdrop, no superpuesta */}
      <div className="relative bg-background">
        {/* Grid: Título izquierda, Póster derecha (el póster sube al backdrop) */}
        <div className="px-4 sm:px-6 pt-4 grid grid-cols-[1fr_110px] sm:grid-cols-[1fr_130px] gap-4">

          {/* Columna Izquierda: Título y Metadata */}
          <div className="flex flex-col space-y-1">
            {/* Título */}
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">
              {movie.title}
            </h1>

            {/* Año • Director */}
            <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <span>{movie.year}</span>
              <span className="opacity-50">•</span>
              <span className="uppercase text-[11px] tracking-wide">Directed by</span>
            </div>
            <PersonLink
              name={movie.director || ""}
              className="text-primary hover:underline font-semibold text-sm"
            />

            {/* Duración */}
            {technical?.runtime && (
              <div className="text-xs text-muted-foreground uppercase tracking-wider pt-1">
                {technical.runtime} mins
              </div>
            )}

            {/* Watchlist */}
            {movie.watchlist && (
              <div className="flex items-center gap-1.5 text-foreground/80 pt-2">
                <Bookmark className="h-4 w-4 fill-current" />
                <span className="text-sm font-medium">En tu lista</span>
              </div>
            )}

            {/* Botón Cualificar - Mobile */}
            <div className="pt-3">
              <QualificationModal movieId={movie.id} movieTitle={movie.title}>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  Etiquetar
                </Button>
              </QualificationModal>
            </div>

            {/* Badge de Próximamente */}
            {isUnreleased && (
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 w-fit">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">
                  Próximamente: {formattedReleaseDate}
                </span>
              </div>
            )}
          </div>

          {/* Columna Derecha: Póster que sube sobre el backdrop */}
          <div className="relative">
            {/* El póster se posiciona para subir sobre el backdrop */}
            <div className="absolute bottom-0 right-0 w-full -top-8">
              <div className="relative w-full h-full">
                <div className="absolute bottom-0 w-full aspect-[2/3] overflow-hidden rounded-sm shadow-2xl border border-white/20">
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 110px, 130px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Film className="h-8 w-8 opacity-20" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Espacio para que el póster no tape el contenido siguiente */}
        <div className="h-8" />
      </div>

      {/* ==================== TAGLINE & SINOPSIS ==================== */}
      <div className="px-4 sm:px-6 pt-6 space-y-4 bg-background">
        {/* Tagline */}
        {technical?.tagline && (
          <p className="text-sm italic text-muted-foreground uppercase tracking-wide">
            {technical.tagline}
          </p>
        )}

        {/* Sinopsis */}
        {movie.synopsis && (
          <p className="text-[15px] leading-relaxed text-foreground/90">
            {movie.synopsis}
          </p>
        )}
      </div>

      {/* ==================== RATINGS ==================== */}
      {(movie.imdb_rating || movie.personalRating || movie.rating) && (
        <div className="px-4 sm:px-6 mt-8 pt-6 border-t border-border/30 bg-background">
          <div className="flex items-center gap-8">
            {/* IMDB Rating */}
            {movie.imdb_rating && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  IMDb
                </span>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <span className="text-xl font-bold">{movie.imdb_rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">/10</span>
                </div>
              </div>
            )}

            {/* User Rating */}
            {(movie.personalRating || movie.rating) && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  Tu Valoración
                </span>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="text-xl font-bold">
                    {(movie.personalRating || movie.rating)?.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">/10</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Padding inferior */}
      <div className="h-8 bg-background" />
    </div>
  );
}
