import { useState } from "react";
import { Platform, Share, View } from "react-native";
import { Link, router } from "expo-router";
import { api, db } from "@/lib/supabase";
import { useSession } from "@/providers/session";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  Notice,
  PageTitle,
  RequireSession,
  errorMessage,
} from "@/components/common";
export default function Settings() {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  async function exportData() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = JSON.stringify(await api("/account/export"), null, 2);
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(
          new Blob([data], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "reverb-export.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else await Share.share({ message: data });
      setMessage(
        "Votre export a été préparé. Il contient votre profil, vos notes et votre liste privée.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const { error } = await db().auth.signOut();
      if (error) throw error;
      router.replace("/connexion");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount() {
    setBusy(true);
    setError("");
    try {
      await api("/account", {
        method: "DELETE",
        body: JSON.stringify({ password, confirmation }),
      });
      await db().auth.signOut({ scope: "local" });
      router.replace("/connexion");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  return (
    <RequireSession>
      <View className="max-w-2xl gap-6">
        <PageTitle
          title="Vos réglages"
          description="Votre compte, vos données, vos choix."
        />
        <Notice error message={error} />
        <Notice message={message} />
        <Card>
          <CardHeader>
            <CardTitle>Compte</CardTitle>
            <CardDescription>{session?.user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>
              Votre adresse email a été vérifiée lors de l’acceptation de
              l’invitation.
            </Text>
          </CardContent>
          <CardFooter className="flex-wrap gap-3">
            <Link href="/recuperation" asChild>
              <Button variant="outline">
                <Text>Changer mon mot de passe</Text>
              </Button>
            </Link>
            <Button variant="ghost" disabled={busy} onPress={logout}>
              <Text>Se déconnecter</Text>
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Emportez votre bibliothèque</CardTitle>
            <CardDescription>
              Téléchargez vos données au format JSON, avec les références des
              albums.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled={busy} onPress={exportData}>
              <Text>{busy ? "Un instant…" : "Exporter mes données"}</Text>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Supprimer mon compte</CardTitle>
            <CardDescription>
              Cette action supprime définitivement votre profil, vos notes et
              votre liste « À écouter ». Pensez à les exporter avant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!deleting ? (
              <Button
                variant="outline"
                disabled={busy}
                onPress={() => setDeleting(true)}
              >
                <Text>Préparer la suppression</Text>
              </Button>
            ) : (
              <FieldGroup>
                <Field
                  label="Mot de passe actuel"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="current-password"
                />
                <Field
                  label="Écrivez SUPPRIMER pour confirmer"
                  value={confirmation}
                  onChangeText={setConfirmation}
                  autoCapitalize="characters"
                />
                <Button
                  variant="destructive"
                  disabled={busy || confirmation !== "SUPPRIMER" || !password}
                  onPress={deleteAccount}
                >
                  <Text>
                    {busy
                      ? "Suppression…"
                      : "Supprimer définitivement mon compte"}
                  </Text>
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onPress={() => {
                    setDeleting(false);
                    setPassword("");
                    setConfirmation("");
                  }}
                >
                  <Text>Annuler</Text>
                </Button>
              </FieldGroup>
            )}
          </CardContent>
        </Card>
      </View>
    </RequireSession>
  );
}
