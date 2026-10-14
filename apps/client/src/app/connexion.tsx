import { useState } from "react";
import { View } from "react-native";
import { Link, router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Field, FieldGroup, Notice, errorMessage } from "@/components/common";
import { db } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login() {
    setBusy(true);
    setError("");
    try {
      const result = await db().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (result.error)
        throw new Error(
          "Email ou mot de passe incorrect, ou compte indisponible.",
        );
      router.replace("/");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View className="mx-auto w-full max-w-md py-6">
      <Card>
        <CardHeader>
          <CardTitle>Retrouvez votre musique.</CardTitle>
          <CardDescription>
            Un album, une impression, une place dans votre bibliothèque.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field
              label="Adresse email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              onSubmitEditing={login}
            />
            <Notice error message={error} />
            <Button disabled={busy || !email || !password} onPress={login}>
              <Text>{busy ? "Connexion…" : "Se connecter"}</Text>
            </Button>
            <Link href="/recuperation">
              <Text className="text-primary">Mot de passe oublié ?</Text>
            </Link>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Text variant="muted">
            Les inscriptions sont sur invitation. Ouvrez le lien reçu par email
            pour créer votre mot de passe.
          </Text>
        </CardFooter>
      </Card>
    </View>
  );
}
