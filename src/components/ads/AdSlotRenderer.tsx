"use client";

import { useEffect, useState } from "react";
import { getActiveAdSlots } from "@/firebase/firestore";
import { AdSlot, AdLocation } from "@/types";
import { useSettings } from "@/contexts/SettingsContext";

interface AdSlotProps {
  location: AdLocation;
  className?: string;
}

export default function AdSlotRenderer({ location, className = "" }: AdSlotProps) {
  const { settings } = useSettings();
  const [slot, setSlot] = useState<AdSlot | null>(null);

  useEffect(() => {
    if (!settings.adsEnabled) return;
    getActiveAdSlots()
      .then((slots) => setSlot(slots.find((s) => s.location === location) || null))
      .catch(() => setSlot(null));
  }, [location, settings.adsEnabled]);

  if (!settings.adsEnabled || !slot) return null;

  if (slot.code) {
    return (
      <div
        className={`ad-slot ad-slot-${location} ${className}`}
        dangerouslySetInnerHTML={{ __html: slot.code }}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-400 ${className}`}>
      Ad: {slot.name} ({location})
    </div>
  );
}
