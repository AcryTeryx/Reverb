import { useCallback, useState } from "react";
import { View, Switch } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { db } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { useSession } from "@/providers/session";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  Loading,
  Notice,
  PageTitle,
  RequireSession,
  errorMessage,
} from "@/components/common";
function Editor() {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    if (!session) return;
    const result = await db()
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    if (result.error || !result.data)
      setError("Le profil est indisponible. Le compte peut être suspendu.");
    else {
      setProfile(result.data);
      setError("");
    }
  }, [session]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  async function save() {
    if (!profile) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await db()
        .from("profiles")
        .update({
          username: profile.username,
          display_name: profile.display_name.trim(),
          bio: profile.bio.trim(),
          visibility: profile.visibility,
        })
        .eq("id", profile.id)
        .select()
        .single();
      if (result.error)
        throw new Error(
          result.error.code === "23505"
            ? "Ce pseudo est déjà pris. Choisissez-en un autre."
            : "Le profil n’a pas pu être enregistré.",
        );
      setProfile(result.data);
      setMessage("Votre profil est enregistré.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View className="max-w-2xl gap-5">
      <PageTitle
        title="Modifier mon profil"
        description="Choisissez comment vous présenter et qui peut voir vos notes."
      />
      <Notice error message={error} />
      {!profile ? (
        error ? (
          <Button variant="outline" onPress={load}>
            <Text>Réessayer</Text>
          </Button>
        ) : (
          <Loading />
        )
      ) : (
        <FieldGroup>
          <View className="size-20 items-center justify-center rounded-full bg-accent">
            <Text className="text-3xl font-semibold">
              {(profile.display_name || profile.username || "R")
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>
          <Field
            label="Pseudo"
            hint="3 à 24 caractères : minuscules, chiffres ou tiret bas."
            value={profile.username ?? ""}
            onChangeText={(username) =>
              setProfile({ ...profile, username: username.toLowerCase() })
            }
            maxLength={24}
            autoCapitalize="none"
            autoComplete="username"
          />
          <Field
            label="Nom affiché"
            value={profile.display_name}
            onChangeText={(display_name) =>
              setProfile({ ...profile, display_name })
            }
            maxLength={60}
          />
          <Field
            label="Bio"
            value={profile.bio}
            onChangeText={(bio) => setProfile({ ...profile, bio })}
            maxLength={500}
            multiline
            style={{ minHeight: 100, textAlignVertical: "top" }}
          />
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-2">
              <Text>Profil privé</Text>
              <Text variant="muted">
                Seul vous pourrez voir votre profil et vos notes. Votre liste «
                À écouter » est toujours privée.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Profil privé"
              value={profile.visibility === "private"}
              onValueChange={(value) =>
                setProfile({
                  ...profile,
                  visibility: value ? "private" : "public",
                })
              }
              trackColor={{ true: "#43865d" }}
            />
          </View>
          <Notice message={message} />
          <Button
            disabled={busy || !/^[a-z0-9_]{3,24}$/.test(profile.username ?? "")}
            onPress={save}
          >
            <Text>{busy ? "Enregistrement…" : "Enregistrer le profil"}</Text>
          </Button>
          {!!profile.username && !!message && (
            <Link
              href={{
                pathname: "/u/[username]",
                params: { username: profile.username },
              }}
            >
              <Text className="text-primary">Voir mon profil ↗</Text>
            </Link>
          )}
          <Text variant="muted">
            Avatar personnalisé, bannière et Top 5 albums / morceaux sont prévus
            pour la V1.
          </Text>
        </FieldGroup>
      )}
    </View>
  );
}
export default function ProfilePage() {
  return (
    <RequireSession>
      <Editor />
    </RequireSession>
  );
}
