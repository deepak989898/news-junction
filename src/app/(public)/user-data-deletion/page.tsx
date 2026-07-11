import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "User Data Deletion",
  description: `How to request deletion of your data from ${BRAND.name}.`,
  alternates: { canonical: `${getSiteUrl()}/user-data-deletion` },
};

const CONTACT_EMAIL = "rajawatrolly@gmail.com";
const UPDATED = "July 11, 2026";

export default function UserDataDeletionPage() {
  return (
    <LegalPageShell title="User Data Deletion Instructions" updated={UPDATED}>
      <p>
        {BRAND.name} respects your right to control your personal data. This page explains how users and Facebook
        app users can request deletion of data associated with our services.
      </p>

      <h2>Who Can Use This Page</h2>
      <ul>
        <li>Registered users of {BRAND.name}</li>
        <li>Users who signed in with Facebook through our admin or app integrations</li>
        <li>Anyone who submitted personal information through our website</li>
      </ul>

      <h2>What We Can Delete</h2>
      <ul>
        <li>Your user account profile (name, email, preferences)</li>
        <li>Saved bookmarks, reading history, and personalization settings tied to your account</li>
        <li>Comments or form submissions linked to your account</li>
        <li>Encrypted social connection tokens if you were an administrator who connected Facebook/Telegram</li>
      </ul>

      <h2>How to Request Deletion</h2>
      <ol>
        <li>
          Send an email to{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=Data%20Deletion%20Request%20-%20News%20Junction`}>
            {CONTACT_EMAIL}
          </a>
        </li>
        <li>Use subject line: <strong>Data Deletion Request - News Junction</strong></li>
        <li>
          Include:
          <ul>
            <li>Your full name</li>
            <li>Email address used on {BRAND.name} or Facebook login</li>
            <li>Brief description of what you want deleted</li>
          </ul>
        </li>
        <li>We will verify ownership and respond within <strong>30 days</strong></li>
      </ol>

      <h2>Facebook Login Users</h2>
      <p>
        If you connected through Facebook and want your data removed from {BRAND.name}, email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will delete stored tokens and account records
        linked to your Facebook user ID where applicable.
      </p>
      <p>
        You can also remove {BRAND.name}&apos;s access from your Facebook account: Facebook Settings → Security and
        Login → Apps and Websites → remove <strong>News Junction</strong>.
      </p>

      <h2>Data That May Be Retained</h2>
      <p>
        We may retain minimal records required for legal compliance, fraud prevention, or anonymized analytics that
        cannot identify you.
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <br />
        Website: <a href={getSiteUrl()}>{getSiteUrl()}</a>
      </p>
    </LegalPageShell>
  );
}
