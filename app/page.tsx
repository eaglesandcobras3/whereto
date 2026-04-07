import { Suspense } from "react";
import { HomePage } from "@/components/home/HomePage";

export default function Home() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-background" aria-hidden />}
    >
      <HomePage />
    </Suspense>
  );
}
