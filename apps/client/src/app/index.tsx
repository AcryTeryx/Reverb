import { useCallback, useState } from "react";
import { View } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { db } from "@/lib/supabase";
import type { Rating, ListeningItem } from "@/lib/types";
import { useSession } from "@/providers/session";
import { AlbumGrid } from "@/components/album";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  Empty,
  Loading,
  Notice,
  PageTitle,
  RequireSession,
  errorMessage,
} from "@/components/common";

function Library() {
  const { session } = useSession();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [list, setList] = useState<ListeningItem[]>([]);
  const [listened, setListened] = useState<ListeningItem[]>([]);
  const [limit, setLimit] = useState(24);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const [r, l, heard] = await Promise.all([
        db()
          .from("ratings")
          .select("*, albums(*)")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false })
          .limit(limit),
        db()
          .from("listening_list")
          .select("*, albums(*)")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(limit),
        db()
          .from("listened_albums")
          .select("*, albums(*)")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .order("album_id")
          .limit(limit),
      ]);
      if (r.error || l.error || heard.error)
        throw new Error("La bibliothèque n’a pas pu être chargée.");
      setRatings(r.data as Rating[]);
      setList(l.data as ListeningItem[]);
      setListened(heard.data as ListeningItem[]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [session, limit]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return (
    <View className="gap-7">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <PageTitle
          title="Votre bibliothèque"
          description="Les albums qui restent. Ceux qui vous attendent."
        />
        <Link href="/recherche" asChild>
          <Button>
            <Text>Trouver un album</Text>
          </Button>
        </Link>
      </View>
      <Notice error message={error} />
      {!!error && (
        <Button variant="outline" onPress={load}>
          <Text>Réessayer</Text>
        </Button>
      )}
      {busy ? (
        <Loading />
      ) : (
        <>
          <View className="gap-5">
            <Text variant="h3">Vos dernières notes</Text>
            {ratings.length ? (
              <AlbumGrid
                albums={ratings.map((row) => row.albums)}
                ratings={Object.fromEntries(
                  ratings.map((row) => [row.album_id, row.value]),
                )}
              />
            ) : (
              <Empty
                title="La première note vous appartient."
                detail="Trouvez un album que vous connaissez et donnez-lui de 0,5 à 5 étoiles. Vos notes seront conservées dans votre compte."
              />
            )}
          </View>
          <View className="gap-5">
            <Text variant="h3">À écouter</Text>
            <Text variant="muted">
              Une liste privée, pour garder les prochaines découvertes à portée
              de main.
            </Text>
            {list.length ? (
              <AlbumGrid albums={list.map((row) => row.albums)} />
            ) : (
              <Empty
                title="Gardez une place pour la suite."
                detail="Ajoutez des albums depuis leur fiche. Donner une note ne les retire pas automatiquement de cette liste."
              />
            )}
          </View>
          <View className="gap-5">
            <Text variant="h3">Déjà écoutés</Text>
            {listened.length ? (
              <AlbumGrid albums={listened.map((row) => row.albums)} />
            ) : (
              <Empty
                title="Vos écoutes ont leur place ici."
                detail="Marquez un album comme déjà écouté depuis sa fiche, avec ou sans note."
              />
            )}
          </View>
          {(ratings.length === limit ||
            list.length === limit ||
            listened.length === limit) && (
            <Button variant="outline" onPress={() => setLimit(limit + 24)}>
              <Text>Afficher davantage</Text>
            </Button>
          )}
        </>
      )}
    </View>
  );
}
export default function LibraryPage() {
  return (
    <RequireSession>
      <Library />
    </RequireSession>
  );
}
