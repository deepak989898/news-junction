import { permanentRedirect } from "next/navigation";

// The canonical route is now /terms-and-conditions (editable from the admin
// Trust & Policies panel). Keep /terms working for existing links & bookmarks.
export default function TermsRedirectPage() {
  permanentRedirect("/terms-and-conditions");
}
