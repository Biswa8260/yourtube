import React, { Suspense } from "react";
import { PlaySquare } from "lucide-react";
import Videogrid from "@/components/Videogrid";

export default function Subscriptions() {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <PlaySquare className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold">Subscriptions</h1>
        </div>
        <p className="text-gray-600 mb-6">Latest videos from channels you subscribe to.</p>
        <Suspense fallback={<div>Loading videos...</div>}>
          <Videogrid />
        </Suspense>
      </div>
    </main>
  );
}
