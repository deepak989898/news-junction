import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import { getSiteSettingsServer } from "@/lib/site-settings-server";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettingsServer();

  return (
    <>
      <GoogleAnalytics gaId={settings.googleAnalyticsId} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
