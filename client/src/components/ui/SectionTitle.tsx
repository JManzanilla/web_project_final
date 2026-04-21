import React from "react";

interface SectionTitleProps {
  whiteText: string;
  orangeText: string;
  className?: string;
  as?: "h1" | "h2";
}

export const SectionTitle = ({ whiteText, orangeText, className = "", as: Tag = "h2" }: SectionTitleProps) => (
  <Tag className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter uppercase mb-8 font-display flex flex-wrap items-baseline gap-x-3 ${className}`}>
    <span className="text-white">{whiteText}</span>
    <span className="text-brand-orange text-shadow-orange">
      {orangeText}
    </span>
  </Tag>
);
