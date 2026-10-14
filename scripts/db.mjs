import { createRequire } from "node:module";
const require = createRequire(
  new URL("../apps/client/package.json", import.meta.url),
);
export const { createClient } = require("@supabase/supabase-js");
export const url = process.env.SUPABASE_URL;
export const publicKey = process.env.SUPABASE_ANON_KEY;
if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "Lancer scripts/configure-local.ps1 pour préparer .env.local.",
  );
export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
export function userClient(token) {
  return createClient(url, publicKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function checked(result) {
  if (result.error) throw result.error;
  return result.data;
}
