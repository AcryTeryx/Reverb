import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import {
  admin,
  createClient,
  url,
  publicKey,
  checked,
} from "../../scripts/db.mjs";

if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(url))
  throw new Error("Tests autorisés uniquement sur Supabase local.");
const fresh = () =>
  createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const password = `Test-${randomUUID()}!`;
async function mailToken(email, type) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const inbox = await fetch("http://127.0.0.1:54324/api/v1/messages").then(
      (r) => r.json(),
    );
    const message = inbox.messages.find((m) =>
      m.To?.some((to) => to.Address === email),
    );
    if (message) {
      const detail = await fetch(
        `http://127.0.0.1:54324/api/v1/message/${message.ID}`,
      ).then((r) => r.json());
      const html = detail.HTML || detail.Text;
      const match = html.match(/token_hash=([^&"\s]+)/);
      if (match && html.includes(`type=${type}`)) return match[1];
    }
    await sleep(200);
  }
  throw new Error(`Email ${type} absent de la boîte locale.`);
}

test("invitation, authentication, RLS, privacy, suspension and account deletion", async (t) => {
  const users = [];
  let album;
  t.after(async () => {
    for (const uid of users) await admin.auth.admin.deleteUser(uid);
    if (album) await admin.from("albums").delete().eq("id", album.id);
  });
  const anon = fresh();
  await t.test("public signup is rejected by Auth itself", async () => {
    const attempt = await anon.auth.signUp({
      email: `blocked-${randomUUID()}@example.invalid`,
      password,
    });
    assert.ok(attempt.error);
    assert.equal(attempt.data.user, null);
  });
  async function invite() {
    const email = `qa-${randomUUID()}@example.invalid`;
    const invitation = checked(await admin.auth.admin.inviteUserByEmail(email));
    users.push(invitation.user.id);
    assert.equal(invitation.user.email_confirmed_at, undefined);
    const token_hash = await mailToken(email, "invite");
    const client = fresh();
    const accepted = checked(
      await client.auth.verifyOtp({ token_hash, type: "invite" }),
    );
    assert.ok(accepted.user.email_confirmed_at);
    checked(await client.auth.updateUser({ password }));
    const reused = await fresh().auth.verifyOtp({ token_hash, type: "invite" });
    assert.ok(reused.error, "invitation must be single-use");
    checked(await client.auth.signOut());
    const login = checked(
      await client.auth.signInWithPassword({ email, password }),
    );
    return {
      client,
      id: login.user.id,
      email,
      token: login.session.access_token,
    };
  }
  const a = await invite();
  const b = await invite();
  await t.test(
    "password recovery validates an emailed single-use link",
    async () => {
      checked(await fresh().auth.resetPasswordForEmail(b.email));
      const token_hash = await mailToken(b.email, "recovery");
      const recovered = fresh();
      checked(await recovered.auth.verifyOtp({ token_hash, type: "recovery" }));
      const nextPassword = `Recovered-${randomUUID()}!`;
      checked(await recovered.auth.updateUser({ password: nextPassword }));
      checked(await recovered.auth.signOut());
      assert.ok(
        (await fresh().auth.signInWithPassword({ email: b.email, password }))
          .error,
      );
      checked(
        await b.client.auth.signInWithPassword({
          email: b.email,
          password: nextPassword,
        }),
      );
      assert.ok(
        (await fresh().auth.verifyOtp({ token_hash, type: "recovery" })).error,
      );
    },
  );
  album = checked(
    await admin
      .from("albums")
      .insert({
        mbid: randomUUID(),
        title: "Album éphémère du test RLS",
        artist: "Compte de test",
        kind: "Album",
        source_url: "https://example.invalid/test",
      })
      .select()
      .single(),
  );
  await t.test(
    "a user cannot write the catalogue or elevate account access",
    async () => {
      assert.ok(
        (
          await a.client
            .from("albums")
            .insert({
              mbid: randomUUID(),
              title: "forged",
              artist: "forged",
              kind: "Album",
              source_url: "",
            })
        ).error,
      );
      assert.ok(
        (
          await a.client
            .from("account_access")
            .update({ status: "active" })
            .eq("user_id", b.id)
        ).error,
      );
      assert.ok((await a.client.rpc("reserve_catalog_slot")).error);
    },
  );
  await t.test(
    "owner rates, invalid values and forged ownership are rejected",
    async () => {
      checked(
        await a.client
          .from("ratings")
          .insert({ user_id: a.id, album_id: album.id, value: 5 }),
      );
      assert.ok(
        (
          await b.client
            .from("ratings")
            .insert({ user_id: a.id, album_id: album.id, value: 9 })
        ).error,
      );
      for (const value of [0, 11, 2.5])
        assert.ok(
          (await a.client.from("ratings").update({ value }).eq("user_id", a.id))
            .error,
        );
      const forged = checked(
        await b.client
          .from("ratings")
          .update({ value: 10 })
          .eq("user_id", a.id)
          .select(),
      );
      assert.equal(forged.length, 0);
      checked(
        await a.client
          .from("listening_list")
          .insert({ user_id: a.id, album_id: album.id }),
      );
      assert.equal(
        checked(
          await b.client.from("listening_list").select("*").eq("user_id", a.id),
        ).length,
        0,
      );
    },
  );
  await t.test(
    "public profiles expose notes; switching private immediately hides both",
    async () => {
      assert.equal(
        checked(await anon.from("ratings").select("*").eq("user_id", a.id))
          .length,
        1,
      );
      checked(
        await a.client
          .from("profiles")
          .update({ username: `qa_${a.id.slice(0, 8)}`, visibility: "private" })
          .eq("id", a.id),
      );
      for (const client of [anon, b.client]) {
        assert.equal(
          checked(await client.from("profiles").select("*").eq("id", a.id))
            .length,
          0,
        );
        assert.equal(
          checked(await client.from("ratings").select("*").eq("user_id", a.id))
            .length,
          0,
        );
      }
      assert.equal(
        checked(await a.client.from("ratings").select("*").eq("user_id", a.id))
          .length,
        1,
      );
    },
  );
  await t.test(
    "data survives a fresh login, and rating does not remove listening-list entry",
    async () => {
      checked(await a.client.auth.signOut());
      const login = checked(
        await a.client.auth.signInWithPassword({ email: a.email, password }),
      );
      a.token = login.session.access_token;
      assert.equal(
        checked(
          await a.client
            .from("ratings")
            .select("value")
            .eq("user_id", a.id)
            .single(),
        ).value,
        5,
      );
      assert.equal(
        checked(
          await a.client.from("listening_list").select("*").eq("user_id", a.id),
        ).length,
        1,
      );
    },
  );
  await t.test(
    "export contains only the current account with album references",
    async () => {
      const response = await fetch("http://127.0.0.1:8787/account/export", {
        headers: { Authorization: `Bearer ${a.token}` },
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.profile.id, a.id);
      assert.equal(data.ratings.length, 1);
      assert.equal(data.albums[0].id, album.id);
    },
  );
  await t.test(
    "suspension prevents writes even with an already issued token",
    async () => {
      checked(
        await admin
          .from("account_access")
          .update({ status: "suspended" })
          .eq("user_id", a.id),
      );
      assert.ok(
        (
          await a.client
            .from("ratings")
            .insert({ user_id: a.id, album_id: album.id, value: 6 })
        ).error,
      );
      assert.equal(
        checked(await a.client.from("profiles").select("*").eq("id", a.id))
          .length,
        0,
      );
      const response = await fetch("http://127.0.0.1:8787/account/export", {
        headers: { Authorization: `Bearer ${a.token}` },
      });
      assert.equal(response.status, 403);
      checked(
        await admin
          .from("account_access")
          .update({ status: "active" })
          .eq("user_id", a.id),
      );
    },
  );
  await t.test(
    "deletion requires password, deletes owned records and invalidates business access",
    async () => {
      const request = (pass) =>
        fetch("http://127.0.0.1:8787/account", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${a.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: pass, confirmation: "SUPPRIMER" }),
        });
      assert.equal((await request("wrong-password")).status, 403);
      assert.equal((await request(password)).status, 200);
      assert.equal(
        checked(await admin.from("profiles").select("*").eq("id", a.id)).length,
        0,
      );
      assert.equal(
        checked(await admin.from("ratings").select("*").eq("user_id", a.id))
          .length,
        0,
      );
      assert.equal(
        checked(
          await admin.from("listening_list").select("*").eq("user_id", a.id),
        ).length,
        0,
      );
      assert.ok(
        (
          await a.client
            .from("ratings")
            .insert({ user_id: a.id, album_id: album.id, value: 6 })
        ).error,
      );
    },
  );
});
