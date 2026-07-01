"use client";

import { motion } from "framer-motion";
import Image from "@/components/CloudinaryImage";
import Link from "next/link";

interface AccordionMovieCardProps {
  id: string;
  title: string;
  year: number;
  posterUrl: string | null;
  director?: string;
  showDirector?: boolean;
  userRating?: number;
}

export function AccordionMovieCard({
  id,
  title,
  year,
  posterUrl,
  director,
  showDirector = true,
  userRating,
}: AccordionMovieCardProps) {
  return (
    <Link href={`/app/movies/${id}`} className="group relative flex flex-col block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-card/20 backdrop-blur-xl ring-1 ring-border/40 border-0 shadow-md shadow-black/10 transition-all duration-300 hover:bg-card/30 hover:ring-primary/30 hover:shadow-lg hover:shadow-black/15">
        {posterUrl ? (
          <motion.div
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full w-full"
          >
            <Image
              src={posterUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            />
          </motion.div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/50">
            <span className="text-xs text-muted-foreground">Sin poster</span>
          </div>
        )}
        {userRating && userRating > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded backdrop-blur-md bg-accent/10 text-[10px] font-bold text-accent ring-1 ring-accent/20 shadow-sm shadow-black/10">
            {userRating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="mt-2 space-y-0.5">
        <h4 className="line-clamp-2 text-xs font-medium leading-tight text-foreground [text-shadow:_0_1px_2px_rgb(0_0_0_/_8%)]">
          {title}
        </h4>
        <p className="text-xs text-muted-foreground">{year}</p>
        {showDirector && director && (
          <p className="text-xs text-muted-foreground/70">{director}</p>
        )}
      </div>
    </Link>
  );
}
