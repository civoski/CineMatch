import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex items-center justify-center p-4 min-h-[80vh]">
      <Card className="w-full max-w-md border-border bg-card/50 shadow-2xl backdrop-blur-xl">
        <CardHeader>
          <div className="mb-2 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl font-bold tracking-tight">
              Enlace inválido o expirado
            </CardTitle>
          </div>
          <CardDescription>
            No pudimos validar tu enlace. Puede que haya expirado, que ya se haya
            usado, o que el cliente de correo lo haya abierto previamente.
            Solicita uno nuevo e intenta de nuevo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Volver al inicio de sesión</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
