"use client";

import * as React from "react";
import { RankingsExpandedView } from "@/features/rankings/components/RankingsExpandedView";
import { RankingRangeControl } from "@/features/rankings/components/RankingRangeControl";
import { CollaborationsSection } from "@/features/analysis/components/CollaborationsSection";
import { type RankingType } from "@/features/rankings/actions";
import { Section } from "@/components/layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LIMIT_MIN = 1;
const LIMIT_MAX = 50;
const LIMIT_DEFAULT = 20;

const RATING_MIN = 1;
const RATING_MAX = 10;
const RATING_DEFAULT = 6;

const DEBOUNCE_MS = 600;

interface AnalysisClientWrapperProps {
    userId: string;
}

const RANKING_TYPES: Array<{ value: RankingType; label: string }> = [
    { value: "director", label: "Directores" },
    { value: "actor", label: "Actores" },
    { value: "screenplay", label: "Guionistas" },
    { value: "photography", label: "Fotografía" },
    { value: "music", label: "Música" },
    { value: "genre", label: "Géneros" },
    { value: "year", label: "Años" },
];

export function AnalysisClientWrapper({ userId }: AnalysisClientWrapperProps) {
    const [activeTab, setActiveTab] = React.useState<RankingType>("director");

    // draft: valor en tiempo real (slider + input)
    // committed: valor que dispara la carga de datos (debounced)
    const [limitDraft, setLimitDraft] = React.useState(LIMIT_DEFAULT);
    const [limitCommitted, setLimitCommitted] = React.useState(LIMIT_DEFAULT);

    const [minRatingDraft, setMinRatingDraft] = React.useState(RATING_DEFAULT);
    const [minRatingCommitted, setMinRatingCommitted] = React.useState(RATING_DEFAULT);

    // Debounce: esperar DEBOUNCE_MS tras el último cambio antes de recargar.
    React.useEffect(() => {
        const timer = setTimeout(() => setLimitCommitted(limitDraft), DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [limitDraft]);

    React.useEffect(() => {
        const timer = setTimeout(() => setMinRatingCommitted(minRatingDraft), DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [minRatingDraft]);

    return (
        <div className="space-y-10">
            <Section>
                <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Rankings</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Descubre tus preferencias cinematográficas
                            </p>
                        </div>

                        {/* Filtros: cantidad + puntuación mínima */}
                        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
                            <RankingRangeControl
                                label="Cantidad a mostrar"
                                value={limitDraft}
                                min={LIMIT_MIN}
                                max={LIMIT_MAX}
                                onChange={setLimitDraft}
                                valuePrefix="Top "
                                ariaLabel="Número de resultados"
                            />
                            <RankingRangeControl
                                label="Puntuación mínima"
                                value={minRatingDraft}
                                min={RATING_MIN}
                                max={RATING_MAX}
                                onChange={setMinRatingDraft}
                                valuePrefix="★ "
                                ariaLabel="Puntuación mínima"
                            />
                        </div>
                    </div>

                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => setActiveTab(v as RankingType)}
                    >
                        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-card/10 backdrop-blur-md border border-border/30">
                            {RANKING_TYPES.map((type) => (
                                <TabsTrigger
                                    key={type.value}
                                    value={type.value}
                                    className="shrink-0 data-[state=active]:bg-background/80 data-[state=active]:backdrop-blur-sm text-xs md:text-sm transition-all duration-200"
                                >
                                    {type.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <RankingsExpandedView
                        key={`${activeTab}-${limitCommitted}-${minRatingCommitted}`}
                        userId={userId}
                        type={activeTab}
                        limit={limitCommitted}
                        minRating={minRatingCommitted}
                    />
                </div>
            </Section>

            {/* Colaboraciones con Bento Grid */}
            <Section>
                <CollaborationsSection
                    userId={userId}
                    rankingType={activeTab}
                />
            </Section>
        </div>
    );
}
