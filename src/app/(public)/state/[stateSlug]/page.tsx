import { Metadata } from "next";
import { notFound } from "next/navigation";
import GeoNewsListPage from "@/components/location/GeoNewsListPage";
import { getStateBySlug } from "@/lib/location/service";

type Props = { params: Promise<{ stateSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) return { title: "State News" };
  return {
    title: `${state.nameHi} की ताजा खबरें | News Junction`,
    description: `Latest ${state.nameEn} news — state updates, local headlines and regional stories.`,
    alternates: { canonical: `/state/${state.slug}` },
  };
}

export default async function StatePage({ params }: Props) {
  const { stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) notFound();

  return (
    <GeoNewsListPage
      titleHi={`${state.nameHi} की ताजा खबरें`}
      titleEn={`Latest ${state.nameEn} News`}
      breadcrumbs={[
        { href: "/", labelHi: "होम", labelEn: "Home" },
        { href: "/category/rajya", labelHi: "राज्य", labelEn: "State" },
        { labelHi: state.nameHi, labelEn: state.nameEn },
      ]}
      query={{ type: "state", id: state.id }}
    />
  );
}
