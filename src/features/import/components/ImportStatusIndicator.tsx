'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RefreshCw, BarChart3, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

type ImportState = 'idle' | 'processing' | 'calculating_stats' | 'completed';

// Hook para detectar si es móvil
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

/**
 * Toast flotante con progreso de importación en tiempo real via Supabase Realtime.
 */
export function ImportStatusIndicator() {
  const [pendingCount, setPendingCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  // Películas que el worker no pudo procesar (p. ej. no encontradas en TMDB)
  const [failedCount, setFailedCount] = useState(0);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();

  const router = useRouter();

  // Función para refrescar la página actual
  const handleRefresh = useCallback(() => {
    router.refresh();
    setIsVisible(false);
    setImportState('idle');
    setFailedCount(0);
  }, [router]);

  // Función para navegar al análisis
  const handleNavigateToAnalysis = useCallback(() => {
    router.push('/app/analysis');
    router.refresh();
    setIsVisible(false);
    setImportState('idle');
    setFailedCount(0);
  }, [router]);

  // Función para ver qué películas no se pudieron identificar
  const handleNavigateToImports = useCallback(() => {
    router.push('/app/imports');
    router.refresh();
    setIsVisible(false);
    setImportState('idle');
    setFailedCount(0);
  }, [router]);

  // Auto-ocultar después de un tiempo si está completado
  useEffect(() => {
    if (importState === 'completed') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setImportState('idle');
        setFailedCount(0);
      }, 15000); // 15 segundos antes de auto-ocultar
      return () => clearTimeout(timer);
    }
  }, [importState]);

  useEffect(() => {
    let importChannel: ReturnType<ReturnType<typeof createClient>['channel']>;
    let profileChannel: ReturnType<ReturnType<typeof createClient>['channel']>;
    const supabase = createClient();

    const setupRealtime = async () => {
      // 1. Obtener usuario actual y perfil inicial
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener estado inicial de stats_status
      const { data: profile } = await supabase
        .from('profiles')
        .select('stats_status')
        .eq('id', user.id)
        .single();

      const currentStatus = profile?.stats_status;

      // 2. Obtener conteo inicial de items pendientes
      const { count } = await supabase
        .from('import_queue')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing']);

      if (count !== null && count > 0) {
        setPendingCount(count);
        setTotalCount(count);
        setIsVisible(true);
        setImportState('processing');
      } else if (currentStatus === 'calculating') {
        // Si no hay imports pero dice calculating, mostramos eso
        setIsVisible(true);
        setImportState('calculating_stats');
      }

      // 3. Suscribirse a cambios en import_queue
      importChannel = supabase
        .channel(`import-progress-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'import_queue', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setPendingCount(prev => {
                const newCount = prev + 1;
                setTotalCount(t => Math.max(t, newCount));
                if (newCount > 0) {
                  setIsVisible(true);
                  // Si llega un import, la prioridad es 'processing' aunque esté calculando stats previos
                  setImportState('processing');
                }
                return newCount;
              });
            }
            if (payload.eventType === 'DELETE') {
              setPendingCount(prev => Math.max(0, prev - 1));
            }
            if (payload.eventType === 'UPDATE') {
              // Un item fallido sale de la cola de pendientes pero no se borra.
              // No cortamos la importación: se informa al terminar.
              const newRecord = payload.new as { status?: string };
              if (newRecord.status === 'failed') {
                setPendingCount(prev => Math.max(0, prev - 1));
                setFailedCount(prev => prev + 1);
              }
            }
          }
        )
        .subscribe();

      // 4. Suscribirse a cambios en profiles (para stats_status)
      profileChannel = supabase
        .channel(`profile-stats-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            const newRecord = payload.new as { stats_status?: string };
            const oldRecord = payload.old as { stats_status?: string };

            // Simplificar lógica: Si el nuevo estado es 'idle', verificamos si estábamos calculando.
            // Usamos el 'callback form' de setState para tener el valor actual de importState
            if (newRecord.stats_status === 'idle') {
              setImportState(current => {
                if (current === 'calculating_stats') return 'completed';
                return current;
              });
            } else if (newRecord.stats_status === 'calculating') {
              // Si cambia a calculating, lo mostramos
              setIsVisible(true);
              setImportState('calculating_stats');
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (importChannel) supabase.removeChannel(importChannel);
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [router]);

  // Efecto para transiciones de estado
  useEffect(() => {
    // Si terminó la cola, pasamos a "calculando stats" (a menos que ya haya saltado a completed por el evento de profile)
    if (importState === 'processing' && pendingCount === 0) {
      setImportState('calculating_stats');
    }
  }, [importState, pendingCount]);

  // Polling de seguridad cada 5s por si se pierden eventos Realtime
  useEffect(() => {
    if (importState !== 'processing' && importState !== 'calculating_stats') return;

    const checkStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Verificar cola de importación
      if (importState === 'processing') {
        const { count } = await supabase
          .from('import_queue')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['pending', 'processing']);

        if (count !== null) {
          setPendingCount(count);
          // Si la cuenta llega a 0, el efecto de arriba cambiará el estado a calculating_stats
        }

        // Recuento exacto de fallidos de las importaciones en curso (corrige
        // eventos Realtime perdidos o una recarga de página a mitad de camino)
        const { data: activeImports } = await supabase
          .from('user_imports')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'processing');

        const activeIds = (activeImports ?? []).map(i => i.id);
        if (activeIds.length > 0) {
          const { count: failed } = await supabase
            .from('import_queue')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'failed')
            .in('payload->>import_id', activeIds);

          if (failed !== null) setFailedCount(failed);
        }
      }

      // 2. Verificar estado del perfil (rankings)
      const { data: profile } = await supabase
        .from('profiles')
        .select('stats_status')
        .eq('id', user.id)
        .single();

      if (profile?.stats_status === 'idle') {
        setImportState(current => {
          // Solo completamos si estábamos esperando algo
          if (current === 'calculating_stats' || (current === 'processing' && pendingCount === 0)) {
            return 'completed';
          }
          return current;
        });
      } else if (profile?.stats_status === 'calculating' && importState !== 'calculating_stats') {
        // Si por alguna razón nos desincronizamos y el backend ya está calculando
        setImportState('calculating_stats');
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [importState, pendingCount]);

  // No renderizar si no está visible
  if (!isVisible) return null;

  // Clases de posicionamiento según dispositivo
  const positionClasses = isMobile
    ? "fixed bottom-20 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)]"
    : "fixed bottom-4 right-4";

  // Estado: PROCESANDO IMPORTACIÓN
  if (importState === 'processing') {
    const progress = totalCount > 0 ? Math.round(((totalCount - pendingCount) / totalCount) * 100) : 0;
    return (
      <div className={cn(positionClasses, "bg-card border border-border px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5")}>
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        <div className="flex flex-col min-w-[180px]">
          <span className="font-semibold text-sm text-foreground">Importando películas...</span>
          <span className="text-xs text-muted-foreground">Faltan {pendingCount} de {totalCount} ({progress}%)</span>
          {failedCount > 0 && (
            <span className="text-xs text-amber-700 dark:text-amber-400">{failedCount} sin identificar</span>
          )}
          <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // Estado: CALCULANDO ESTADÍSTICAS (Nuevo estado intermedio)
  if (importState === 'calculating_stats') {
    return (
      <div className={cn(positionClasses, "bg-card border border-border px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5")}>
        <div className="animate-pulse h-5 w-5 rounded-full bg-primary/50" />
        <div className="flex flex-col min-w-[180px]">
          <span className="font-semibold text-sm text-foreground">Generando Rankings...</span>
          <span className="text-xs text-muted-foreground">Analizando tu colección de cine</span>
        </div>
      </div>
    );
  }

  // Estado: COMPLETADO (Solo cuando stats terminaron)
  if (importState === 'completed') {
    return (
      <div className={cn(positionClasses, "bg-card border border-green-500/30 px-4 py-4 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-5")}>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-green-500/10 p-1.5">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <span className="font-semibold text-sm text-foreground block">¡Rankings Listos!</span>
              <span className="text-xs text-muted-foreground">Importación y análisis completados.</span>
              {failedCount > 0 && (
                <span className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <SearchX className="h-3.5 w-3.5 shrink-0" />
                  {failedCount === 1 ? '1 película no se pudo identificar.' : `${failedCount} películas no se pudieron identificar.`}
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant="default" className="h-7 text-xs gap-1.5" onClick={handleNavigateToAnalysis}>
                <BarChart3 className="h-3.5 w-3.5" />
                Ver Rankings
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleRefresh}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refrescar
              </Button>
              {failedCount > 0 && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleNavigateToImports}>
                  Ver detalle
                </Button>
              )}
            </div>
          </div>
          <button onClick={() => { setIsVisible(false); setFailedCount(0); }} className="text-muted-foreground hover:text-foreground ml-2">×</button>
        </div>
      </div>
    );
  }

  return null;
}
