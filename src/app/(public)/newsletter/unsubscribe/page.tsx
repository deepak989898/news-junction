import { Suspense } from "react";
import type { Metadata } from "next";
import UnsubscribeClient from "./UnsubscribeClient";

export const metadata: Metadata = {
  title: "Unsubscribe | News Junction",
  robots: { index: false, follow: false },
};

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-8 text-gray-500">Loading…</div>}>
      <UnsubscribeClient />
    </Suspense>
  );
}
