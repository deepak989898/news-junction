import { Metadata } from "next";
import { notFound } from "next/navigation";
import GeoNewsListPage from "@/components/location/GeoNewsListPage";
import { getDistrictBySlug, getStateBySlug } from "@/lib/location/service";

type Props = { params: Promise<{ stateSlug: string; districtSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stateSlug, districtSlug } = await params;
  const state = getStateBySlug(stateSlug);
  const district = state ? getDistrictBySlug(districtSlug, state.id) : undefined;
  if (!state || !district) return { title: "District News" };
  return {
    title: `${district.nameHi} जिले की स्थानीय खबरें | News Junction`,
    description: `Latest local news from ${district.nameEn} district, ${state.nameEn}.`,
    alternates: { canonical: `/state/${state.slug}/district/${district.slug}` },
  };
}

export default async function DistrictPage({ params }: Props) {
  const { stateSlug, districtSlug } = await params;
  const state = getStateBySlug(stateSlug);
  const district = state ? getDistrictBySlug(districtSlug, state.id) : undefined;
  if (!state || !district) notFound();

  return (
    <GeoNewsListPage
      titleHi={`${district.nameHi} जिले की स्थानीय खबरें`}
      titleEn={`Latest Local News from ${district.nameEn} District`}
      breadcrumbs={[
        { href: "/", labelHi: "होम", labelEn: "Home" },
        { href: `/state/${state.slug}`, labelHi: state.nameHi, labelEn: state.nameEn },
        { labelHi: district.nameHi, labelEn: district.nameEn },
      ]}
      query={{ type: "district", id: district.id }}
    />
  );
}
