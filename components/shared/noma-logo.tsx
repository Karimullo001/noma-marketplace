import React from "react";
import { APP_CONFIG } from "@/lib/config";

export function NomaLogo({
  subtitle = "Moda Marketpleysi",
  dark = false,
}: {
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {/* Original geometric woven-thread N emblem */}
      <svg
        width="38"
        height="38"
        viewBox="0 0 38 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect
          width="38"
          height="38"
          rx="11"
          fill={dark ? "#1A1820" : "#0F0E11"}
        />
        <path
          d="M11 27V11L19 20.5L27 11V27"
          stroke="#FAF8F5"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="11.5" r="2.4" fill="#7C3AED" />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={`text-xl font-black tracking-tight ${
            dark ? "text-white" : "text-primary"
          }`}
        >
          {APP_CONFIG.brandName}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent mt-0.5">
          {subtitle}
        </span>
      </div>
    </div>
  );
}
