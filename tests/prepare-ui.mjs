// Disposable local fixture for manual browser checks. Never creates a hosted account.
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import {
  admin,
  checked,
  createClient,
  url,
  publicKey,
} from "../scripts/db.mjs";
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(url))
  throw new Error("Local only");
const path = new URL("../.artifacts/ui-account.json", import.meta.url);
if (process.argv.includes("--cleanup")) {
  const account = JSON.parse(await readFile(path, "utf8"));
  checked(await admin.auth.admin.deleteUser(account.id));
  console.log("Compte de test visuel supprimé.");
} else {
  const email = `ui-${randomUUID()}@example.invalid`;
  const password = `Local-${randomUUID()}!`;
  const invitation = checked(
    await admin.auth.admin.generateLink({ type: "invite", email }),
  );
  const client = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  checked(
    await client.auth.verifyOtp({
      token_hash: invitation.properties.hashed_token,
      type: "invite",
    }),
  );
  checked(await client.auth.updateUser({ password }));
  checked(
    await client
      .from("profiles")
      .update({
        username: `test_${invitation.user.id.slice(0, 8)}`,
        display_name: "Écoutes de test",
      })
      .eq("id", invitation.user.id),
  );
  await mkdir(new URL("../.artifacts/", import.meta.url), { recursive: true });
  await writeFile(
    path,
    JSON.stringify({ id: invitation.user.id, email, password }),
  );
  console.log(
    "Compte éphémère préparé dans .artifacts/ui-account.json (exclu de Git).",
  );
  await client.auth.signOut();
}
