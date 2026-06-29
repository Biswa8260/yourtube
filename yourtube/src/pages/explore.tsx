import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import React, { Suspense } from "react";
import { Compass } from "lucide-react";

export default function Explore() {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Compass className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold">Explore</h1>
        </div>
        <CategoryTabs />
        <Suspense fallback={<div>Loading videos...</div>}>
          <Videogrid />
        </Suspense>
      </div>
    </main>
  );
}
