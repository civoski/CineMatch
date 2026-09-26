"use client";

import Link from "next/link";
import { useTransition, useState, useEffect } from "react";
import { User, LogOut } from "lucide-react";

import { APP_ROUTES } from "@/config/routes";
import { SECONDARY_NAV_ITEMS } from "@/config/nav";
import { signout } from "@/features/auth/actions";
import { useAuth } from "@/lib/providers/auth-provider";
import { cn } from "@/lib/utils";

import { AppNav } from "./app-nav";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavbarVariant } from "./app-shell";

interface AppHeaderProps {
  variant?: NavbarVariant;
}

/**
 * AppHeader
 * Header con arquitectura de tres columnas:
 * Izquierda (Logo), Centro (Nav), Derecha (Acciones).
 * 
 * @param variant - "default" para navbar estándar, "cinematic" para navbar sobre backdrops, "cinematic-mobile-visible" para navbar visible en mobile y transparente en desktop
 */
export function AppHeader({ variant = "default" }: AppHeaderProps) {
  const { user, isLoading } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isScrolled, setIsScrolled] = useState(false);

  const isCinematic = variant === "cinematic";
  const isCinematicMobileVisible = variant === "cinematic-mobile-visible";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = () => {
    startTransition(async () => {
      await signout();
    });
  };

  return (
    <header className={cn(
      "fixed top-0 z-40 w-full transition-all duration-500",
      isCinematic
        ? "absolute border-none bg-transparent"
        : isScrolled
          ? "border-b border-border/5 bg-gradient-to-b from-background/60 via-background/40 to-background/20 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/0 shadow-sm"
          : "border-b border-border/5 bg-gradient-to-b from-background/40 via-background/20 to-transparent backdrop-blur-xl"
    )}>
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* SECCIÓN IZQUIERDA: Logo */}
        <div className="hidden flex-1 items-center justify-start">
          <Link
            href={APP_ROUTES.HOME}
            className={cn(
              "font-heading text-xl font-bold tracking-tight transition-opacity hover:opacity-80",
              isCinematic
                ? "text-white"
                : isCinematicMobileVisible
                  ? "text-foreground md:text-foreground"
                  : "text-foreground"
            )}
          >
            CineMatch
          </Link>
        </div>

        {/* SECCIÓN CENTRAL: Navegación (Solo Desktop) */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center">
          <AppNav variant={variant} />
        </div>

        {/* SECCIÓN DERECHA: Acciones y Perfil */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <ThemeToggle variant={isCinematic ? "cinematic" : "default"} />

          {isLoading ? (
            // Skeleton mientras carga el estado de autenticación
            <div
              className={cn(
                "size-9 rounded-full border animate-pulse",
                isCinematic
                  ? "border-white/30 bg-white/10"
                  : isCinematicMobileVisible
                    ? "border-border/40 md:border-border/40 bg-card/20 md:bg-card/20"
                    : "border-border/40 bg-card/20"
              )}
            />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative size-9 rounded-full border backdrop-blur-md shadow-sm transition-all duration-200",
                    isCinematic
                      ? "border-white/30 bg-white/10 hover:bg-white/20 text-white"
                      : "border-border/10 bg-card/10 hover:bg-card/20 text-foreground"
                  )}
                >
                  <User className="size-4" />
                  <span className="sr-only">Menú de usuario</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 p-2"
                sideOffset={8}
              >
                <DropdownMenuItem asChild>
                  <Link
                    href={APP_ROUTES.PROFILE.replace(":username", user.id)}
                    className="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
                  >
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="size-5" />
                    </div>
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium leading-none">Perfil</p>
                      <p className="text-xs text-muted-foreground truncate w-[140px]">
                        {user.email}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2" />

                {/* Secondary Navigation Items */}
                {SECONDARY_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className="flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-muted"
                      >
                        <Icon className="size-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleSignOut();
                  }}
                  disabled={isPending}
                >
                  <LogOut className="mr-2 size-4" />
                  <span>{isPending ? "Cerrando..." : "Cerrar Sesión"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href={APP_ROUTES.LOGIN}>
              <Button size="sm" className="h-8 px-4">
                Iniciar Sesión
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
