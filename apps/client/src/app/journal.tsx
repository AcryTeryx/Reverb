import { useCallback, useState } from "react";
import { View } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { db } from "@/lib/supabase";
import type { JournalEvent } from "@/lib/types";
import { useSession } from "@/providers/session";
import { formatDate } from "@/lib/dates";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  Empty,
  Loading,
  Notice,
  PageTitle,
  RequireSession,
} from "@/components/common";

function eventLabel(event: JournalEvent) {
  switch (event.kind) {
    case "rating_set":
      return `Note attribuée : ${(event.rating_value! / 2).toLocaleString("fr-FR")} / 5`;
    case "rating_removed":
      return "Note retirée";
    case "listened":
      return "Marqué comme déjà écouté";
    case "unlistened":
      return "Statut déjà écouté retiré";
    case "review_created":
      return "Critique publiée";
    case "review_updated":
      return "Critique modifiée";
  }
}
function Journal() {
  const { session } = useSession();
  const uid = session!.user.id;
  const [events, setEvents] = useState<JournalEvent[]>([]);
  const [limit, setLimit] = useState(25);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setBusy(true);
      setError("");
      db()
        .from("journal_events")
        .select("*, albums(*), reviews(body)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1)
        .then(({ data, error }) => {
          if (!active) return;
          if (error) setError("Le journal n’a pas pu être chargé. Réessayez.");
          else setEvents(data as JournalEvent[]);
          setBusy(false);
        });
      return () => {
        active = false;
      };
      // Retry is an explicit invalidation token for the same query after a failure.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid, limit, retry]),
  );
  return (
    <View className="gap-6">
      <PageTitle
        title="Votre journal musical"
        description="Vos notes, vos critiques, vos découvertes. Ce journal est visible uniquement par vous."
      />
      <Text variant="muted">
        Les dates sont celles de vos actions sur Reverb, pas des dates d’écoute.
        Les critiques affichent leur texte actuel.
      </Text>
      <Notice error message={error} />
      {!!error && (
        <Button variant="outline" onPress={() => setRetry(retry + 1)}>
          <Text>Recharger le journal</Text>
        </Button>
      )}
      {busy ? (
        <Loading />
      ) : (
        !error &&
        (events.length ? (
          events.slice(0, limit).map((event) => (
            <View
              key={event.id}
              className="max-w-3xl gap-3 border-b border-border pb-6"
            >
              <Text variant="muted">{formatDate(event.created_at)}</Text>
              <Text className="font-semibold">{eventLabel(event)}</Text>
              <Link
                href={{
                  pathname: "/albums/[id]",
                  params: { id: event.album_id },
                }}
              >
                <Text className="text-primary">
                  {event.albums.title} · {event.albums.artist}
                </Text>
              </Link>
              {!!event.reviews && (
                <Text numberOfLines={4} className="leading-7">
                  {event.reviews.body}
                </Text>
              )}
            </View>
          ))
        ) : (
          <Empty
            title="La première page vous attend."
            detail="Notez un album, écrivez une critique ou marquez-le comme déjà écouté pour commencer votre journal."
          />
        ))
      )}
      {events.length > limit && (
        <Button
          variant="outline"
          disabled={busy}
          onPress={() => setLimit(limit + 25)}
        >
          <Text>Voir les actions précédentes</Text>
        </Button>
      )}
    </View>
  );
}
export default function JournalPage() {
  return (
    <RequireSession>
      <Journal />
    </RequireSession>
  );
}
