import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${BRAND.name}.`,
  alternates: { canonical: `${getSiteUrl()}/terms` },
};

const CONTACT_EMAIL = "rajawatrolly@gmail.com";
const UPDATED = "July 11, 2026";

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" updated={UPDATED}>
      <p>
        By accessing <a href={getSiteUrl()}>{getSiteUrl()}</a>, you agree to these Terms of Service for{" "}
        <strong>{BRAND.name}</strong>.
      </p>

      <h2>1. Service</h2>
      <p>
        {BRAND.name} provides bilingual news content, articles, and related digital services. Content is for general
        information and may be updated without notice.
      </p>

      <h2>2. Acceptable Use</h2>
      <ul>
        <li>Do not misuse the site, attempt unauthorized access, or disrupt services</li>
        <li>Do not republish content without permission where copyright applies</li>
        <li>Admin accounts must be used only by authorized staff</li>
      </ul>

      <h2>3. Accounts</h2>
      <p>
        Administrators and editors are responsible for safeguarding login credentials. Social platform connections
        (Facebook, Telegram) may only be authorized by designated Super Admins.
      </p>

      <h2>4. Content Accuracy</h2>
      <p>
        We strive for accurate reporting but do not guarantee completeness. Automated and AI-assisted content is
        reviewed before publication where configured.
      </p>

      <h2>5. Third-Party Services</h2>
      <p>
        Our site may link to or integrate with third parties (Facebook, Telegram, Firebase, etc.). Their terms and
        policies apply to those services.
      </p>

      <h2>6. Limitation of Liability</h2>
      <p>
        {BRAND.name} is provided &quot;as is&quot; to the extent permitted by law. We are not liable for indirect or
        consequential damages arising from use of the site.
      </p>

      <h2>7. Changes</h2>
      <p>We may update these terms. Continued use after updates means you accept the revised terms.</p>

      <h2>8. Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalPageShell>
  );
}
