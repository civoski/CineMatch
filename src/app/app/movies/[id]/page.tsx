import Image from "@/components/CloudinaryImage";
import { notFound } from "next/navigation";
import { Calendar, Star, Film, Bookmark, Clock } from "lucide-react";
import {
  getMovie,
  MovieBackButton,
  MovieBackdrop,
  MovieCast,
  MovieRecommendations,
  MovieMobileDetail
} from "@/features/movie";
import { PersonLink } from "@/components/shared/PersonLink";
import { Container } from "@/components/layout";
import { QualificationModal } from "@/features/qualifications/components/QualificationModal";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;
  const movie = await getMovie(id);

  if (!movie) {
    notFound();
  }

  const technical = movie.extended_data?.technical;
  const cast = movie.extended_data?.cast || [];
  const crewDetails = movie.extended_data?.crew_details || [];
  const recommendations = movie.extended_data?.recommendations || [];

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
    <div className="flex flex-col min-h-screen">
      {/* Backdrop Banner (Full Width) - DESKTOP/TABLET */}
      <div className="hidden md:block">
        <MovieBackdrop
          backdropUrl={movie.backdrop_url}
          title={movie.title}
        >
          <div className="mb-0">
            <MovieBackButton />
          </div>
        </MovieBackdrop>
      </div>

      {/* Main Content Container - sube para superponerse al backdrop */}
      <div className="relative md:-mt-84 lg:-mt-[28rem]">
        <Container className="relative pt-0 pb-16">
          <div className="grid grid-cols-1 gap-8 items-start">
            {/* MOBILE ONLY: Extracted to MovieMobileDetail component */}
            <MovieMobileDetail movie={movie} />

            {/* DESKTOP: Layout */}
            <div className="hidden md:grid md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] gap-8 lg:gap-12">
              {/* Columna Izquierda: Póster (Sticky) - SOLO DESKTOP/TABLET */}
              <div className="w-full max-w-[200px] md:max-w-none mx-auto md:mx-0 md:sticky md:top-24 z-30">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-2xl border border-black/10 dark:border-white/10 bg-muted">
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 200px, 300px"
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/50 text-muted-foreground">
                      <Film className="h-12 w-12 opacity-20" />
                    </div>
                  )}
                </div>

                {/* Watchlist Badge (Debajo del póster en desktop) */}
                {movie.watchlist && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-foreground/80 font-medium">
                    <Bookmark className="h-4 w-4 fill-current" />
                    <span>En tu lista</span>
                  </div>
                )}

                {/* Botón Cualificar - Alineado con los géneros */}
                <div className="pt-4">
                  <QualificationModal movieId={movie.id} movieTitle={movie.title}>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-sm hover:shadow-md transition-all"
                    >
                      Etiquetar
                    </Button>
                  </QualificationModal>
                </div>
              </div>

              {/* Columna Derecha: Información Principal (Baja respecto al poster) */}
              <div className="flex flex-col space-y-6 md:mt-28 lg:mt-40">
                <div className="space-y-4">
                  {/* Título y Año */}
                  <div className="space-y-2">
                    <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-foreground tracking-tight">
                      {movie.title}
                    </h1>
                    <div className="flex items-center gap-3 text-lg font-medium text-muted-foreground">
                      <span>{movie.year}</span>
                      {movie.director && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span>
                            Directed by <PersonLink name={movie.director} className="text-foreground hover:underline font-semibold" />
                          </span>
                        </>
                      )}
                    </div>

                    {/* Badge de Próximamente */}
                    {isUnreleased && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 w-fit">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                          Próximamente: {formattedReleaseDate}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Metadata Secundaria (Runtime) */}
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                    {technical?.runtime && (
                      <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wider text-[11px]">
                        {technical.runtime} mins
                      </span>
                    )}
                  </div>

                  {/* Ratings */}
                  {(movie.rating || movie.imdb_rating) && (
                    <div className="flex items-center gap-8 py-4 border-y border-border/50">
                      {movie.rating && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Tu valoración</span>
                          <div className="flex items-center gap-1.5">
                            <Star className="h-5 w-5 fill-accent text-accent" />
                            <span className="text-xl font-bold text-foreground">{movie.rating}</span>
                          </div>
                        </div>
                      )}
                      {movie.imdb_rating && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">IMDb</span>
                          <div className="flex items-center gap-1.5">
                            <Star className="h-5 w-5 fill-star-yellow text-star-yellow" />
                            <span className="text-xl font-bold text-star-yellow">
                              {movie.imdb_rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tagline */}
                  {technical?.tagline && (
                    <p className="text-lg italic text-muted-foreground border-l-4 border-primary/20 pl-4 py-1">
                      &quot;{technical.tagline}&quot;
                    </p>
                  )}

                  {/* Sinopsis */}
                  {movie.synopsis && (
                    <div className="space-y-3 pt-2">
                      <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-muted-foreground">Sinopsis</h2>
                      <p className="text-lg leading-relaxed text-foreground/90 max-w-4xl">
                        {movie.synopsis}
                      </p>
                    </div>
                  )}

                  {/* Géneros */}
                  {movie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-4">
                      {movie.genres.map((genre) => (
                        <span
                          key={genre}
                          className="px-4 py-1.5 rounded-full text-sm font-semibold
                                    bg-secondary text-secondary-foreground border border-border/50
                                    hover:bg-secondary/80 transition-colors"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Secciones Inferiores (Casting, Recomendaciones) */}
          <div className="mt-8 md:mt-16 space-y-12 md:space-y-20">
            {(cast.length > 0 || crewDetails.length > 0) && (
              <div className="pt-8 border-t border-border/50">
                <MovieCast cast={cast} crew={crewDetails} />
              </div>
            )}

            {recommendations.length > 0 && (
              <div className="pt-8 border-t border-border/50">
                <MovieRecommendations recommendations={recommendations} />
              </div>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
}
