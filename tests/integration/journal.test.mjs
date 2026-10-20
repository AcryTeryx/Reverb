import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  admin,
  checked,
  createClient,
  url,
  publicKey,
} from "../../scripts/db.mjs";
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(url))
  throw new Error("Local only");
const fresh = () =>
  createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

test("reviews, listened status, journal privacy and export", async (t) => {
  const users = [];
  let album;
  t.after(async () => {
    for (const id of users) await admin.auth.admin.deleteUser(id);
    if (album) checked(await admin.from("albums").delete().eq("id", album.id));
  });
  async function account() {
    const invite = checked(
      await admin.auth.admin.generateLink({
        type: "invite",
        email: `journal-${randomUUID()}@example.invalid`,
      }),
    );
    users.push(invite.user.id);
    const client = fresh();
    const { session } = checked(
      await client.auth.verifyOtp({
        type: "invite",
        token_hash: invite.properties.hashed_token,
      }),
    );
    return { client, id: invite.user.id, token: session.access_token };
  }
  const a = await account(),
    b = await account(),
    anon = fresh();
  album = checked(
    await admin
      .from("albums")
      .insert({
        mbid: randomUUID(),
        title: "Test temporaire journal",
        artist: "Test local",
        kind: "Album",
        source_url: "https://musicbrainz.org",
      })
      .select()
      .single(),
  );
  const owns = { user_id: a.id, album_id: album.id };
  const ownRows = (table) =>
    a.client.from(table).select("*").eq("user_id", a.id);
  let first, second;
  await t.test(
    "multiple critiques do not create a rating or a listening date",
    async () => {
      first = checked(
        await a.client
          .from("reviews")
          .insert({ ...owns, body: " Première impression " })
          .select()
          .single(),
      );
      second = checked(
        await a.client
          .from("reviews")
          .insert({ ...owns, body: "Une autre impression" })
          .select()
          .single(),
      );
      assert.notEqual(first.id, second.id);
      assert.equal(first.body, "Première impression");
      assert.equal(checked(await ownRows("ratings")).length, 0);
      assert.equal(checked(await ownRows("listened_albums")).length, 0);
      assert.equal(
        checked(await ownRows("journal_events")).filter(
          (e) => e.kind === "review_created",
        ).length,
        2,
      );
    },
  );
  await t.test(
    "rating, listened status and listening list remain independent",
    async () => {
      checked(await a.client.from("ratings").insert({ ...owns, value: 7 }));
      checked(await a.client.from("listening_list").insert(owns));
      checked(await a.client.from("listened_albums").insert(owns));
      assert.equal(checked(await ownRows("listening_list")).length, 1);
      checked(
        await a.client.from("listened_albums").delete().eq("user_id", a.id),
      );
      assert.equal(checked(await ownRows("ratings"))[0].value, 7);
      assert.equal(checked(await ownRows("reviews")).length, 2);
      checked(
        await a.client.from("ratings").update({ value: 5 }).eq("user_id", a.id),
      );
      checked(
        await a.client.from("ratings").update({ value: 5 }).eq("user_id", a.id),
      );
      const ratings = checked(await ownRows("journal_events")).filter(
        (e) => e.kind === "rating_set",
      );
      assert.deepEqual(ratings.map((r) => r.rating_value).sort(), [5, 7]);
    },
  );
  await t.test(
    "editing preserves publication date and rejects stale or forged updates",
    async () => {
      const edited = checked(
        await a.client
          .from("reviews")
          .update({ body: "Nouvelle version" })
          .eq("id", first.id)
          .eq("updated_at", first.updated_at)
          .select()
          .single(),
      );
      assert.equal(edited.created_at, first.created_at);
      assert.notEqual(edited.updated_at, first.updated_at);
      assert.equal(
        checked(
          await a.client
            .from("reviews")
            .update({ body: "Version obsolète" })
            .eq("id", first.id)
            .eq("updated_at", first.updated_at)
            .select(),
        ).length,
        0,
      );
      assert.ok(
        (
          await a.client
            .from("reviews")
            .update({ created_at: "2000-01-01" })
            .eq("id", first.id)
        ).error,
      );
      assert.ok(
        (await a.client.from("reviews").insert({ ...owns, body: "   " })).error,
      );
      assert.ok(
        (await a.client.from("reviews").insert({ ...owns, body: "\n\t\n" }))
          .error,
      );
      assert.ok(
        (
          await a.client
            .from("reviews")
            .insert({ ...owns, body: "a".repeat(5001) })
        ).error,
      );
      assert.equal(
        checked(
          await b.client
            .from("reviews")
            .update({ body: "Intrus" })
            .eq("id", first.id)
            .select(),
        ).length,
        0,
      );
      assert.ok(
        (await b.client.from("reviews").insert({ ...owns, body: "Intrus" }))
          .error,
      );
      assert.equal(checked(await ownRows("ratings"))[0].value, 5);
    },
  );
  await t.test(
    "public reviews, private profiles and owner-only immutable journal",
    async () => {
      assert.equal(
        checked(await anon.from("reviews").select("*").eq("user_id", a.id))
          .length,
        2,
      );
      assert.equal(
        checked(
          await b.client.from("journal_events").select("*").eq("user_id", a.id),
        ).length,
        0,
      );
      assert.equal(
        checked(
          await b.client
            .from("listened_albums")
            .select("*")
            .eq("user_id", a.id),
        ).length,
        0,
      );
      assert.ok(
        (
          await a.client
            .from("journal_events")
            .insert({ ...owns, kind: "listened" })
        ).error,
      );
      checked(
        await a.client
          .from("profiles")
          .update({ visibility: "private" })
          .eq("id", a.id),
      );
      assert.equal(
        checked(await anon.from("reviews").select("*").eq("user_id", a.id))
          .length,
        0,
      );
      assert.equal(
        checked(await b.client.from("reviews").select("*").eq("user_id", a.id))
          .length,
        0,
      );
      assert.equal(checked(await ownRows("reviews")).length, 2);
    },
  );
  await t.test(
    "export includes reviews, listened status and journal; deletion removes review history",
    async () => {
      checked(await a.client.from("listened_albums").insert(owns));
      const response = await fetch("http://127.0.0.1:8787/account/export", {
        headers: { Authorization: `Bearer ${a.token}` },
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.reviews.length, 2);
      assert.equal(data.listened_albums.length, 1);
      assert.ok(data.journal_events.length >= 6);
      assert.ok(data.journal_events.every((e) => e.user_id === a.id));
      checked(await a.client.from("reviews").delete().eq("id", first.id));
      assert.equal(
        checked(await ownRows("journal_events")).filter(
          (e) => e.review_id === first.id,
        ).length,
        0,
      );
      assert.equal(checked(await ownRows("reviews"))[0].id, second.id);
    },
  );
  await t.test(
    "suspension and account deletion cover all new records",
    async () => {
      checked(
        await admin
          .from("account_access")
          .update({ status: "suspended" })
          .eq("user_id", a.id),
      );
      assert.equal(checked(await ownRows("reviews")).length, 0);
      assert.equal(checked(await ownRows("journal_events")).length, 0);
      assert.ok(
        (await a.client.from("reviews").insert({ ...owns, body: "Blocked" }))
          .error,
      );
      checked(await admin.auth.admin.deleteUser(a.id));
      for (const table of ["reviews", "journal_events", "listened_albums"])
        assert.equal(
          checked(await admin.from(table).select("*").eq("user_id", a.id))
            .length,
          0,
        );
    },
  );
});
