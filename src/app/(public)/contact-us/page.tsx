import type { Metadata } from "next";
import ContactPageView from "@/components/trust/ContactPageView";
import { getTrustConfigServer } from "@/lib/trust/server";
import { getSiteUrl } from "@/lib/seo";
import { BRAND } from "@/lib/constants";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact Us | संपर्क करें",
  description: `Contact ${BRAND.name} — general enquiries, editorial feedback, corrections, legal notices and advertising.`,
  alternates: { canonical: `${getSiteUrl()}/contact-us` },
  openGraph: {
    title: `Contact Us | ${BRAND.name}`,
    description: `Get in touch with ${BRAND.name} or report a correction.`,
    url: `${getSiteUrl()}/contact-us`,
    siteName: BRAND.name,
  },
};

export default async function ContactUsPage() {
  const config = await getTrustConfigServer();
  return <ContactPageView config={config} />;
}
