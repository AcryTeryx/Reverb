import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const storage =
  Platform.OS === "web"
    ? undefined
    : {
        getItem: (name: string) => SecureStore.getItemAsync(name),
        setItem: (name: string, value: string) =>
          SecureStore.setItemAsync(name, value),
        removeItem: (name: string) => SecureStore.deleteItemAsync(name),
      };
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export function db() {
  if (!supabase)
    throw new Error(
      "La configuration locale est manquante. Consultez le README.",
    );
  return supabase;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const {
    data: { session },
  } = await db().auth.getSession();
  if (!session) throw new Error("Connectez-vous pour continuer.");
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8787"}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      signal: AbortSignal.timeout(30000),
    },
  );
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Le service est indisponible.");
  return body as T;
}
