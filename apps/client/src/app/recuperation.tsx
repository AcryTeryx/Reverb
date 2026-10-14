import { useState } from "react";
import { View } from "react-native";
import {
  Field,
  FieldGroup,
  PageTitle,
  Notice,
  errorMessage,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { db } from "@/lib/supabase";
export default function Recovery() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await db().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "http://localhost:8081/auth/confirmation",
      });
      if (
        result.error &&
        (result.error.status === 429 ||
          !result.error.status ||
          result.error.status >= 500)
      )
        throw new Error(
          "L’envoi est momentanément indisponible. Patientez avant de réessayer.",
        );
      setMessage(
        "Si un compte correspond à cette adresse, vous recevrez un lien pour changer votre mot de passe.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View className="mx-auto w-full max-w-md">
      <PageTitle
        title="Mot de passe oublié"
        description="Recevez un lien personnel de récupération."
      />
      <FieldGroup>
        <Field
          label="Adresse email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Notice message={message} />
        <Notice error message={error} />
        <Button disabled={busy || !email.includes("@")} onPress={submit}>
          <Text>{busy ? "Envoi…" : "Recevoir le lien"}</Text>
        </Button>
      </FieldGroup>
    </View>
  );
}
