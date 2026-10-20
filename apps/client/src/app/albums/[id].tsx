import { useCallback, useState } from "react";
import { View, Linking } from "react-native";
import { useLocalSearchParams, useFocusEffect, Link } from "expo-router";
import { db } from "@/lib/supabase";
import type { Album } from "@/lib/types";
import { useSession } from "@/providers/session";
import { Cover, Stars } from "@/components/album";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Loading, Notice, errorMessage } from "@/components/common";
import { AlbumReviews } from "@/components/reviews";

export default function AlbumPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [album, setAlbum] = useState<Album | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [listed, setListed] = useState(false);
  const [listened, setListened] = useState(false);
  const [listChoice, setListChoice] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    setRating(null);
    setListed(false);
    setListened(false);
    setListChoice(false);
    try {
      const result = await db()
        .from("albums")
        .select("*")
        .eq("id", id)
        .single();
      if (result.error)
        throw new Error(
          "Cet album est introuvable. Retrouvez-le depuis la recherche.",
        );
      setAlbum(result.data);
      if (session) {
        const [r, l, heard] = await Promise.all([
          db()
            .from("ratings")
            .select("value")
            .eq("user_id", session.user.id)
            .eq("album_id", id)
            .maybeSingle(),
          db()
            .from("listening_list")
            .select("album_id")
            .eq("user_id", session.user.id)
            .eq("album_id", id)
            .maybeSingle(),
          db()
            .from("listened_albums")
            .select("album_id")
            .eq("user_id", session.user.id)
            .eq("album_id", id)
            .maybeSingle(),
        ]);
        if (r.error || l.error || heard.error)
          throw new Error("Vos données n’ont pas pu être chargées.");
        setRating(r.data?.value ?? null);
        setListed(!!l.data);
        setListened(!!heard.data);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [id, session]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  async function changeRating(value: number | null) {
    if (!session || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result =
        value === null
          ? await db()
              .from("ratings")
              .delete()
              .eq("user_id", session.user.id)
              .eq("album_id", id)
              .select()
          : await db()
              .from("ratings")
              .upsert({ user_id: session.user.id, album_id: id, value })
              .select();
      if (result.error || !result.data?.length)
        throw new Error("La note n’a pas pu être enregistrée.");
      setRating(value);
      setMessage(
        value === null
          ? "Votre note a été retirée."
          : "Votre note est enregistrée.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  async function toggleList() {
    if (!session || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = listed
        ? await db()
            .from("listening_list")
            .delete()
            .eq("user_id", session.user.id)
            .eq("album_id", id)
            .select()
        : await db()
            .from("listening_list")
            .insert({ user_id: session.user.id, album_id: id })
            .select();
      if (result.error || !result.data?.length)
        throw new Error("La liste n’a pas pu être modifiée.");
      setListed(!listed);
      setListChoice(false);
      setMessage(
        listed
          ? "Album retiré de votre liste."
          : "Album ajouté à votre liste privée.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  async function toggleListened() {
    if (!session || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = listened
        ? await db()
            .from("listened_albums")
            .delete()
            .eq("user_id", session.user.id)
            .eq("album_id", id)
            .select()
        : await db()
            .from("listened_albums")
            .insert({ user_id: session.user.id, album_id: id })
            .select();
      if (result.error || !result.data?.length)
        throw new Error("Le statut d’écoute n’a pas pu être enregistré.");
      setListened(!listened);
      setListChoice(!listened && listed);
      setMessage(
        listened
          ? "Statut déjà écouté retiré. Vos notes et critiques sont conservées."
          : "Album marqué comme déjà écouté. Aucune date d’écoute n’est imposée.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  if (busy) return <Loading />;
  return (
    <View className="gap-5">
      <Notice error message={error} />
      {!!error && (
        <Button variant="outline" onPress={load}>
          <Text>Recharger la fiche</Text>
        </Button>
      )}
      {album && (
        <View className="flex-col gap-8 md:flex-row md:gap-12">
          <View className="w-full max-w-72 self-center md:self-start">
            <Cover album={album} large />
          </View>
          <View className="flex-1 gap-7">
            <View className="gap-3">
              <View className="self-start">
                <Badge variant="secondary">
                  <Text>
                    {album.kind} · {album.release_date || "Date inconnue"}
                  </Text>
                </Badge>
              </View>
              <Text variant="h1" className="text-left">
                {album.title}
              </Text>
              <Text variant="lead">{album.artist}</Text>
            </View>
            {session ? (
              <View className="gap-6">
                <Button
                  variant={listened ? "secondary" : "outline"}
                  className="self-start"
                  disabled={saving || !!error}
                  onPress={toggleListened}
                  accessibilityState={{ selected: listened }}
                >
                  <Text>
                    {listened
                      ? "Déjà écouté · retirer le statut"
                      : "Marquer comme déjà écouté"}
                  </Text>
                </Button>
                <View className="gap-2">
                  <Text variant="h3">Votre note</Text>
                  <Stars
                    value={rating}
                    onChange={changeRating}
                    disabled={saving || !!error}
                  />
                </View>
                <Button
                  variant={listed ? "secondary" : "outline"}
                  className="self-start"
                  disabled={saving || !!error}
                  onPress={toggleList}
                >
                  <Text>
                    {listed
                      ? "Retirer de « À écouter »"
                      : "Ajouter à « À écouter »"}
                  </Text>
                </Button>
                {listChoice && (
                  <View className="gap-3 rounded-lg border border-border p-4">
                    <Text>
                      Vous l’avez écouté. Le garder dans votre liste « À écouter
                      » ?
                    </Text>
                    <View className="flex-row flex-wrap gap-3">
                      <Button
                        variant="outline"
                        disabled={saving}
                        onPress={() => setListChoice(false)}
                      >
                        <Text>Garder dans la liste</Text>
                      </Button>
                      <Button
                        variant="outline"
                        disabled={saving}
                        onPress={toggleList}
                      >
                        <Text>Retirer de la liste</Text>
                      </Button>
                    </View>
                  </View>
                )}
                <Notice message={message} />
              </View>
            ) : (
              <Link href="/connexion" asChild>
                <Button>
                  <Text>Se connecter pour noter cet album</Text>
                </Button>
              </Link>
            )}
            <View className="gap-2 border-t border-border pt-5">
              <Button
                variant="link"
                className="self-start"
                onPress={() =>
                  Linking.openURL(
                    `https://musicbrainz.org/release-group/${album.mbid}`,
                  )
                }
              >
                <Text>Voir la fiche MusicBrainz ↗</Text>
              </Button>
              <Text variant="muted">
                L’album regroupe ses différentes éditions. La note, les
                critiques et le statut d’écoute sont indépendants.
              </Text>
            </View>
          </View>
        </View>
      )}
      {album && session && (
        <AlbumReviews key={`${id}:${session.user.id}`} albumId={id} />
      )}
    </View>
  );
}
