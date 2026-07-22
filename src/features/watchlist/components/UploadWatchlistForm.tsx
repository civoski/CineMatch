"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle2,
  BarChart3,
  Info,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/config/routes";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/index";
import { TypewriterLoader } from "@/components/shared/typewriter-loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UploadStatus } from "../types";

interface UploadWatchlistFormProps {
  onUpload?: (file: File) => Promise<void> | void;
  maxSizeMB?: number;
  className?: string;
}

export function UploadWatchlistForm({
  onUpload,
  maxSizeMB = 10,
  className,
}: UploadWatchlistFormProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<UploadStatus>("idle");
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // La animación de carga y la subida real terminan por separado. El cartel de
  // éxito solo debe aparecer cuando AMBAS terminaron bien: antes lo disparaba
  // solo el temporizador de la animación, así que decía "completado" incluso
  // cuando la importación había fallado.
  const [animationDone, setAnimationDone] = React.useState(false);
  const [uploadOk, setUploadOk] = React.useState(false);

  const handleFinished = React.useCallback(() => {
    setAnimationDone(true);
  }, []);

  React.useEffect(() => {
    if (status === "uploading" && animationDone && uploadOk) {
      setStatus("success");
      setIsDialogOpen(true);
    }
  }, [status, animationDone, uploadOk]);

  const validateFile = (fileToValidate: File): string | null => {
    const fileName = fileToValidate.name.toLowerCase();
    if (!fileName.endsWith(".csv"))
      return "Solo se permiten archivos CSV (.csv)";
    if (fileToValidate.size > maxSizeMB * 1024 * 1024)
      return `Máximo: ${maxSizeMB}MB`;
    return null;
  };

  const handleFileSelect = async (selectedFile: File) => {
    if (status === 'uploading') return; // Prevent duplicate submissions

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setStatus("error");
      return;
    }
    setError(null);
    setFile(selectedFile);
    setAnimationDone(false);
    setUploadOk(false);
    setStatus("uploading");
    if (onUpload) {
      try {
        await onUpload(selectedFile);
        setUploadOk(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir");
        setStatus("error");
      }
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  React.useEffect(() => {
    if (status === "success") {
      toast.success("Carga exitosa. Tus películas se procesarán en segundo plano", {
        description: "Verás el progreso en la esquina inferior derecha",
        duration: 5000,
      });
    }
  }, [status]);

  return (
    <div className={cn("w-full max-w-4xl mx-auto space-y-8", className)}>
      <Card className="overflow-hidden border-border/40 shadow-sm">
        <CardContent className="p-0">
          <div
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFileSelect(f);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() =>
              status !== "uploading" && fileInputRef.current?.click()
            }
            className={cn(
              "relative min-h-[300px] flex flex-col items-center justify-center transition-all duration-200 p-8",
              status !== "uploading" && "cursor-pointer hover:bg-muted/30",
              isDragging && "bg-primary/5 ring-2 ring-primary ring-inset"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
              className="hidden"
            />

            <AnimatePresence mode="wait">
              {status === "uploading" ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full"
                >
                  <TypewriterLoader
                    messages={[
                      "Analizando gustos...",
                      "Analizando películas...",
                      "Procesando historial...",
                      "Generando perfil...",
                    ]}
                    duration={3000}
                    onFinished={handleFinished}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 text-center"
                >
                  <div
                    className={cn(
                      "p-4 rounded-full transition-colors",
                      error
                        ? "bg-destructive/10 text-destructive"
                        : file
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {error ? (
                      <AlertCircle className="h-10 w-10" />
                    ) : file ? (
                      <FileText className="h-10 w-10" />
                    ) : (
                      <Upload className="h-10 w-10" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-medium">
                      {file ? file.name : "Arrastra tu archivo CSV aquí"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {error
                        ? "Hacé clic para probar con otro archivo"
                        : file
                          ? "Listo para procesar"
                          : "o haz clic para seleccionar"}
                    </p>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="mt-1 max-w-md rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-left"
                    >
                      <p className="text-sm font-semibold text-destructive">
                        No pudimos importar este archivo
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {error}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
        <StepItem
          icon={<Info />}
          title="Paso 1: Exportar"
          desc="Exporta tu lista desde IMDB en formato CSV."
        />
        <StepItem
          icon={<Upload />}
          title="Paso 2: Subir"
          desc="Arrastra el archivo para analizar géneros y años."
        />
        <StepItem
          icon={<BarChart3 />}
          title="Paso 3: Analizar"
          desc="¡Listo! Revisa tu análisis visual y estadísticas."
        />
      </div>

      <AlertDialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            handleReset();
          }
        }}
      >
        <AlertDialogContent className="max-w-[400px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.4,
            }}
          >
            <AlertDialogHeader>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.1,
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                }}
                className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4"
              >
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                <AlertDialogTitle className="text-center">
                  ¡Análisis completado!
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  Tu archivo ha sido puesto en cola. Las películas aparecerán progresivamente en tu biblioteca.
                </AlertDialogDescription>
              </motion.div>
            </AlertDialogHeader>
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:justify-center">
                <AlertDialogAction
                  onClick={() => router.push(APP_ROUTES.ANALYSIS)}
                >
                  Ver análisis
                </AlertDialogAction>
                <AlertDialogCancel 
                  onClick={() => {
                    setIsDialogOpen(false);
                    handleReset();
                  }}
                  className="hover:bg-destructive hover:text-destructive-foreground"
                >
                  Cerrar
                </AlertDialogCancel>
              </AlertDialogFooter>
            </motion.div>
          </motion.div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StepItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </div>
    </div>
  );
}
