"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signup, resetPassword } from "../actions";
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
import { Tabs } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthTabs } from "./AuthTabs";
import { AuthSkeleton } from "./AuthSkeleton";

type AuthView = "login" | "register" | "forgot-password";

export function AuthCard() {
  const router = useRouter();
  const [view, setView] = React.useState<AuthView>("login");
  const [isLoading, setIsLoading] = React.useState(false);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);

  // Resetear el checkbox cuando se cambia de vista
  React.useEffect(() => {
    if (view !== "register") {
      setAcceptedTerms(false);
    }
  }, [view]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (view === "login") {
        // Login en el cliente: dispara onAuthStateChange al instante,
        // de modo que el header (AuthProvider) refleja la sesión sin retraso.
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.get("email") as string,
          password: formData.get("password") as string,
        });
        if (error) {
          toast.error("Credenciales inválidas");
          return;
        }
        router.refresh();
        router.push("/app");
        return;
      }

      let result;
      if (view === "register") {
        if (formData.get("password") !== formData.get("confirm_password")) {
          toast.error("Las contraseñas no coinciden");
          return;
        }
        result = await signup(formData);
      } else {
        result = await resetPassword(formData);
        if (result?.success) {
          toast.success(result.success);
          setView("login");
        }
      }
      if (result?.error) toast.error(result.error);
    } catch (error: any) {
      if (error?.digest?.includes("NEXT_REDIRECT")) return;
      toast.error("Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 min-h-[80vh]">
      <Card className="w-full max-w-md border-border bg-card/50 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out">
        <AnimatePresence mode="wait" initial={false}>
          {view === "forgot-password" ? (
            <motion.div
              key="forgot-password"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CardHeader>
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="mb-2 flex items-center text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Volver al inicio
                </button>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Recuperar contraseña
                </CardTitle>
                <CardDescription>
                  Introduce tu email para restablecer tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        name="email"
                        type="email"
                        placeholder="tu@email.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Enviar instrucciones"
                    )}
                  </Button>
                </form>
              </CardContent>
            </motion.div>
          ) : (
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as "login" | "register")}
            >
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-3xl font-bold tracking-tight mb-6 font-heading text-foreground">
                  CineMatch
                </CardTitle>
                <AuthTabs
                  value={view}
                  onValueChange={(v) => setView(v as "login" | "register")}
                />
              </CardHeader>

              <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {view === "register" && (
                        <motion.div
                          key="name-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden space-y-2"
                        >
                          <Label htmlFor="reg-name">Nombre completo</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="reg-name"
                              name="full_name"
                              placeholder="Juan Pérez"
                              className="pl-10"
                              required
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="tu@email.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Contraseña</Label>
                        {view === "login" && (
                          <button
                            type="button"
                            onClick={() => setView("forgot-password")}
                            className="text-xs text-primary hover:underline underline-offset-4"
                          >
                            ¿Olvidaste tu contraseña?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <AnimatePresence mode="popLayout" initial={false}>
                      {view === "register" && (
                        <motion.div
                          key="confirm-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden space-y-2"
                        >
                          <Label htmlFor="reg-confirm">
                            Confirmar Contraseña
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="reg-confirm"
                              name="confirm_password"
                              type="password"
                              placeholder="••••••••"
                              className="pl-10"
                              required
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {view === "register" && (
                        <motion.div
                          key="terms-checkbox"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id="terms-checkbox"
                              checked={acceptedTerms}
                              onCheckedChange={(checked) =>
                                setAcceptedTerms(checked === true)
                              }
                              className="mt-0.5 data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-accent-foreground"
                            />
                            <label
                              htmlFor="terms-checkbox"
                              className="text-xs text-muted-foreground leading-relaxed cursor-pointer flex-1"
                            >
                              Al continuar, aceptas nuestros{" "}
                              <Link
                                href="/terminos"
                                className="text-primary hover:underline underline-offset-4 font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                términos y condiciones
                              </Link>
                            </label>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button
                      type="submit"
                      className="w-full font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : view === "login" ? (
                        "Iniciar Sesión"
                      ) : (
                        "Crear Cuenta"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Tabs>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
