"use client";

import { useState } from "react";
import UrlProcessor from "@/components/UrlProcessor";
import ReviewTable from "@/components/ReviewTable";

interface AnalysisData {
  title: string;
  stats: {
    label: string;
    value: string | number;
    trend?: "up" | "down" | "neutral";
  }[];
}

export default function HomeClient() {
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);

  const handleAnalysisComplete = (analysisData: AnalysisData) => {
    console.log("Analysis completed:", analysisData);
    setAnalyses((prev) => [...prev, analysisData]);
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-0">
      <div className="h-full flex flex-col items-center justify-center min-h-[200px] md:min-h-[400px] w-full md:w-[calc(50%-0.5px)] my-4 p-4">
        <h2 className="text-xl font-semibold mb-4">Video URL Input</h2>
        <UrlProcessor onAnalysisComplete={handleAnalysisComplete} />
      </div>
      {/* separator - horizontal on mobile, vertical on desktop */}
      <div className="h-1 md:h-full w-full md:w-1 bg-gray-600"></div>
      <div className="h-full flex flex-col items-center justify-start min-h-[200px] md:min-h-[400px] w-full md:w-[calc(50%-0.5px)] my-4 p-4">
        <ReviewTable analyses={analyses} />
      </div>
    </div>
  );
}
