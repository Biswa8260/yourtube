import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import OTPVerificationModal from "@/components/OTPVerificationModal";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";

function AppContent({ Component, pageProps }: { Component: any; pageProps: any }) {
  const { theme } = useUser();

  return (
    <div className={`min-h-screen transition-colors duration-200 ${theme === "dark" ? "dark bg-[#0a0a0a] text-white" : "bg-white text-black"}`}>
      <title>Your-Tube Clone</title>
      <Header />
      <Toaster />
      <OTPVerificationModal />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-screen">
          <Component {...pageProps} />
        </main>
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <AppContent Component={Component} pageProps={pageProps} />
    </UserProvider>
  );
}
