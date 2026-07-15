"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSettings } from "@/contexts/SettingsContext";
import SectionHeading from "@/components/ui/SectionHeading";
import { parseApiResponse } from "@/lib/api/parse-response";
import { CONTACT_CATEGORIES, type ContactCategory, type TrustConfig } from "@/lib/trust/types";

interface Props {
  config: TrustConfig;
}

const CHANNELS: { key: keyof TrustConfig; en: string; hi: string }[] = [
  { key: "generalEmail", en: "General enquiries", hi: "सामान्य पूछताछ" },
  { key: "editorialEmail", en: "Editorial enquiries", hi: "संपादकीय पूछताछ" },
  { key: "correctionsEmail", en: "Corrections", hi: "सुधार" },
  { key: "legalEmail", en: "Legal notices", hi: "कानूनी सूचनाएँ" },
  { key: "advertisingEmail", en: "Advertising", hi: "विज्ञापन" },
  { key: "partnershipEmail", en: "Partnerships", hi: "साझेदारी" },
  { key: "techSupportEmail", en: "Technical support", hi: "तकनीकी सहायता" },
  { key: "privacyEmail", en: "Privacy", hi: "गोपनीयता" },
];

export default function ContactPageView({ config }: Props) {
  const { language } = useLanguage();
  const { settings } = useSettings();
  const hi = language === "hi";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<ContactCategory>("general");
  const [subject, setSubject] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Prefill from query (?category=report-error&article=/article/xyz).
  // Deferred to a microtask so the mount effect doesn't setState synchronously.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const c = q.get("category");
    const a = q.get("article");
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      if (c && CONTACT_CATEGORIES.some((x) => x.value === c)) setCategory(c as ContactCategory);
      if (a) setArticleUrl(a);
    });
    return () => {
      active = false;
    };
  }, []);

  const emphasizeArticle = category === "report-error" || category === "correction";

  const channels = useMemo(() => CHANNELS.filter((c) => String(config[c.key] || "").trim()), [config]);
  const social = settings.socialLinks;
  const hasSocial = social.facebook || social.instagram || social.x || social.youtube;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg(hi ? "कृपया सभी आवश्यक फ़ील्ड भरें।" : "Please fill all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg(hi ? "कृपया एक वैध ईमेल दर्ज करें।" : "Please enter a valid email.");
      return;
    }
    if (!consent) {
      setErrorMsg(
        hi ? "कृपया आगे बढ़ने के लिए सहमति दें।" : "Please provide consent to proceed."
      );
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          category,
          subject: subject.trim(),
          articleUrl: articleUrl.trim(),
          message: message.trim(),
          language,
          company, // honeypot
        }),
      });
      const data = await parseApiResponse<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send");
      }
      setStatus("success");
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setArticleUrl("");
      setMessage("");
      setConsent(false);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : hi ? "भेजने में विफल।" : "Failed to send.");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-[#1a2b4c] focus:outline-none focus:ring-1 focus:ring-[#1a2b4c]";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="mb-3 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#1a2b4c]">
          {hi ? "होम" : "Home"}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{hi ? "संपर्क करें" : "Contact Us"}</span>
      </nav>

      <SectionHeading as="h1" size="text-2xl md:text-3xl">
        {hi ? "संपर्क करें" : "Contact Us"}
      </SectionHeading>
      <p className="mt-2 max-w-2xl text-gray-600">
        {hi
          ? "प्रश्न, प्रतिक्रिया या किसी लेख में सुधार का सुझाव देने के लिए हमसे संपर्क करें। हम आपके संदेश का यथाशीघ्र उत्तर देने का प्रयास करते हैं।"
          : "Reach out for questions, feedback, or to suggest a correction to an article. We aim to respond to your message as soon as we reasonably can."}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-5 shadow-sm md:p-6">
            {status === "success" ? (
              <div className="flex flex-col items-center rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="text-emerald-600" size={40} />
                <h2 className="mt-2 text-lg font-bold text-emerald-800">
                  {hi ? "संदेश भेज दिया गया!" : "Message sent!"}
                </h2>
                <p className="mt-1 text-sm text-emerald-700">
                  {hi
                    ? "धन्यवाद। हमें आपका संदेश मिल गया है और हम जल्द ही उत्तर देंगे।"
                    : "Thank you. We have received your message and will respond soon."}
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="mt-4 rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  {hi ? "एक और संदेश भेजें" : "Send another message"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {hi ? "पूरा नाम" : "Full name"} <span className="text-[#c41e20]">*</span>
                    </label>
                    <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {hi ? "ईमेल" : "Email"} <span className="text-[#c41e20]">*</span>
                    </label>
                    <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {hi ? "फ़ोन (वैकल्पिक)" : "Phone (optional)"}
                    </label>
                    <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {hi ? "श्रेणी" : "Category"} <span className="text-[#c41e20]">*</span>
                    </label>
                    <select
                      className={inputClass}
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ContactCategory)}
                    >
                      {CONTACT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {hi ? c.labelHi : c.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {hi ? "विषय" : "Subject"} <span className="text-[#c41e20]">*</span>
                  </label>
                  <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} required />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {hi ? "संबंधित लेख URL" : "Related article URL"}
                    {emphasizeArticle ? <span className="text-[#c41e20]"> *</span> : (hi ? " (वैकल्पिक)" : " (optional)")}
                  </label>
                  <input
                    className={inputClass}
                    value={articleUrl}
                    onChange={(e) => setArticleUrl(e.target.value)}
                    placeholder="https://news-junction.vercel.app/article/..."
                  />
                  {emphasizeArticle ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {hi
                        ? "कृपया वह लेख लिंक और बताएँ कि क्या गलत है, तथा यदि हो तो सहायक स्रोत भी दें।"
                        : "Please include the article link, what is incorrect, and a supporting source if available."}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {hi ? "संदेश" : "Message"} <span className="text-[#c41e20]">*</span>
                  </label>
                  <textarea
                    className={`${inputClass} min-h-[120px] resize-y`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                {/* Honeypot (hidden from humans) */}
                <div className="hidden" aria-hidden="true">
                  <label>
                    Company
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </label>
                </div>

                <label className="flex items-start gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    {hi
                      ? "मैं सहमत हूँ कि मेरे संदेश को इस पूछताछ के उत्तर के लिए संग्रहीत और उपयोग किया जा सकता है।"
                      : "I agree that my message may be stored and used to respond to this enquiry."}{" "}
                    <Link href="/privacy-policy" className="text-[#c41e20] underline">
                      {hi ? "गोपनीयता नीति" : "Privacy Policy"}
                    </Link>
                  </span>
                </label>

                {errorMsg ? (
                  <p className="flex items-center gap-1.5 text-sm text-[#c41e20]">
                    <AlertCircle size={14} /> {errorMsg}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="inline-flex items-center gap-2 rounded-full bg-[#c41e20] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                >
                  <Send size={15} />
                  {status === "sending"
                    ? hi ? "भेजा जा रहा है…" : "Sending…"
                    : hi ? "संदेश भेजें" : "Send message"}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Channels sidebar */}
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#c41e20]">
              {hi ? "संपर्क माध्यम" : "Contact Channels"}
            </h2>

            {channels.length ? (
              <dl className="mt-3 space-y-2.5">
                {channels.map((c) => (
                  <div key={c.key} className="flex items-start gap-2">
                    <Mail size={15} className="mt-0.5 shrink-0 text-[#1a2b4c]" />
                    <div>
                      <dt className="text-xs font-semibold text-gray-500">{hi ? c.hi : c.en}</dt>
                      <dd className="text-sm">
                        <a href={`mailto:${config[c.key]}`} className="text-[#1a2b4c] hover:text-[#c41e20]">
                          {String(config[c.key])}
                        </a>
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                {hi
                  ? "संपर्क ईमेल जल्द ही जोड़े जाएँगे। कृपया ऊपर दिए गए फ़ॉर्म का उपयोग करें।"
                  : "Contact emails will be added soon. Please use the form above."}
              </p>
            )}

            <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
              {config.phone ? (
                <p className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone size={15} className="text-[#1a2b4c]" /> {config.phone}
                </p>
              ) : null}
              {config.contactHours ? (
                <p className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock size={15} className="text-[#1a2b4c]" /> {config.contactHours}
                </p>
              ) : null}
              {config.postalAddress ? (
                <p className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-[#1a2b4c]" />
                  <span className="whitespace-pre-line">{config.postalAddress}</span>
                </p>
              ) : null}
            </div>

            {hasSocial ? (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  {hi ? "सोशल मीडिया" : "Social media"}
                </h3>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  {social.facebook && (
                    <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-[#1a2b4c] hover:text-[#c41e20]">Facebook</a>
                  )}
                  {social.instagram && (
                    <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-[#1a2b4c] hover:text-[#c41e20]">Instagram</a>
                  )}
                  {social.x && (
                    <a href={social.x} target="_blank" rel="noopener noreferrer" className="text-[#1a2b4c] hover:text-[#c41e20]">X</a>
                  )}
                  {social.youtube && (
                    <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="text-[#1a2b4c] hover:text-[#c41e20]">YouTube</a>
                  )}
                </div>
              </div>
            ) : null}

            <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
              {config.responseTimeNote
                ? config.responseTimeNote
                : hi
                  ? "हम आमतौर पर कुछ कार्यदिवसों में उत्तर देते हैं।"
                  : "We typically respond within a few business days."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
