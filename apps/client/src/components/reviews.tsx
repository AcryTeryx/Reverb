import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { db } from "@/lib/supabase";
import { useSession } from "@/providers/session";
import type { Review } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Empty, Field, Loading, Notice } from "@/components/common";

export function ReviewText({
  review,
  showAlbum = false,
}: {
  review: Review;
  showAlbum?: boolean;
}) {
  return (
    <View className="gap-3">
      {showAlbum && review.albums && (
        <Link
          href={{ pathname: "/albums/[id]", params: { id: review.album_id } }}
        >
          <Text className="font-semibold text-primary">
            {review.albums.title} · {review.albums.artist}
          </Text>
        </Link>
      )}
      <Text variant="muted">
        {formatDate(review.created_at)}
        {review.updated_at !== review.created_at
          ? ` · modifiée le ${formatDate(review.updated_at)}`
          : ""}
      </Text>
      <Text className="leading-7">{review.body}</Text>
    </View>
  );
}

export function AlbumReviews({ albumId }: { albumId: string }) {
  const { session } = useSession();
  const uid = session?.user.id;
  const [rows, setRows] = useState<Review[]>([]);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const lock = useRef(false);
  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const result = await db()
      .from("reviews")
      .select("*")
      .eq("user_id", uid)
      .eq("album_id", albumId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);
    if (result.error)
      setError("Vos critiques n’ont pas pu être chargées. Réessayez.");
    else {
      setRows(result.data);
      setError("");
    }
    setLoading(false);
  }, [uid, albumId, limit]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function save() {
    if (!uid || lock.current || !body.trim() || body.trim().length > 5000)
      return;
    lock.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = editing
        ? await db()
            .from("reviews")
            .update({ body: body.trim() })
            .eq("id", editing.id)
            .eq("updated_at", editing.updated_at)
            .select()
            .maybeSingle()
        : await db()
            .from("reviews")
            .insert({ user_id: uid, album_id: albumId, body: body.trim() })
            .select()
            .single();
      if (result.error)
        throw new Error(
          "La critique n’a pas pu être enregistrée. Votre texte est conservé, vous pouvez réessayer.",
        );
      if (!result.data)
        throw new Error(
          "Cette critique a changé ou a été supprimée ailleurs. Copiez votre texte puis rechargez les critiques avant de reprendre la modification.",
        );
      setBody("");
      setEditing(null);
      setMessage(
        editing
          ? "Critique modifiée. Votre note reste inchangée."
          : "Critique publiée. Votre note reste inchangée.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await db().from("reviews").delete().eq("id", id).select();
      if (result.error || !result.data?.length)
        throw new Error(
          "La critique n’a pas pu être supprimée. Rechargez les critiques puis réessayez.",
        );
      if (editing?.id === id) {
        setEditing(null);
        setBody("");
      }
      setDeleting(null);
      setMessage("Critique supprimée. Votre note est conservée.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  if (!uid) return null;
  const editor = (
    <View className="max-w-3xl gap-3">
      <Field
        label={editing ? "Modifier votre critique" : "Nouvelle critique"}
        value={body}
        onChangeText={setBody}
        placeholder="Qu’est-ce qui vous reste de cet album ?"
        multiline
        maxLength={5000}
        editable={!saving}
        autoFocus={!!editing}
        style={{ minHeight: 150, textAlignVertical: "top" }}
      />
      <Text variant="muted">
        {body.length} / 5 000 caractères · Une note est facultative.
      </Text>
      <View className="flex-row flex-wrap gap-3">
        <Button disabled={saving || !body.trim()} onPress={save}>
          <Text>
            {saving
              ? "Enregistrement…"
              : editing
                ? "Enregistrer la modification"
                : "Publier la critique"}
          </Text>
        </Button>
        {editing && (
          <Button
            variant="outline"
            disabled={saving}
            onPress={() => {
              setEditing(null);
              setBody("");
            }}
          >
            <Text>Annuler la modification</Text>
          </Button>
        )}
      </View>
    </View>
  );
  return (
    <View className="gap-6 border-t border-border pt-8">
      <View className="gap-2">
        <Text variant="h2">Vos critiques</Text>
        <Text variant="muted">
          Une nouvelle critique garde les précédentes. Leur visibilité suit
          celle de votre profil.
        </Text>
      </View>
      {!editing && editor}
      <Notice error message={error} />
      <Notice message={message} />
      {!!error && (
        <Button variant="outline" disabled={saving} onPress={load}>
          <Text>Recharger les critiques</Text>
        </Button>
      )}
      {loading ? (
        <Loading />
      ) : rows.length ? (
        rows.slice(0, limit).map((review) => (
          <View
            key={review.id}
            className="max-w-3xl gap-4 border-t border-border pt-5"
          >
            {editing?.id === review.id ? (
              editor
            ) : (
              <ReviewText review={review} />
            )}
            {deleting === review.id ? (
              <View className="gap-3">
                <Text>
                  Supprimer cette critique et ses entrées dans votre journal ?
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  <Button
                    variant="destructive"
                    disabled={saving}
                    onPress={() => remove(review.id)}
                  >
                    <Text>Confirmer la suppression</Text>
                  </Button>
                  <Button
                    variant="outline"
                    disabled={saving}
                    onPress={() => setDeleting(null)}
                  >
                    <Text>Garder la critique</Text>
                  </Button>
                </View>
              </View>
            ) : editing?.id === review.id ? null : (
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  disabled={saving || !!body.trim()}
                  onPress={() => {
                    setEditing(review);
                    setBody(review.body);
                    setMessage("");
                  }}
                >
                  <Text>Modifier</Text>
                </Button>
                <Button
                  variant="ghost"
                  disabled={saving}
                  onPress={() => setDeleting(review.id)}
                >
                  <Text>Supprimer</Text>
                </Button>
              </View>
            )}
          </View>
        ))
      ) : (
        <Empty
          title="Votre première impression"
          detail="Vous pouvez écrire une critique sans noter l’album ni le marquer comme écouté."
        />
      )}
      {rows.length > limit && (
        <Button
          variant="outline"
          disabled={loading || saving}
          onPress={() => setLimit(limit + 10)}
        >
          <Text>Voir les critiques précédentes</Text>
        </Button>
      )}
    </View>
  );
}
