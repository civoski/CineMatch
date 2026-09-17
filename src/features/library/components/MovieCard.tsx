"use client";

import Image from "@/components/CloudinaryImage";
import Link from "next/link";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QualificationModal } from "@/features/qualifications";
import type { LibraryItem } from "../types";

interface MovieCardProps {
  item: LibraryItem;
}

export function MovieCard({ item }: MovieCardProps) {
  const { movie, watchlist } = item;

  return (
    <Link href={`/app/movies/${movie.id}`} className="block group">
      <Card variant="glassmorphism" className="relative overflow-hidden p-0 gap-0 duration-500 hover:shadow-2xl hover:shadow-black/20 hover:ring-primary/30">
        <div className="flex h-64 sm:h-60">
          <div className="relative w-28 sm:w-32 flex-shrink-0 overflow-hidden bg-muted rounded-l-xl">
            {movie.poster_url ? (
              <>
                <Image
                  src={movie.poster_url}
                  alt={movie.title || "Movie poster"}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 112px, 128px"
                />
                {/* Subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card/20 pointer-events-none" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-widest text-muted-foreground/50">
                No Art
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 p-4 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {watchlist.user_rating != null && (
                <Badge variant="glassmorphism-accent" className="gap-1 px-2 py-1">
                  <Star className="h-3 w-3 fill-accent" />
                  <span className="text-xs font-bold leading-none">
                    {watchlist.user_rating.toFixed(1)}
                  </span>
                </Badge>
              )}
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {movie.year || "N/A"}
              </span>
            </div>

            <h3 className="font-semibold text-base leading-tight line-clamp-1 text-foreground group-hover:text-primary transition-colors duration-300 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)]">
              {movie.title || "Sin título"}
            </h3>

            {movie.overview && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1.5">
                {movie.overview}
              </p>
            )}

            <div className="flex flex-wrap gap-1 mt-2">
              {movie.genres &&
                Array.isArray(movie.genres) &&
                (movie.genres as string[]).slice(0, 2).map((genre) => (
                  <Badge
                    key={genre}
                    variant="ring"
                    className="text-[9px] uppercase tracking-normal px-1.5 py-0 font-medium"
                  >
                    {genre}
                  </Badge>
                ))}
            </div>

            <div className="mt-auto pt-3">
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <QualificationModal
                  movieId={movie.id}
                  movieTitle={movie.title || "Sin título"}
                >
                  <Button
                    variant="premium"
                    size="sm"
                    className="w-full"
                  >
                    Etiquetar
                  </Button>
                </QualificationModal>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
