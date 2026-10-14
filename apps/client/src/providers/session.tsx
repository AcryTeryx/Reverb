import { createContext, useContext, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const Context = createContext<{ session: Session | null; loading: boolean }>({
  session: null,
  loading: true,
});
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const listener = AppState.addEventListener("change", (state) => {
      if (Platform.OS !== "web") {
        if (state === "active") supabase?.auth.startAutoRefresh();
        else supabase?.auth.stopAutoRefresh();
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      listener.remove();
    };
  }, []);
  return (
    <Context.Provider value={{ session, loading }}>{children}</Context.Provider>
  );
}
export const useSession = () => useContext(Context);
