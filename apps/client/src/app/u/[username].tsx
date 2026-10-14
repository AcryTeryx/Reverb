import { useCallback, useState } from "react";
import { View } from "react-native";
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pencil } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useSession } from "@/providers/session";
import { db } from "@/lib/supabase";
import type { Profile, Rating } from "@/lib/types";
import { AlbumGrid } from "@/components/album";
import { Loading, Notice, Empty } from "@/components/common";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
export default function PublicProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { session } = useSession();
  const { colorScheme } = useColorScheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(24);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setBusy(true);
        setError("");
        try {
          const p = await db()
            .from("profiles")
            .select("*")
            .eq("username", username)
            .maybeSingle();
          if (p.error) throw p.error;
          const r = p.data
            ? await db()
                .from("ratings")
                .select("*, albums(*)")
                .eq("user_id", p.data.id)
                .order("updated_at", { ascending: false })
                .limit(limit)
            : null;
          if (r?.error) throw r.error;
          if (active) {
            setProfile(p.data);
            setRatings((r?.data ?? []) as Rating[]);
          }
        } catch {
          if (active) setError("Le profil n’a pas pu être chargé.");
        } finally {
          if (active) setBusy(false);
        }
      }
      void load();
      return () => {
        active = false;
      };
    }, [username, limit]),
  );
  if (busy) return <Loading />;
  if (error) return <Notice error message={error} />;
  if (!profile)
    return (
      <Empty
        title="Ce profil n’est pas accessible."
        detail="Il est privé, indisponible ou n’existe pas."
      />
    );
  return (
    <View className="gap-6">
      <View className="gap-2 pb-8">
        {!!profile.display_name && (
          <Text variant="h1" className="text-left">
            {profile.display_name}
          </Text>
        )}
        <View className="flex-row items-center justify-between gap-4">
          <Text
            variant={profile.display_name ? "muted" : "h1"}
            className="flex-1 text-left"
          >
            @{profile.username}
          </Text>
          {session?.user.id === profile.id && (
            <Link href="/profil" asChild>
              <Button
                variant="outline"
                size="icon"
                accessibilityLabel="Modifier mon profil"
              >
                <Pencil
                  size={18}
                  color={colorScheme === "dark" ? "#e5ede7" : "#202c24"}
                />
              </Button>
            </Link>
          )}
        </View>
        <Text variant="muted">
          Profil{" "}
          {profile.visibility === "private"
            ? "privé · visible uniquement par vous"
            : "public"}
        </Text>
      </View>
      {!!profile.bio && <Text>{profile.bio}</Text>}
      <Text variant="h3">Albums notés</Text>
      {ratings.length ? (
        <AlbumGrid
          albums={ratings.map((row) => row.albums)}
          ratings={Object.fromEntries(
            ratings.map((row) => [row.album_id, row.value]),
          )}
        />
      ) : (
        <Empty
          title="Les premières notes arrivent."
          detail="Aucun album noté pour le moment."
        />
      )}
      {ratings.length === limit && (
        <Button variant="outline" onPress={() => setLimit(limit + 24)}>
          <Text>Afficher davantage</Text>
        </Button>
      )}
    </View>
  );
}
