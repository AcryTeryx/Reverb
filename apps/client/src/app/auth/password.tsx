import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import {
  Field,
  FieldGroup,
  Notice,
  PageTitle,
  RequireSession,
  errorMessage,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { db } from "@/lib/supabase";
export default function Password() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const { error } = await db().auth.updateUser({ password });
      if (error)
        throw new Error(
          "Le mot de passe n’a pas pu être changé. Choisissez un nouveau mot de passe ou demandez un nouveau lien.",
        );
      router.replace("/profil");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <RequireSession>
      <View className="mx-auto w-full max-w-md">
        <PageTitle
          title="Choisir un mot de passe"
          description="Utilisez au moins 12 caractères. Les gestionnaires de mots de passe sont les bienvenus."
        />
        <FieldGroup>
          <Field
            label="Nouveau mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <Field
            label="Confirmer le mot de passe"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoComplete="new-password"
          />
          <Notice error message={error} />
          <Button
            disabled={busy || password.length < 12 || password !== confirmation}
            onPress={save}
          >
            <Text>{busy ? "Enregistrement…" : "Enregistrer et continuer"}</Text>
          </Button>
        </FieldGroup>
      </View>
    </RequireSession>
  );
}
