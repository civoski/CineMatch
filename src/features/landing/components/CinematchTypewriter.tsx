"use client";

import TypewriterTitle from "@/components/kokonutui/type-writer";
import { cn } from "@/lib/utils/index";

interface CinematchTypewriterProps {
  className?: string;
}

export function CinematchTypewriter({ className }: CinematchTypewriterProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full cinematch-typewriter-wrapper font-cinematic",
        className
      )}
    >
      {/* Hidden H1 for SEO and accessibility */}
      <h1 className="sr-only">Cinematch - Descubra su cinefilia</h1>

      <div
        className="relative"
        aria-label="Cinematch"
        role="heading"
        aria-level={1}
      >
        <TypewriterTitle
          sequences={[{ text: "CineMatch", deleteAfter: true }]}
          typingSpeed={80}
          deleteSpeed={40}
          pauseBeforeDelete={3000}
          autoLoop={true}
          naturalVariance={true}
        />
      </div>
    </div>
  );
}
