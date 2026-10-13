import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Platform = {
  id: string;
  label: string;
  steps: string[];
  note?: string;
};

const PLATFORMS: Platform[] = [
  {
    id: "imdb",
    label: "IMDb",
    steps: [
      "Entrá a imdb.com e iniciá sesión.",
      "Abrí tu lista, tu Watchlist o tus calificaciones.",
      "En el menú ⋯ elegí \"Exportar\".",
      "Descargá el .csv desde la página \"Exportaciones\" de IMDb y subilo acá.",
    ],
  },
  {
    id: "tmdb",
    label: "TMDB",
    steps: [
      "Entrá a themoviedb.org e iniciá sesión.",
      "Abrí tu perfil → Calificaciones (o Watchlist / Favoritos) y elegí Películas.",
      "En el menú ⋯ junto al título elegí \"Export CSV\".",
      "Subí acá el .csv que se descarga.",
    ],
  },
  {
    id: "letterboxd",
    label: "Letterboxd",
    steps: [
      "Entrá a letterboxd.com desde la computadora e iniciá sesión.",
      "Andá a Ajustes → Datos (Settings → Data).",
      "Tocá \"Exportar tus datos\" y descargá el .zip.",
      "Subí el .zip tal cual: tomamos tus calificaciones (ratings.csv). También podés subir el ratings.csv suelto.",
    ],
    note: "Letterboxd no incluye códigos de película: identificamos cada una por título y año. Si alguna no se encuentra, la vas a ver en el historial de importaciones.",
  },
];

export function ExportInstructions() {
  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold">¿Cómo exporto mi lista?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Elegí la plataforma donde tenés tus películas.
          </p>
        </div>

        <Tabs defaultValue="imdb">
          <TabsList>
            {PLATFORMS.map((platform) => (
              <TabsTrigger key={platform.id} value={platform.id} className="px-3">
                {platform.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {PLATFORMS.map((platform) => (
            <TabsContent key={platform.id} value={platform.id} className="pt-2 space-y-3">
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-muted-foreground marker:text-primary">
                {platform.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {platform.note && (
                <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/40 pl-3">
                  {platform.note}
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
