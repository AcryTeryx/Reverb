import { admin, checked } from "./db.mjs";
const [action, value] = process.argv.slice(2);
if (action === "invite" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? "")) {
  checked(
    await admin.auth.admin.inviteUserByEmail(value, {
      redirectTo: "http://localhost:8081/auth/confirmation",
    }),
  );
  console.log(
    "Invitation créée. En local, ouvrir http://127.0.0.1:54324 (aucun email externe envoyé).",
  );
} else if (
  ["suspend", "restore"].includes(action) &&
  /^[\da-f-]{36}$/i.test(value ?? "")
) {
  checked(
    await admin
      .from("account_access")
      .update({ status: action === "suspend" ? "suspended" : "active" })
      .eq("user_id", value)
      .select()
      .single(),
  );
  if (action === "suspend")
    checked(
      await admin.auth.admin.updateUserById(value, { ban_duration: "876000h" }),
    );
  else
    checked(
      await admin.auth.admin.updateUserById(value, { ban_duration: "none" }),
    );
  console.log(
    "Accès mis à jour. Les permissions métier appliquent immédiatement ce statut.",
  );
} else if (action === "delete" && /^[\da-f-]{36}$/i.test(value ?? "")) {
  checked(
    await admin
      .from("account_access")
      .update({ status: "deleting" })
      .eq("user_id", value),
  );
  checked(await admin.auth.admin.deleteUser(value));
  console.log("Compte supprimé, y compris ses données personnelles.");
} else {
  console.error(
    "Usage : npm run admin -- invite email | suspend UUID | restore UUID | delete UUID",
  );
  process.exitCode = 1;
}
