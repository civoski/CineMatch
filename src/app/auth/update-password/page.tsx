"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updatePassword } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  // null = comprobando, true = hay sesión de recuperación, false = enlace inválido/expirado
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);

  // El callback ya intercambió el código por una sesión de recuperación antes
  // de llegar aquí. Si no hay sesión, el enlace era inválido o expiró.
  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    if (formData.get("password") !== formData.get("confirm_password")) {
      toast.error("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    try {
      const result = await updatePassword(formData);
      // updatePassword hace redirect('/app') en caso de éxito (lanza NEXT_REDIRECT)
      if (result?.error) {
        toast.error(result.error);
      }
    } catch (error: any) {
      if (error?.digest?.includes("NEXT_REDIRECT")) {
        toast.success("Contraseña actualizada");
        return;
      }
      toast.error("Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 min-h-[80vh]">
      <Card className="w-full max-w-md border-border bg-card/50 shadow-2xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Nueva contraseña
          </CardTitle>
          <CardDescription>
            Introduce y confirma tu nueva contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession === false ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                El enlace de recuperación es inválido o ha expirado. Solicita
                uno nuevo desde la pantalla de inicio de sesión.
              </p>
              <Button className="w-full" onClick={() => router.push("/login")}>
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    minLength={6}
                    required
                    disabled={hasSession === null}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    minLength={6}
                    required
                    disabled={hasSession === null}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={isLoading || hasSession === null}
              >
                {isLoading || hasSession === null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Actualizar contraseña"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
