// Navigation configuration
import {
  Home,
  Upload,
  BarChart3,
  Sparkles,
  User,
  Library,
  History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { APP_ROUTES, SECONDARY_ROUTES } from "./routes";

export interface NavItem {
  label: string;
  mobileLabel?: string; // Label corto para mobile tabs
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

// Navegación primaria (flujo principal CineMatch)
export const APP_NAV_ITEMS: NavItem[] = [
  {
    label: "Inicio",
    mobileLabel: "Inicio",
    href: APP_ROUTES.HOME,
    icon: Home,
  },
  {
    label: "Subir",
    mobileLabel: "Subir",
    href: APP_ROUTES.UPLOAD,
    icon: Upload,
  },
  {
    label: "Análisis",
    mobileLabel: "Análisis",
    href: APP_ROUTES.ANALYSIS,
    icon: BarChart3,
  },
  {
    label: "Recomendaciones",
    mobileLabel: "Recos",
    href: APP_ROUTES.RECOMMENDATIONS,
    icon: Sparkles,
    disabled: true,
  },
  {
    label: "Mi Lista",
    mobileLabel: "Libreria",
    href: SECONDARY_ROUTES.LIBRARY,
    icon: Library,
  },
  {
    label: "Perfil",
    mobileLabel: "Perfil",
    href: APP_ROUTES.PROFILE,
    icon: User,
  },
];

// Navegación secundaria (features adicionales)
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    label: "Historial",
    href: SECONDARY_ROUTES.IMPORTS,
    icon: History,
  },
];
