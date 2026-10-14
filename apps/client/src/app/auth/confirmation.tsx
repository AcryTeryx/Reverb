import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { PageTitle, Notice, errorMessage } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { db } from "@/lib/supabase";
export default function Confirmation() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid =
    typeof params.token_hash === "string" &&
    (params.type === "invite" || params.type === "recovery");
  async function confirm() {
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await db().auth.verifyOtp({
        token_hash: params.token_hash!,
        type: params.type as "invite" | "recovery",
      });
      if (error)
        throw new Error(
          "Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien à l’administrateur ou utilisez la récupération du mot de passe.",
        );
      router.replace("/auth/password");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View className="mx-auto w-full max-w-md gap-5">
      <PageTitle
        title={
          params.type === "invite"
            ? "Bienvenue sur Reverb."
            : "Votre nouveau départ."
        }
        description="Confirmez ce lien personnel pour choisir votre mot de passe."
      />
      <Notice
        error
        message={
          !valid
            ? "Ce lien est incomplet. Ouvrez le lien présent dans votre email."
            : error
        }
      />
      <Button disabled={!valid || busy} onPress={confirm}>
        <Text>{busy ? "Vérification…" : "Continuer"}</Text>
      </Button>
    </View>
  );
}
