import { createContext, useContext, useEffect, useState } from "react";
import { isOnline } from "@/services/connectivity/network";

const NetworkContext = createContext({ online: true });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      const v = await isOnline();
      if (mounted) setOnline(v);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return <NetworkContext.Provider value={{ online }}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  return useContext(NetworkContext);
}
