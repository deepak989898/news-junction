"use client";

import { useMemo, useState } from "react";
import { MapPin, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreferredLocation } from "@/contexts/LocationContext";
import {
  getAllStates,
  getCitiesByState,
  getDistrictsByState,
  getStateById,
  getCityById,
  getDistrictById,
} from "@/lib/location/service";

export default function LocationSelector() {
  const { language } = useLanguage();
  const { location, setLocation, clearLocation } = usePreferredLocation();
  const [open, setOpen] = useState(false);
  const [stateId, setStateId] = useState(location?.stateId || "");
  const [districtId, setDistrictId] = useState(location?.districtId || "");
  const [cityId, setCityId] = useState(location?.cityId || "");

  const states = useMemo(() => getAllStates(), []);
  const districts = useMemo(() => (stateId ? getDistrictsByState(stateId) : []), [stateId]);
  const cities = useMemo(() => (stateId ? getCitiesByState(stateId) : []), [stateId]);

  const label = useMemo(() => {
    if (!location) {
      return language === "hi" ? "अपना क्षेत्र चुनें" : "Select your area";
    }
    const city = location.cityId ? getCityById(location.cityId) : null;
    const district = location.districtId ? getDistrictById(location.districtId) : null;
    const state = getStateById(location.stateId);
    if (city) return language === "hi" ? city.nameHi : city.nameEn;
    if (district) return language === "hi" ? district.nameHi : district.nameEn;
    if (state) return language === "hi" ? state.nameHi : state.nameEn;
    return language === "hi" ? "अपना क्षेत्र" : "Your area";
  }, [location, language]);

  const save = () => {
    if (!stateId) return;
    setLocation({
      stateId,
      districtId: districtId || undefined,
      cityId: cityId || undefined,
      selectedAt: new Date().toISOString(),
      source: "manual",
      preferredLanguage: language === "hi" ? "hi" : "en",
    });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex max-w-[160px] items-center gap-1.5 truncate rounded-lg border border-[#1a2b4c]/20 bg-[#1a2b4c]/5 px-2.5 py-1.5 text-xs font-medium text-[#1a2b4c] hover:bg-[#1a2b4c]/10 sm:max-w-[200px] sm:text-sm"
        title={label}
      >
        <MapPin size={14} className="shrink-0" />
        <span className="truncate">{label}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1a2b4c]">
                {language === "hi" ? "अपना क्षेत्र चुनें" : "Select your area"}
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  {language === "hi" ? "राज्य" : "State"} *
                </label>
                <select
                  value={stateId}
                  onChange={(e) => {
                    setStateId(e.target.value);
                    setDistrictId("");
                    setCityId("");
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">{language === "hi" ? "राज्य चुनें" : "Select state"}</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {language === "hi" ? s.nameHi : s.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {districts.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    {language === "hi" ? "जिला" : "District"}
                  </label>
                  <select
                    value={districtId}
                    onChange={(e) => {
                      setDistrictId(e.target.value);
                      setCityId("");
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="">{language === "hi" ? "वैकल्पिक" : "Optional"}</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {language === "hi" ? d.nameHi : d.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {cities.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    {language === "hi" ? "शहर" : "City"}
                  </label>
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="">{language === "hi" ? "वैकल्पिक" : "Optional"}</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === "hi" ? c.nameHi : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={save}
                disabled={!stateId}
                className="rounded-lg bg-[#1a2b4c] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {language === "hi" ? "सहेजें" : "Save"}
              </button>
              {location && (
                <button
                  onClick={() => {
                    clearLocation();
                    setStateId("");
                    setDistrictId("");
                    setCityId("");
                    setOpen(false);
                  }}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  {language === "hi" ? "हटाएं" : "Clear"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
