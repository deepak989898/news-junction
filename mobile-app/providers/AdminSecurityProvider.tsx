import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { getStorageItem, setStorageItem } from "@/services/storage/app-storage";
import { promptBiometric } from "@/services/security/biometric";
import { useAuth } from "@/hooks/useAuth";

type AdminSecurityContextValue = {
  biometricEnabled: boolean;
  locked: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  unlock: () => Promise<boolean>;
  lock: () => void;
};

const KEY = "nj_admin_biometric_enabled";

const Ctx = createContext<AdminSecurityContextValue>({
  biometricEnabled: false,
  locked: false,
  setBiometricEnabled: async () => {},
  unlock: async () => false,
  lock: () => {},
});

export function AdminSecurityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [biometricEnabled, setBiometric] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    getStorageItem(KEY).then((v) => {
      setBiometric(v === "true");
      setLocked(v === "true");
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && biometricEnabled && user) {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [biometricEnabled, user]);

  const value = useMemo<AdminSecurityContextValue>(
    () => ({
      biometricEnabled,
      locked,
      setBiometricEnabled: async (enabled) => {
        setBiometric(enabled);
        await setStorageItem(KEY, String(enabled));
        if (!enabled) setLocked(false);
      },
      unlock: async () => {
        if (!biometricEnabled) {
          setLocked(false);
          return true;
        }
        const result = await promptBiometric("Unlock admin area");
        setLocked(!result.success);
        return result.success;
      },
      lock: () => setLocked(true),
    }),
    [biometricEnabled, locked]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminSecurity() {
  return useContext(Ctx);
}
