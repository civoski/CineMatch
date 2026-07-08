"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface RankingRangeControlProps {
  /** Etiqueta del control, ej. "Cantidad a mostrar" */
  label: string;
  /** Valor actual (en tiempo real; el debounce lo maneja el padre) */
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Texto que precede al valor mostrado, ej. "Top " o "★ " */
  valuePrefix?: string;
  /** Etiqueta accesible base para slider, input y botones */
  ariaLabel?: string;
}

/**
 * Control numérico compacto (slider + input + botones -/+) usado en la página
 * de rankings. El padre es dueño del valor y del debounce; este componente solo
 * refleja el valor y emite `onChange` con el número ya acotado al rango.
 */
export function RankingRangeControl({
  label,
  value,
  min,
  max,
  onChange,
  valuePrefix = "",
  ariaLabel = label,
}: RankingRangeControlProps) {
  // Texto del input mientras el usuario escribe (puede quedar temporalmente
  // fuera de rango hasta el blur).
  const [inputStr, setInputStr] = React.useState(String(value));

  // Sincronizar el input si el valor cambia desde afuera.
  React.useEffect(() => {
    setInputStr(String(value));
  }, [value]);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const applyValue = (v: number) => {
    const safe = clamp(v);
    onChange(safe);
    setInputStr(String(safe));
  };

  const handleSlider = (val: number[]) => applyValue(val[0]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputStr(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputStr, 10);
    if (!isNaN(parsed)) {
      applyValue(parsed);
    } else {
      setInputStr(String(value));
    }
  };

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
  };

  const step = (delta: number) => applyValue(value + delta);

  return (
    <div className="flex flex-col gap-2 min-w-[220px] max-w-[280px] w-full sm:w-auto">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground tabular-nums">
          {valuePrefix}
          {value}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-md border-border/40"
          onClick={() => step(-1)}
          disabled={value <= min}
          aria-label={`Reducir ${ariaLabel}`}
        >
          <Minus className="h-3 w-3" />
        </Button>

        <Slider
          min={min}
          max={max}
          step={1}
          value={[value]}
          onValueChange={handleSlider}
          className="flex-1"
          aria-label={ariaLabel}
        />

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-md border-border/40"
          onClick={() => step(1)}
          disabled={value >= max}
          aria-label={`Aumentar ${ariaLabel}`}
        >
          <Plus className="h-3 w-3" />
        </Button>

        <input
          type="number"
          min={min}
          max={max}
          value={inputStr}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKey}
          className="h-7 w-12 shrink-0 rounded-md border border-border/40 bg-card/10 text-center text-xs font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={ariaLabel}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/60 px-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
