import { Metadata } from "next";
import GeoNewsListPage from "@/components/location/GeoNewsListPage";

export const metadata: Metadata = {
  title: "भारत की ताजा खबरें | News Junction",
  description: "Latest India national news — politics, economy, sports and more.",
  alternates: { canonical: "/india" },
};

export default function IndiaNewsPage() {
  return (
    <GeoNewsListPage
      titleHi="देश की बड़ी खबरें"
      titleEn="Latest India News"
      breadcrumbs={[
        { href: "/", labelHi: "होम", labelEn: "Home" },
        { labelHi: "देश", labelEn: "India" },
      ]}
      query={{ type: "national", id: "IN" }}
    />
  );
}
