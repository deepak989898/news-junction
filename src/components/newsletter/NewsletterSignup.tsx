"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  /** Compact footer style vs larger page style */
  variant?: "footer" | "card";
  source?: string;
};

export default function NewsletterSignup({ variant = "footer", source = "website" }: Props) {
  const { language } = useLanguage();
  const hi = language === "hi";
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, language, source, company }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || (hi ? "सब्सक्राइब नहीं हो सका।" : "Could not subscribe."));
        return;
      }
      setStatus("success");
      setMessage(
        data.message ||
          (hi ? "सफलतापूर्वक सब्सक्राइब हो गए।" : "Subscribed successfully.")
      );
      setEmail("");
    } catch {
      setStatus("error");
      setMessage(hi ? "नेटवर्क त्रुटि। फिर कोशिश करें।" : "Network error. Please try again.");
    }
  };

  const isFooter = variant === "footer";

  return (
    <div className={isFooter ? "" : "rounded-xl border border-gray-200 bg-white p-5 shadow-sm"}>
      <h4
        className={
          isFooter
            ? "mb-3 text-sm font-bold uppercase tracking-wider text-[#c41e20]"
            : "text-lg font-bold text-[#1a2b4c]"
        }
      >
        {hi ? "न्यूज़लेटर" : "Newsletter"}
      </h4>
      <p className={`mb-3 text-sm ${isFooter ? "text-gray-300" : "text-gray-600"}`}>
        {hi
          ? "ताज़ा खबरें सीधे अपने ईमेल पर पाएँ।"
          : "Get selected top stories in your inbox."}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`nl-email-${source}`}>
          Email
        </label>
        <input
          id={`nl-email-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={hi ? "आपका ईमेल" : "Your email"}
          className={
            isFooter
              ? "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-white/40 focus:outline-none"
              : "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a2b4c] focus:outline-none"
          }
        />
        {/* honeypot */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="shrink-0 rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a3181a] disabled:opacity-60"
        >
          {status === "sending"
            ? hi
              ? "भेज रहे हैं…"
              : "Sending…"
            : hi
              ? "सब्सक्राइब"
              : "Subscribe"}
        </button>
      </form>
      {message ? (
        <p
          className={`mt-2 text-xs ${
            status === "success"
              ? isFooter
                ? "text-green-300"
                : "text-green-700"
              : isFooter
                ? "text-red-300"
                : "text-red-600"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
