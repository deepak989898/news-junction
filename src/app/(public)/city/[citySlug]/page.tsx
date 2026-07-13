import { Metadata } from "next";
import { notFound } from "next/navigation";
import GeoNewsListPage from "@/components/location/GeoNewsListPage";
import { getCityBySlug, getDistrictById, getStateById } from "@/lib/location/service";

type Props = { params: Promise<{ citySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { citySlug } = await params;
  const city = getCityBySlug(citySlug);
  if (!city) return { title: "City News" };
  const state = getStateById(city.stateId);
  return {
    title: `${city.nameHi} की आज की प्रमुख खबरें | News Junction`,
    description: `Today's top news from ${city.nameEn}${state ? `, ${state.nameEn}` : ""}.`,
    alternates: { canonical: `/city/${city.slug}` },
  };
}

export default async function CityPage({ params }: Props) {
  const { citySlug } = await params;
  const city = getCityBySlug(citySlug);
  if (!city) notFound();
  const state = getStateById(city.stateId);
  const district = getDistrictById(city.districtId);

  return (
    <GeoNewsListPage
      titleHi={`${city.nameHi} की आज की प्रमुख खबरें`}
      titleEn={`Today's Top ${city.nameEn} News`}
      breadcrumbs={[
        { href: "/", labelHi: "होम", labelEn: "Home" },
        ...(state
          ? [{ href: `/state/${state.slug}`, labelHi: state.nameHi, labelEn: state.nameEn }]
          : []),
        ...(district && state
          ? [
              {
                href: `/state/${state.slug}/district/${district.slug}`,
                labelHi: district.nameHi,
                labelEn: district.nameEn,
              },
            ]
          : []),
        { labelHi: city.nameHi, labelEn: city.nameEn },
      ]}
      query={{ type: "city", id: city.id }}
    />
  );
}
