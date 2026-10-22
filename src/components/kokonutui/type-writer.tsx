
"use client";

import { useEffect, useState } from "react";

type TypewriterSequence = {
  text: string;
  deleteAfter?: boolean;
  pauseAfter?: number;
};

type TypewriterTitleProps = {
  sequences?: TypewriterSequence[];
  typingSpeed?: number;
  startDelay?: number;
  autoLoop?: boolean;
  loopDelay?: number;
  deleteSpeed?: number;
  pauseBeforeDelete?: number;
  naturalVariance?: boolean;
};

export default function TypewriterTitle({
  sequences = [{ text: "CINEMATCH", deleteAfter: false }],
  typingSpeed = 80,
  startDelay = 200,
}: TypewriterTitleProps) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    const text = sequences[0]?.text ?? "CINEMATCH";
    let index = 0;
    let timeout: ReturnType<typeof setTimeout>;

    setDisplayText("");

    const typeNextCharacter = () => {
      index += 1;
      setDisplayText(text.slice(0, index));

      if (index < text.length) {
        timeout = setTimeout(typeNextCharacter, typingSpeed);
      }
    };

    timeout = setTimeout(typeNextCharacter, startDelay);

    return () => clearTimeout(timeout);
  }, [sequences, typingSpeed, startDelay]);

  return (
    <div className="relative mx-auto w-full py-24">
      <div className="relative z-10 flex w-full justify-center text-center">
        <span
          className="inline-block whitespace-nowrap font-mono text-4xl tracking-tight text-black dark:text-white md:text-6xl"
          style={{ color: "black", WebkitTextFillColor: "currentColor" }}
        >
          {displayText}
        </span>
      </div>
    </div>
  );
}

