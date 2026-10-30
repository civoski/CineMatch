"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { toggleUserMovieQuality } from "../actions";
import type { QualityCategoryWithSelection } from "../types";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// Un color por categoría — en el orden: Lo visto y oído / Lo sentido / Lo pensado / Lo actuado
const CATEGORY_COLORS = [
  // Lo visto y oído — terroso / terracota
  {
    base: "bg-amber-800/10 text-amber-800 dark:text-amber-500 border-amber-300/50 dark:border-amber-800/30 hover:bg-amber-800/15",
    selected: "bg-amber-800 text-white border-amber-800 shadow-md shadow-amber-800/25 hover:bg-amber-900",
    label: "text-amber-800 dark:text-amber-500",
    dot: "bg-amber-800",
    dotInactive: "bg-amber-200 dark:bg-amber-900/40",
    progress: "bg-amber-800",
  },
  // Lo sentido — azul
  {
    base: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30 hover:bg-blue-500/20",
    selected: "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25 hover:bg-blue-700",
    label: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-600",
    dotInactive: "bg-blue-200 dark:bg-blue-900/40",
    progress: "bg-blue-600",
  },
  // Lo pensado — celeste/sky predominante
  {
    base: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/30 hover:bg-sky-500/20",
    selected: "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/25 hover:bg-sky-600",
    label: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    dotInactive: "bg-sky-200 dark:bg-sky-900/40",
    progress: "bg-sky-500",
  },
  // Lo actuado — rojo
  {
    base: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 hover:bg-red-500/20",
    selected: "bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25 hover:bg-red-700",
    label: "text-red-600 dark:text-red-400",
    dot: "bg-red-600",
    dotInactive: "bg-red-200 dark:bg-red-900/40",
    progress: "bg-red-600",
  },
];

const BORDER_RADII = [
  "rounded-full",
  "rounded-2xl",
  "rounded-3xl",
  "rounded-tr-3xl rounded-bl-3xl rounded-tl-xl rounded-br-xl",
  "rounded-tl-3xl rounded-br-3xl rounded-tr-xl rounded-bl-xl",
];

// Márgenes en rem para distribución orgánica (inline styles, no purge de Tailwind)
const CHIP_MX = [0, 0.5, 1.25, 0.25, 0.875, 1.5, 0.125, 0.75, 1, 0.375];
const CHIP_MT = [0, 0.5, 0.25, 0.75, 0.125, 0.625, 0, 0.375, 0.5, 0.25];

type Props = {
  movieId: string;
  categories: QualityCategoryWithSelection[];
  onComplete?: () => void;
  onStepChange?: (step: number) => void;
};

const SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir > 0 ? "55%" : "-55%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-55%" : "55%", opacity: 0 }),
};

export function QualificationSelector({ movieId, categories, onComplete, onStepChange }: Props) {
  const [, startTransition] = useTransition();
  const [localCategories, setLocalCategories] = useState(categories);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const total = localCategories.length;
  const isLast = step === total - 1;
  const currentCategory = localCategories[step];
  const color = CATEGORY_COLORS[step % CATEGORY_COLORS.length];

  const handleToggleQuality = (categoryId: number, qualityId: number) => {
    setLocalCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              qualities: cat.qualities.map((q) =>
                q.id === qualityId ? { ...q, selected: !q.selected } : q
              ),
            }
          : cat
      )
    );

    startTransition(async () => {
      const result = await toggleUserMovieQuality(movieId, qualityId);
      if (!result.success) {
        setLocalCategories((prev) =>
          prev.map((cat) =>
            cat.id === categoryId
              ? {
                  ...cat,
                  qualities: cat.qualities.map((q) =>
                    q.id === qualityId ? { ...q, selected: !q.selected } : q
                  ),
                }
              : cat
          )
        );
      }
    });
  };

  const goNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      setDirection(1);
      setStep((s) => {
        const next = s + 1;
        onStepChange?.(next);
        return next;
      });
    }
  };

  const goPrev = () => {
    setDirection(-1);
    setStep((s) => {
      const prev = s - 1;
      onStepChange?.(prev);
      return prev;
    });
  };

  const selectedInStep = currentCategory.qualities.filter((q) => q.selected).length;
  const totalSelected = localCategories.reduce(
    (acc, cat) => acc + cat.qualities.filter((q) => q.selected).length,
    0
  );

  return (
    <div className="flex flex-col h-full">
      {/* Barra de progreso por pasos */}
      <div className="shrink-0 flex items-center gap-1.5 px-1 mb-4">
        {localCategories.map((cat, i) => {
          const c = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
          const isDone = i < step;
          const isCurrent = i === step;
          return (
            <div key={cat.id} className="flex-1 flex flex-col gap-1">
              <div
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  isDone || isCurrent ? c.progress : "bg-border/40"
                )}
              />
              <span
                className={cn(
                 "text-[10px] font-semibold uppercase tracking-wider truncate transition-colors duration-300",
                 isCurrent ? c.label : isDone ? "text-muted-foreground/70" : "text-muted-foreground/30"
                )}
              ></span>
            </div>
          );
        })}
      </div>

      {/* Área de contenido animada */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 flex flex-col justify-center pb-2 px-1 overflow-y-auto"
          >
            {/* Chips — alineados al fondo, distribución orgánica */}
            <div className="flex flex-wrap justify-center">
              <AnimatePresence mode="popLayout">
                {currentCategory.qualities.map((quality, qIndex) => {
                  const borderRadius = BORDER_RADII[(step * 10 + qIndex) % BORDER_RADII.length];
                  const mx = CHIP_MX[(quality.id + qIndex) % CHIP_MX.length];
                  const mt = CHIP_MT[(quality.id * 3 + qIndex) % CHIP_MT.length];
                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, scale: 0.8, y: 14 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        duration: 0.35,
                        delay: qIndex * 0.04,
                        type: "spring",
                        stiffness: 240,
                        damping: 22,
                      }}
                      key={quality.id}
                      onClick={() => handleToggleQuality(currentCategory.id, quality.id)}
                      style={{
                        marginLeft: `${mx}rem`,
                        marginRight: `${mx * 0.6}rem`,
                        marginTop: `${mt}rem`,
                        marginBottom: "0.4rem",
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition-all duration-300 border",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "active:scale-90 min-h-[36px] cursor-pointer",
                        borderRadius,
                        quality.selected ? color.selected : color.base
                      )}
                    >
                      {quality.selected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        >
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        </motion.span>
                      )}
                      <span className="leading-tight select-none">
                        {quality.name === "Fotografía y dirección de arte"
                          ? "Fotografía"
                          : quality.name}
                      </span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer de navegación */}
      <div className="shrink-0 pt-4 border-t border-border/30 flex items-center justify-between gap-3">
        {/* Contador total */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span className="tabular-nums">
            {selectedInStep > 0
              ? `${selectedInStep} elegidas`
              : `${totalSelected} en total`}
          </span>
        </div>

        {/* Navegación */}
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
          )}

          <Button
            onClick={goNext}
            size="sm"
            className={cn(
              "gap-1.5 font-semibold rounded-xl shadow-lg transition-all duration-300",
              isLast
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20 min-w-[120px]"
                : "bg-foreground hover:bg-foreground/90 text-background shadow-foreground/10 min-w-[120px]"
            )}
          >
            {isLast ? (
              <>
                Finalizar
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Continuar
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
