import React from "react";
import { AiStylistClient } from "@/components/xaridor/ai-stylist-client";

export const metadata = {
  title: "AI Stilist — NOMA Fashion Marketplace",
  description: "Sun'iy intellekt orqali o'zingizga mos zamonaviy kiyimlar to'plamini (look) yarating.",
};

export default function AiStylistPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <AiStylistClient />
      </div>
    </div>
  );
}
