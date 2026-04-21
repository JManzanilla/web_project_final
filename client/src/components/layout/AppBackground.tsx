import React from "react";

export const AppBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div
      className="absolute inset-0 bg-cover bg-center scale-110"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1519861155730-0b5fbf0dd889?q=80&w=2071')",
        filter: "blur(8px) brightness(0.3)",
      }}
    />
    <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/60 to-black" />
  </div>
);
