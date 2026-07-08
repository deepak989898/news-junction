"use client";

import { Suspense } from "react";
import SearchPageContent from "./SearchContent";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <SearchPageContent />
    </Suspense>
  );
}
