import "../../global.css";
import { useEffect } from "react";
import { ScrollView, View, Platform } from "react-native";
import { Link, Slot, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SessionProvider, useSession } from "@/providers/session";
import { supabase } from "@/lib/supabase";
import { Notice } from "@/components/common";
import { SearchProvider } from "@/providers/search";

function Shell() {
  const path = usePathname();
  const { session } = useSession();
  const { colorScheme, setColorScheme } = useColorScheme();
  useEffect(() => {
    AsyncStorage.getItem("reverb-theme")
      .then((theme) => setColorScheme(theme === "dark" ? "dark" : "light"))
      .catch(() => setColorScheme("light"));
  }, [setColorScheme]);
  function toggleTheme() {
    const next = colorScheme === "dark" ? "light" : "dark";
    setColorScheme(next);
    void AsyncStorage.setItem("reverb-theme", next);
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View className="border-b border-border">
        <View className="mx-auto w-full max-w-6xl flex-row flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
          <Link href="/" accessibilityLabel="Reverb, bibliothèque">
            <Text className="text-2xl font-bold tracking-tight">
              reverb<Text className="text-primary">.</Text>
            </Text>
          </Link>
          <View className="flex-row items-center gap-1">
            <Button
              variant="ghost"
              onPress={toggleTheme}
              accessibilityLabel={
                colorScheme === "dark"
                  ? "Activer le thème clair"
                  : "Activer le thème sombre"
              }
            >
              <Text>{colorScheme === "dark" ? "Clair" : "Sombre"}</Text>
            </Button>
            {!session && (
              <Link href="/connexion" asChild>
                <Button variant="outline">
                  <Text>Connexion</Text>
                </Button>
              </Link>
            )}
          </View>
          <View
            className="w-full flex-row flex-wrap gap-1 md:w-auto"
            role={Platform.OS === "web" ? "navigation" : undefined}
          >
            {(
              [
                { label: "Bibliothèque", href: "/" },
                { label: "Recherche", href: "/recherche" },
                { label: "Journal", href: "/journal" },
                { label: "Mon profil", href: "/mon-profil" },
                { label: "Réglages", href: "/parametres" },
              ] as const
            ).map((item) => (
              <Link key={item.href} href={item.href} asChild>
                <Button
                  variant={path === item.href ? "secondary" : "ghost"}
                  accessibilityState={{ selected: path === item.href }}
                >
                  <Text>{item.label}</Text>
                </Button>
              </Link>
            ))}
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerClassName="grow"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-6xl flex-1 gap-6 px-5 py-8 md:px-8 md:py-12">
          {!supabase && (
            <Notice
              error
              message="Configuration locale manquante. Suivez le README pour connecter la base et activer les comptes."
            />
          )}
          <Slot />
        </View>
        <View className="mx-auto w-full max-w-6xl flex-row flex-wrap justify-between gap-4 border-t border-border px-5 py-6 md:px-8">
          <Text variant="muted">Reverb · V0.1.2 · version locale</Text>
          <Link href="/confidentialite">
            <Text variant="muted">Confidentialité et données</Text>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <SearchProvider>
          <Shell />
        </SearchProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
