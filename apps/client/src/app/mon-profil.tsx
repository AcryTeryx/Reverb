import { useCallback, useState } from "react";
import { Redirect, useFocusEffect } from "expo-router";
import { db } from "@/lib/supabase";
import { useSession } from "@/providers/session";
import { Loading, Notice, RequireSession } from "@/components/common";

function Destination() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [result, setResult] = useState<{ username: string | null } | null>(
    null,
  );
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setResult(null);
      setError("");
      async function load() {
        try {
          const { data, error } = await db()
            .from("profiles")
            .select("username")
            .eq("id", userId)
            .single();
          if (error) throw error;
          if (active) setResult(data);
        } catch {
          if (active)
            setError(
              "Le profil est indisponible. Réessayez en ouvrant Mon profil.",
            );
        }
      }
      void load();
      return () => {
        active = false;
      };
    }, [userId]),
  );
  if (error) return <Notice error message={error} />;
  if (!result) return <Loading />;
  return (
    <Redirect
      href={
        result.username
          ? { pathname: "/u/[username]", params: { username: result.username } }
          : "/profil"
      }
    />
  );
}

export default function MyProfile() {
  return (
    <RequireSession>
      <Destination />
    </RequireSession>
  );
}
