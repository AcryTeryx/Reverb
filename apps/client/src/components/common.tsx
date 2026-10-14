import { useId } from "react";
import { View, ActivityIndicator, type TextInputProps } from "react-native";
import { Link } from "expo-router";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useSession } from "@/providers/session";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const id = useId();
  return (
    <View className="gap-2">
      <Text nativeID={id} variant="small">
        {label}
      </Text>
      <Input accessibilityLabel={label} aria-labelledby={id} {...props} />
      {!!hint && <Text variant="muted">{hint}</Text>}
    </View>
  );
}
export function FieldGroup({ children }: { children: React.ReactNode }) {
  return <View className="gap-5">{children}</View>;
}
export function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  if (!message) return null;
  return (
    <View
      className="rounded-lg border border-border bg-muted p-4"
      role={error ? "alert" : "status"}
    >
      <Text className={cn(error && "text-destructive")}>{message}</Text>
    </View>
  );
}
export function Loading() {
  return (
    <View className="gap-4 py-12">
      <ActivityIndicator accessibilityLabel="Chargement" />
      <Text className="text-center" variant="muted">
        Un instant…
      </Text>
    </View>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <View className="gap-3 rounded-xl border border-dashed border-border p-8">
      <Text variant="h3">{title}</Text>
      <Text variant="muted">{detail}</Text>
    </View>
  );
}
export function PageTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View className="gap-2 pb-8">
      <Text variant="h1" className="text-left">
        {title}
      </Text>
      <Text variant="muted">{description}</Text>
    </View>
  );
}
export function RequireSession({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <Loading />;
  if (!session)
    return (
      <View className="gap-5">
        <Empty
          title="Votre musique vous attend."
          detail="Connectez-vous pour retrouver votre bibliothèque et vos notes. Reverb est actuellement accessible sur invitation."
        />
        <Link href="/connexion" asChild>
          <Button>
            <Text>Se connecter</Text>
          </Button>
        </Link>
      </View>
    );
  return <>{children}</>;
}
export function errorMessage(error: unknown) {
  if (error instanceof Error && /fetch|network|timeout/i.test(error.message))
    return "Connexion impossible. Vérifiez que les services locaux sont démarrés, puis réessayez.";
  return error instanceof Error
    ? error.message
    : "La modification n’a pas pu être enregistrée. Réessayez.";
}
