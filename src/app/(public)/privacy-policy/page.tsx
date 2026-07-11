import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${BRAND.name} website and connected services.`,
  alternates: { canonical: `${getSiteUrl()}/privacy-policy` },
};

const CONTACT_EMAIL = "rajawatrolly@gmail.com";
const UPDATED = "July 11, 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy explains how <strong>{BRAND.name}</strong> (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
        collects, uses, and protects information when you use our website at{" "}
        <a href={getSiteUrl()}>{getSiteUrl()}</a> and related services, including Facebook Page
        connection for social publishing by authorized administrators.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> When admins or users sign in, we may store name, email, and
          authentication identifiers through Firebase Authentication.
        </li>
        <li>
          <strong>Usage data:</strong> Pages visited, articles read, language preference, and basic analytics to
          improve the news experience.
        </li>
        <li>
          <strong>Social connection data (admins only):</strong> When a Super Admin connects Facebook or Telegram for
          publishing, we store encrypted access tokens and connected account metadata (page name, page ID, bot username).
          We do not collect Facebook passwords.
        </li>
        <li>
          <strong>Content you submit:</strong> Comments, newsletter sign-ups, or contact messages you voluntarily provide.
        </li>
      </ul>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>Publish and display news articles in Hindi and English</li>
        <li>Authenticate administrators and editors</li>
        <li>Post approved news content to connected Facebook Pages and Telegram channels</li>
        <li>Improve site performance, security, and personalization</li>
        <li>Respond to support and legal requests</li>
      </ul>

      <h2>3. Facebook / Meta Integration</h2>
      <p>
        If you are an authorized administrator and choose to connect Facebook, we use Meta&apos;s official OAuth login.
        We receive only the permissions you approve (such as managing posts on Pages you administer). Tokens are stored
        encrypted on our server and are used solely to publish content you approve from the admin panel.
      </p>
      <p>
        We do not sell Facebook user data. For Meta&apos;s own practices, see{" "}
        <a href="https://www.facebook.com/policy.php" target="_blank" rel="noopener noreferrer">
          Meta Privacy Policy
        </a>
        .
      </p>

      <h2>4. Data Sharing</h2>
      <p>We do not sell personal data. We may share data only with:</p>
      <ul>
        <li>Service providers (hosting, Firebase, Vercel) needed to operate the site</li>
        <li>Social platforms when you explicitly schedule or publish approved content</li>
        <li>Authorities when required by applicable law</li>
      </ul>

      <h2>5. Data Retention</h2>
      <p>
        We retain account and publishing logs only as long as needed for operations, security, and legal compliance.
        You may request deletion as described on our{" "}
        <a href="/user-data-deletion">User Data Deletion</a> page.
      </p>

      <h2>6. Security</h2>
      <p>
        Social access tokens are encrypted at rest. Admin routes require authenticated Firebase sessions. We use HTTPS
        in production.
      </p>

      <h2>7. Your Rights</h2>
      <p>Depending on your location, you may request access, correction, or deletion of your personal data by contacting us.</p>

      <h2>8. Contact</h2>
      <p>
        For privacy questions or data requests, email:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalPageShell>
  );
}
