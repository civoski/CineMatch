"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { QualificationSelector } from "./QualificationSelector";
import { getUserMovieQualitiesGrouped } from "../actions";
import type { QualityCategoryWithSelection } from "../types";
import { Loader2, Film, AlertCircle } from "lucide-react";

interface QualificationModalProps {
  movieId: string;
  movieTitle: string;
  children: React.ReactNode;
}

// Gradientes de fondo por categoría (inline styles — no purge de Tailwind)
const STEP_BG_GRADIENTS = [
  // Lo visto y oído — terroso/terracota
  "radial-gradient(ellipse at 50% 100%, rgba(146, 64, 14, 0.13) 0%, rgba(180, 83, 9, 0.06) 45%, transparent 72%)",
  // Lo sentido — azul
  "radial-gradient(ellipse at 50% 100%, rgba(37, 99, 235, 0.13) 0%, rgba(59, 130, 246, 0.05) 45%, transparent 72%)",
  // Lo pensado — celeste + toque amarillo
  "radial-gradient(ellipse at 30% 100%, rgba(14, 165, 233, 0.13) 0%, rgba(250, 204, 21, 0.06) 50%, transparent 72%)",
  // Lo actuado — rojo
  "radial-gradient(ellipse at 50% 100%, rgba(220, 38, 38, 0.13) 0%, rgba(239, 68, 68, 0.05) 45%, transparent 72%)",
];

// Tinte del header por categoría
const STEP_HEADER_GRADIENTS = [
  "from-amber-800/8 to-transparent",
  "from-blue-600/8 to-transparent",
  "from-sky-500/8 to-transparent",
  "from-red-600/8 to-transparent",
];

export function QualificationModal({
  movieId,
  movieTitle,
  children,
}: QualificationModalProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<QualityCategoryWithSelection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (open) {
      loadCategories();
    } else {
      setCategories(null);
      setActiveStep(0);
    }
  }, [open]);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    const result = await getUserMovieQualitiesGrouped(movieId);

    if (result.error || !result.data) {
      setError(result.error || "Error al cargar las cualificaciones");
    } else {
      setCategories(result.data);
    }

    setLoading(false);
  };

  const bgGradient = STEP_BG_GRADIENTS[activeStep % STEP_BG_GRADIENTS.length];
  const headerGradient = STEP_HEADER_GRADIENTS[activeStep % STEP_HEADER_GRADIENTS.length];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">

        {/* Tinte de fondo animado por categoría */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700 z-0"
          style={{ background: bgGradient }}
        />

        {/* Header Orgánico */}
        <div className="shrink-0 relative px-6 pt-8 pb-4 text-center z-10">
          <div className={`absolute inset-0 bg-gradient-to-b ${headerGradient} transition-all duration-700 -z-10`} />
          <DialogHeader className="items-center sm:items-center">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-4 animate-bounce-slow">
              <Film className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-balance">
              ¿Qué te gustó de esta película?
            </DialogTitle>
            <DialogDescription className="text-base text-foreground/60 font-medium">
              Explora y elige lo que más te resonó de <span className="text-primary font-bold">{movieTitle}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-8 flex flex-col z-10">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
                <div className="absolute inset-0 h-12 w-12 animate-ping text-primary/10">
                  <Loader2 className="h-12 w-12" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
                Invocando sensaciones...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-4 rounded-3xl bg-destructive/5 border border-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive/50" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-bold text-destructive">Algo no salió como esperábamos</p>
                <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && categories && (
            <div className="flex-1 flex flex-col">
              <QualificationSelector
                movieId={movieId}
                categories={categories}
                onStepChange={setActiveStep}
                onComplete={() => {
                  setOpen(false);
                  toast.success("Tu visión ha sido guardada", {
                    description: "Tus impresiones son ahora parte de tu historia."
                  });
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
