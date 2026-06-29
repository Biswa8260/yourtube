import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";

export default function Custom404() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 min-h-[70vh]">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-extrabold text-red-600">404</h1>
        <h2 className="text-2xl font-bold">This page isn't available.</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Sorry about that. Try searching for something else or return to the home page.
        </p>
        <div className="pt-4">
          <Link href="/">
            <Button className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-full">
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
