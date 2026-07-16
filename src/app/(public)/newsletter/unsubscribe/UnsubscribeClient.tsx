"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import LegalPageShell from "@/components/legal/LegalPageShell";

export default function UnsubscribeClient() {
  const { language } = useLanguage();
  const hi = language === "hi";
  const params = useSearchParams();
  const token = params.get("token") || "";
  const invalidToken = !token;

  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    invalidToken ? "error" : "idle"
  );
  const [message, setMessage] = useState(
    invalidToken
      ? hi
        ? "अमान्य अनसब्सक्राइब लिंक।"
        : "Invalid unsubscribe link."
      : ""
  );

  useEffect(() => {
    if (invalidToken) return;
    let active = true;
    (async () => {
      await Promise.resolve();
      if (!active) return;
      setStatus("working");
      try {
        const res = await fetch("/api/newsletter/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!active) return;
        if (!res.ok || !data.ok) {
          setStatus("error");
          setMessage(data.error || (hi ? "अनसब्सक्राइब विफल।" : "Unsubscribe failed."));
          return;
        }
        setStatus("done");
        setMessage(
          hi
            ? "आपको न्यूज़लेटर से अनसब्सक्राइब कर दिया गया है।"
            : "You have been unsubscribed from the newsletter."
        );
      } catch {
        if (!active) return;
        setStatus("error");
        setMessage(hi ? "नेटवर्क त्रुटि।" : "Network error.");
      }
    })();
    return () => {
      active = false;
    };
  }, [token, hi, invalidToken]);

  return (
    <LegalPageShell
      title={hi ? "न्यूज़लेटर अनसब्सक्राइब" : "Unsubscribe"}
      updated={new Date().toISOString().slice(0, 10)}
    >
      <p>
        {status === "working" || status === "idle"
          ? hi
            ? "प्रोसेस हो रहा है…"
            : "Processing…"
          : message}
      </p>
      <p className="mt-6">
        <Link href="/" className="font-medium text-[#c41e20] hover:underline">
          {hi ? "होम पर जाएँ" : "Back to home"}
        </Link>
      </p>
    </LegalPageShell>
  );
}
