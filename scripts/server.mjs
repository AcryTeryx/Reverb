import { createServer } from "node:http";
import {
  admin,
  checked,
  createClient,
  url,
  publicKey,
  userClient,
} from "./db.mjs";
import { searchCatalog } from "./catalog.mjs";
const origin = process.env.APP_ORIGIN || "http://localhost:8081";
const buckets = new Map();
const cleanup = setInterval(() => {
  for (const [key, b] of buckets) if (b.until < Date.now()) buckets.delete(key);
}, 60000);
cleanup.unref();
async function body(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 8192) throw new Error("Requête trop volumineuse.");
  }
  return JSON.parse(text || "{}");
}
async function allRows(client, table, uid) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const page = checked(
      await client
        .from(table)
        .select("*")
        .eq("user_id", uid)
        .order("album_id")
        .range(offset, offset + 499),
    );
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.headers.origin && req.headers.origin !== origin) {
    res.writeHead(403);
    res.end("{}");
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const send = (status, data) => {
    res.writeHead(status);
    res.end(JSON.stringify(data));
  };
  try {
    const path = new URL(req.url, "http://localhost");
    if (path.pathname === "/health" && req.method === "GET")
      return send(200, { status: "ok", version: "0.1.1" });
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (!token) return send(401, { error: "Connectez-vous pour continuer." });
    const identity = await admin.auth.getUser(token);
    if (identity.error || !identity.data.user)
      return send(401, { error: "Votre session a expiré. Reconnectez-vous." });
    const user = identity.data.user;
    const access = checked(
      await admin
        .from("account_access")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle(),
    );
    if (access?.status !== "active")
      return send(403, { error: "L’accès à ce compte est suspendu." });
    const bucket = buckets.get(user.id) ?? {
      count: 0,
      until: Date.now() + 60000,
    };
    if (bucket.until < Date.now()) {
      bucket.count = 0;
      bucket.until = Date.now() + 60000;
    }
    buckets.set(user.id, bucket);
    if (++bucket.count > 30)
      return send(429, { error: "Trop de demandes. Patientez une minute." });
    if (path.pathname === "/catalog/search" && req.method === "GET") {
      return send(200, {
        albums: await searchCatalog(path.searchParams.get("q") ?? ""),
      });
    }
    if (path.pathname === "/account/export" && req.method === "GET") {
      const client = userClient(token);
      const [profile, ratings, listeningList] = await Promise.all([
        client
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(checked),
        allRows(client, "ratings", user.id),
        allRows(client, "listening_list", user.id),
      ]);
      const ids = [
        ...new Set([...ratings, ...listeningList].map((row) => row.album_id)),
      ];
      const albums = [];
      for (let i = 0; i < ids.length; i += 200)
        albums.push(
          ...checked(
            await client
              .from("albums")
              .select("*")
              .in("id", ids.slice(i, i + 200)),
          ),
        );
      return send(200, {
        version: "0.1.1",
        exported_at: new Date().toISOString(),
        email: user.email,
        profile,
        ratings,
        listening_list: listeningList,
        albums,
      });
    }
    if (path.pathname === "/account" && req.method === "DELETE") {
      const input = await body(req);
      if (
        input.confirmation !== "SUPPRIMER" ||
        typeof input.password !== "string"
      )
        return send(400, {
          error:
            "Confirmez la suppression avec votre mot de passe et le mot SUPPRIMER.",
        });
      const verifier = createClient(url, publicKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const verified = await verifier.auth.signInWithPassword({
        email: user.email,
        password: input.password,
      });
      if (verified.error || verified.data.user?.id !== user.id)
        return send(403, { error: "Le mot de passe est incorrect." });
      // Block business data first; this also protects against an already issued JWT.
      checked(
        await admin
          .from("account_access")
          .update({ status: "deleting" })
          .eq("user_id", user.id),
      );
      await verifier.auth.signOut({ scope: "global" });
      checked(await admin.auth.admin.deleteUser(user.id));
      return send(200, { deleted: true });
    }
    send(404, { error: "Cette ressource n’existe pas." });
  } catch (error) {
    // Never log requests, tokens, email addresses or credentials.
    const safe = ["Saisissez entre", "Le catalogue", "Requête trop"].some(
      (prefix) => error.message?.startsWith(prefix),
    );
    send(503, {
      error: safe
        ? error.message
        : "Le service est indisponible. Réessayez dans un instant.",
    });
  }
});
server.requestTimeout = 30000;
server.listen(8787, "127.0.0.1", () =>
  console.log("API Reverb locale : http://127.0.0.1:8787"),
);
