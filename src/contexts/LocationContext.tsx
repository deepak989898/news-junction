"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { UserPreferredLocation } from "@/lib/location/types";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "nj_preferred_location";

interface LocationContextValue {
  location: UserPreferredLocation | null;
  setLocation: (loc: UserPreferredLocation | null) => void;
  clearLocation: () => void;
  loaded: boolean;
}

const LocationContext = createContext<LocationContextValue>({
  location: null,
  setLocation: () => {},
  clearLocation: () => {},
  loaded: false,
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location, setLocationState] = useState<UserPreferredLocation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function hydrate() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setLocationState(JSON.parse(raw));
          return;
        }
        if (user) {
          const { getAuth } = await import("firebase/auth");
          const { getFirebaseApp } = await import("@/firebase/config");
          const current = getAuth(getFirebaseApp()).currentUser;
          if (current) {
            const token = await current.getIdToken();
            const res = await fetch("/api/personalization/preferences", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const prefs = await res.json();
              if (prefs.preferredLocation) {
                setLocationState(prefs.preferredLocation);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.preferredLocation));
              }
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    }
    hydrate();
  }, [user]);

  const setLocation = useCallback(
    async (loc: UserPreferredLocation | null) => {
      setLocationState(loc);
      if (loc) localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
      else localStorage.removeItem(STORAGE_KEY);

      if (user && loc) {
        try {
          const { getAuth } = await import("firebase/auth");
          const { getFirebaseApp } = await import("@/firebase/config");
          const current = getAuth(getFirebaseApp()).currentUser;
          if (current) {
            const token = await current.getIdToken();
            await fetch("/api/personalization/preferences", {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ preferredLocation: loc }),
            });
          }
        } catch {
          // non-blocking
        }
      }
    },
    [user]
  );

  const clearLocation = useCallback(() => {
    setLocation(null);
  }, [setLocation]);

  return (
    <LocationContext.Provider value={{ location, setLocation, clearLocation, loaded }}>
      {children}
    </LocationContext.Provider>
  );
}

export function usePreferredLocation() {
  return useContext(LocationContext);
}
