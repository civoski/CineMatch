"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { TrendingCarousel } from "./TrendingCarousel";
import { CinematchTypewriter } from "./CinematchTypewriter";
import { WavyBackground } from "@/components/ui/wavy-background";

export function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden">
      <WavyBackground
        colors={[
          "hsl(142 76% 36%)",
          "hsl(142 70% 45%)",
          "hsl(142 60% 55%)",
          "hsl(158 70% 40%)",
        ]}
        waveOpacity={0.3}
        blur={12}
        speed="fast"
        waveVerticalPosition={0.45}
        containerClassName="min-h-screen w-full flex flex-col"
        className="flex flex-col items-center"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 pt-10 pb-10 text-center sm:px-6 md:pt-14 lg:px-8">
          
          <div className="cinematch-typewriter-wrapper mb-4">
            <CinematchTypewriter />
          </div>

          <p className="mt-4 text-balance text-xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
            Un paseo por su cinefilia
          </p>

          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
            Revele conexiones y explore sus listas a través de una interfaz visual e intuitiva que transformará la forma en que descubre y analiza películas.
          </p>

          <div className="mt-8">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-6 py-2 text-xs font-semibold uppercase tracking-widest text-primary shadow-sm backdrop-blur-md dark:border-white/20 dark:bg-white/10 dark:text-foreground/90 sm:text-sm">
              Importe su lista desde IMDb y descubra su cinefilia
            </span>
          </div>

          <div className="mt-10 flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
            <Button
              size="lg"
              className="w-full gap-2 px-8 text-base font-semibold sm:w-auto md:h-12 md:text-lg shadow-lg shadow-primary/20"
              asChild
            >
              <Link href="/explore">
                <Play className="fill-current size-4" />
                Explorar Películas
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2 border-primary/30 px-8 text-base font-semibold text-primary hover:bg-primary/5 hover:text-foreground sm:w-auto md:h-12 md:text-lg"
              asChild
            >
              <Link href="/demo">
                Ver Demo
                <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="w-full mt-auto pb-12 md:pb-20">
          <TrendingCarousel />
        </div>
      </WavyBackground>
    </section>
  );
}
