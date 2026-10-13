'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, FileText, CheckCircle2, Clock, AlertCircle, Loader2, Film, Calendar, SearchX, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteImport, UserImport } from '@/features/import/actions';
import { cn } from '@/lib/utils';

interface ImportHistoryListProps {
    imports: UserImport[];
}

function getStatusConfig(status: string) {
    switch (status) {
        case 'completed':
            return {
                label: 'Completado',
                icon: CheckCircle2,
                variant: 'default' as const,
                className: 'bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
            };
        case 'processing':
            return {
                label: 'Procesando',
                icon: Loader2,
                variant: 'secondary' as const,
                className: 'animate-pulse',
                iconClassName: 'animate-spin',
            };
        case 'error':
            return {
                label: 'Error',
                icon: AlertCircle,
                variant: 'destructive' as const,
                className: '',
            };
        default:
            return {
                label: 'Pendiente',
                icon: Clock,
                variant: 'outline' as const,
                className: 'text-muted-foreground',
            };
    }
}

export function ImportHistoryList({ imports }: ImportHistoryListProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleDelete = (importId: string) => {
        startTransition(async () => {
            await deleteImport(importId);
            router.refresh();
        });
    };

    return (
        <div className="space-y-4">
            {imports.map((item) => {
                const statusConfig = getStatusConfig(item.status);
                const StatusIcon = statusConfig.icon;
                const importDate = new Date(item.imported_at);

                const formattedDate = importDate.toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                });

                const formattedTime = importDate.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                });

                return (
                    <Card
                        key={item.id}
                        className="group overflow-hidden transition-all hover:border-primary/50 hover:shadow-md dark:hover:border-primary/40 bg-card/50 backdrop-blur-sm"
                    >
                        <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                                {/* Left: File info */}
                                <div className="flex items-start gap-4 min-w-0 flex-1">
                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm group-hover:scale-105 transition-transform">
                                        <FileText className="size-6" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-lg tracking-tight truncate text-foreground">
                                                {item.filename}
                                            </p>
                                            <Badge variant={statusConfig.variant} className={cn("gap-1.5 ml-2 h-6 pl-1.5 pr-2.5", statusConfig.className)}>
                                                <StatusIcon className={cn("size-3.5", statusConfig.iconClassName)} />
                                                {statusConfig.label}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="size-3.5" />
                                                <span>{formattedDate}</span>
                                                <span className="text-muted-foreground/50">•</span>
                                                <span>{formattedTime}</span>
                                            </div>
                                        </div>

                                        <div className="pt-1 flex flex-wrap gap-2 text-xs">
                                            <Badge variant="secondary" className="gap-1.5 font-normal bg-secondary/50 hover:bg-secondary">
                                                <Film className="size-3.5 opacity-70" />
                                                {item.counts?.total ?? 0} películas
                                            </Badge>

                                            {(item.counts?.new ?? 0) > 0 && (
                                                <Badge variant="default" className="gap-1.5 bg-primary/90 hover:bg-primary font-medium">
                                                    +{item.counts.new} nuevas
                                                </Badge>
                                            )}
                                        </div>

                                        {item.not_found.length > 0 && (
                                            <details className="group/details pt-2">
                                                <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 [&::-webkit-details-marker]:hidden">
                                                    <SearchX className="size-3.5" />
                                                    {item.not_found.length} {item.not_found.length === 1 ? 'película no se pudo identificar' : 'películas no se pudieron identificar'}
                                                    <ChevronDown className="size-3.5 transition-transform group-open/details:rotate-180" />
                                                </summary>
                                                <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
                                                    {item.not_found.map((movie, index) => (
                                                        <li key={`${movie.title}-${index}`} className="flex justify-between gap-3">
                                                            <span className="truncate">
                                                                {movie.title}
                                                                {movie.year ? ` (${movie.year})` : ''}
                                                            </span>
                                                            <span className="shrink-0 text-muted-foreground/70">{movie.reason}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center sm:self-center pt-2 sm:pt-0 pl-16 sm:pl-0">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors gap-2"
                                                disabled={isPending}
                                            >
                                                <Trash2 className="size-4" />
                                                <span className="sr-only sm:not-sr-only sm:inline-block">Eliminar</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar esta importación?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Se eliminarán las películas que no estén en otras importaciones.
                                                    Esta acción no se puede deshacer.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(item.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
