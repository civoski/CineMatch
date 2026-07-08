"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "@/components/CloudinaryImage";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, Film, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { RankingChartSection } from "./RankingChartSection";
import { RankingStatsGrid } from "./RankingStatsGrid";
import { RankingDetailList } from "./RankingDetailList";
import { useRankingCalculations } from "../hooks/useRankingCalculations";
import type { ChartType } from "./charts";
import type { RankingStatConfig, RankingType } from "../actions";
import { cn } from "@/lib/utils";

interface RankingsGraphicsPanelProps {
  data: RankingStatConfig[];
  type: RankingType;
  selectedIndex: number | null;
  onSelectItem: (index: number) => void;
  isLoading: boolean;
}

const TYPE_LABELS: Record<RankingType, string> = {
  director: "Directores",
  actor: "Actores",
  genre: "Géneros",
  year: "Años",
  screenplay: "Guionistas",
  photography: "Fotografía",
  music: "Música",
};

const PERSON_TYPES: RankingType[] = ["director", "actor", "screenplay", "photography", "music"];

export function RankingsGraphicsPanel({
  data,
  type,
  selectedIndex,
  onSelectItem,
  isLoading,
}: RankingsGraphicsPanelProps) {
  const [chartType, setChartType] = React.useState<ChartType>("bar");
  const router = useRouter();
  const calculations = useRankingCalculations(data);
  const isPerson = PERSON_TYPES.includes(type);

  const selectedItem = React.useMemo(
    () => (selectedIndex !== null ? data[selectedIndex] : null),
    [selectedIndex, data]
  );

  const getInitials = React.useCallback((name: string) => {
    return name
      .split(" ")
      .filter((word) => word.length > 0)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
  }, []);

  const getImageUrl = React.useCallback((path: string | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `https://image.tmdb.org/t/p/w185${path}`;
  }, []);

  const handleMovieClick = React.useCallback(
    (movie: any) => {
      router.push(`/app/movies/${movie.id}`);
    },
    [router]
  );

  if (isLoading) {
    return <GraphicsPanelSkeleton />;
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-foreground">Análisis Visual</h3>
          <p className="text-sm text-muted-foreground">
            Gráficos interactivos de tus preferencias cinematográficas
          </p>
        </div>

        <EmptyState
          icon={<SlidersHorizontal className="h-12 w-12" />}
          title="Sin resultados con estos filtros"
          description="Ninguna película supera la puntuación mínima elegida. Probá bajarla o califica más películas."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-foreground">Análisis Visual</h3>
        <p className="text-sm text-muted-foreground">
          Gráficos interactivos de tus preferencias cinematográficas
        </p>
      </div>

      {/* Stats Grid */}
      {data.length > 0 && (
        <RankingStatsGrid
          totalMoviesInTop10={calculations.totalMoviesInTop10}
          leaderKey={calculations.leaderKey}
          leaderCount={calculations.leaderCount}
          averageRating={calculations.averageRating}
          totalUniqueItems={calculations.totalUniqueItems}
          typeLabel={TYPE_LABELS[type]}
        />
      )}

      {/* Gráfico + Sidebar Top 10 */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Gráfico Principal */}
        <div className="flex-1 min-w-0">
          <RankingChartSection
            chartType={chartType}
            onChartTypeChange={setChartType}
            data={data}
            type={type}
            selectedIndex={selectedIndex}
            onSelectItem={onSelectItem}
            isLoading={false}
          />
        </div>

        {/* Sidebar Top 10 */}
        {data.length > 0 && (
          <div className="w-full lg:w-72 shrink-0 border border-border/40 rounded-xl bg-card/20 backdrop-blur-xl p-4">
            <RankingDetailList
              data={data}
              type={type}
              selectedIndex={selectedIndex}
              onSelectItem={onSelectItem}
            />
          </div>
        )}
      </div>

      {/* Películas del item seleccionado */}
      {selectedItem && (
        <div className="space-y-5 border-t border-border/50 pt-6">
          {/* Header del item seleccionado */}
          <div className="flex items-end justify-between pb-3 border-b border-border/30">
            <div className="flex items-center gap-3">
              {isPerson && (
                <Avatar className="h-10 w-10 ring-2 ring-border/40">
                  {selectedItem.data.image_url &&
                  getImageUrl(selectedItem.data.image_url) ? (
                    <AvatarImage
                      src={getImageUrl(selectedItem.data.image_url)!}
                      alt={selectedItem.key}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(selectedItem.key)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "text-3xl font-black select-none",
                  selectedIndex === 0 && "text-yellow-600 dark:text-yellow-500",
                  selectedIndex === 1 && "text-slate-600 dark:text-slate-400",
                  selectedIndex === 2 && "text-amber-700 dark:text-amber-600",
                  selectedIndex !== null &&
                    selectedIndex > 2 &&
                    "text-muted-foreground"
                )}
              >
                {String((selectedIndex || 0) + 1).padStart(2, "0")}
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground leading-tight">
                  {selectedItem.key}
                </h4>
                {selectedItem.data.roles &&
                  selectedItem.data.roles.length > 0 && (
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {selectedItem.data.roles
                        .map(
                          (r: any) =>
                            `${r.role} (${r.movies.join(" • ")})`
                        )
                        .join(" • ")}
                    </p>
                  )}
              </div>
            </div>
            <div className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              {selectedItem.count} títulos
            </div>
          </div>

          {/* Grid de posters grandes */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {(selectedItem.data.movies || []).map((movie: any) => (
              <div
                key={movie.id}
                className="group/movie flex flex-col gap-1.5 cursor-pointer"
                onClick={() => handleMovieClick(movie)}
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted shadow-sm transition-[transform,box-shadow] duration-300 group-hover/movie:scale-[1.03] group-hover/movie:ring-2 group-hover/movie:ring-primary/40">
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover/movie:scale-110"
                      sizes="(max-width: 640px) 30vw, (max-width: 768px) 20vw, 15vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/50 text-muted-foreground">
                      <Film className="h-6 w-6" />
                    </div>
                  )}
                  {movie.user_rating && (
                    <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-md bg-background/80 backdrop-blur-sm text-[10px] font-bold text-accent shadow-sm border border-accent/20">
                      {movie.user_rating}
                    </div>
                  )}
                </div>
                <div className="space-y-0.5 px-0.5">
                  <p
                    className="text-[10px] md:text-[11px] font-medium leading-tight line-clamp-2 group-hover/movie:text-primary transition-colors duration-200"
                    title={movie.title}
                  >
                    {movie.title}
                  </p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground">
                    {movie.year}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GraphicsPanelSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}
