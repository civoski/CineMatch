"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { RankingsGraphicsPanel } from "./RankingsGraphicsPanel";
import { getRanking, type RankingType, type RankingStatConfig } from "../actions";
import { ArrowLeft } from "lucide-react";

interface RankingsExpandedViewProps {
  userId: string;
  type: RankingType;
  limit?: number;
  minRating?: number;
  onBack?: () => void;
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

export function RankingsExpandedView({
  userId,
  type,
  limit = 20,
  minRating = 1,
  onBack = undefined,
}: RankingsExpandedViewProps) {
  const [data, setData] = React.useState<RankingStatConfig[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadFullRanking = async () => {
      try {
        const result = await getRanking(userId, type, {
          minRating,
          limit,
        });
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading ranking:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFullRanking();

    return () => {
      isMounted = false;
    };
  }, [userId, type, limit, minRating]);

  const handleSelectItem = React.useCallback((index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/50">
        {onBack ? (
          <Button onClick={onBack} variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a rankings
          </Button>
        ) : (
          <div className="w-[120px]" />
        )}
        <div className="flex-1 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            {TYPE_LABELS[type]}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Análisis detallado con gráficos interactivos
          </p>
        </div>
        <div className="w-[120px]" />
      </div>

      {/* Panel único con gráficos + detalles */}
      <RankingsGraphicsPanel
        data={data}
        type={type}
        selectedIndex={selectedIndex}
        onSelectItem={handleSelectItem}
        isLoading={loading}
      />
    </div>
  );
}
