import React from "react";
import { Step, STEPS } from "@/types/match.types";

export function StepBar({ current }: { current: Step }) {
  return (
    <div className="flex items-center mb-8 overflow-x-auto pb-1 scrollbar-none">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${
                i < current
                  ? "bg-brand-orange text-white"
                  : i === current
                    ? "bg-brand-orange text-white glow-orange"
                    : "bg-white/7 text-white/25 border border-white/10"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={`hidden sm:block text-[10px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors duration-300 ${
                i <= current ? "text-brand-orange" : "text-white/20"
              }`}
            >
              {label}
            </span>
            {i === current && (
              <span className="sm:hidden text-[9px] font-bold uppercase tracking-wide text-brand-orange whitespace-nowrap">
                {label}
              </span>
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-px mx-1.5 sm:mx-2 min-w-[8px] max-w-8 sm:max-w-10 transition-colors duration-300 ${
                i < current ? "bg-brand-orange" : "bg-white/8"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
