SET local check_function_bodies = off;

CREATE TABLE "public"."catalog_pages" (
  "key"        text                     NOT NULL,
  "payload"    jsonb                    NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "catalog_pages_pkey" PRIMARY KEY (key)
);

ALTER TABLE "public"."catalog_pages"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."catalog_pages" FROM "anon", "authenticated";

CREATE TABLE "public"."journal_events" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"      uuid                     NOT NULL,
  "album_id"     uuid                     NOT NULL,
  "review_id"    uuid,
  "kind"         text                     NOT NULL,
  "rating_value" smallint,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "journal_events_kind_check"
    CHECK ((kind = ANY (ARRAY['rating_set'::text, 'rating_removed'::text, 'listened'::text, 'unlistened'::text, 'review_created'::text, 'review_updated'::text]))),
  CONSTRAINT "journal_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "journal_events_rating_value_check" CHECK (((rating_value >= 1) AND (rating_value <= 10)))
);

ALTER TABLE "public"."journal_events"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."journal_events" FROM "anon";

CREATE TABLE "public"."listened_albums" (
  "user_id"    uuid                     NOT NULL,
  "album_id"   uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "listened_albums_pkey" PRIMARY KEY (user_id, album_id)
);

ALTER TABLE "public"."listened_albums"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."listened_albums" FROM "anon";

CREATE TABLE "public"."recordings" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "mbid"               uuid                     NOT NULL,
  "title"              text                     NOT NULL,
  "artist"             text                     NOT NULL,
  "disambiguation"     text                     NOT NULL DEFAULT ''::text,
  "duration_ms"        integer,
  "first_release_date" text                     NOT NULL DEFAULT ''::text,
  "source_url"         text                     NOT NULL,
  "fetched_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recordings_mbid_key" UNIQUE (mbid),
  CONSTRAINT "recordings_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."recordings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reviews" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "album_id"   uuid                     NOT NULL,
  "body"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "reviews_body_check" CHECK (char_length(body) between 1 and 5000 AND body ~ '[^[:space:]]'),
  CONSTRAINT "reviews_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."reviews"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.record_journal()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare row_data record; event_kind text; event_rating smallint; event_review uuid;
begin
  if tg_op = 'DELETE' then row_data = old; else row_data = new; end if;
  -- Cascading account deletion must not recreate activity.
  if not exists (select 1 from public.profiles where id = row_data.user_id) then return null; end if;
  if tg_table_name = 'ratings' then
    if tg_op = 'UPDATE' and new.value = old.value then return null; end if;
    event_kind = case when tg_op = 'DELETE' then 'rating_removed' else 'rating_set' end;
    if tg_op <> 'DELETE' then event_rating = new.value; end if;
  elsif tg_table_name = 'listened_albums' then
    event_kind = case when tg_op = 'DELETE' then 'unlistened' else 'listened' end;
  else
    if tg_op = 'UPDATE' and new.body = old.body then return null; end if;
    event_kind = case when tg_op = 'INSERT' then 'review_created' else 'review_updated' end;
    event_review = new.id;
  end if;
  insert into public.journal_events(user_id, album_id, review_id, kind, rating_value)
    values(row_data.user_id, row_data.album_id, event_review, event_kind, event_rating);
  return null;
end $function$;

CREATE OR REPLACE FUNCTION private.touch_review()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.body = btrim(new.body);
  if tg_op = 'INSERT' then
    new.created_at = clock_timestamp();
    new.updated_at = new.created_at;
  elsif new.body is distinct from old.body then
    new.updated_at = clock_timestamp();
  end if;
  return new;
end $function$;

ALTER TABLE "public"."journal_events"
  ADD CONSTRAINT "journal_events_album_id_fkey" FOREIGN KEY (album_id) REFERENCES public.albums(id);

ALTER TABLE "public"."journal_events"
  ADD CONSTRAINT "journal_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."listened_albums"
  ADD CONSTRAINT "listened_albums_album_id_fkey" FOREIGN KEY (album_id) REFERENCES public.albums(id);

ALTER TABLE "public"."listened_albums"
  ADD CONSTRAINT "listened_albums_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_album_id_fkey" FOREIGN KEY (album_id) REFERENCES public.albums(id);

ALTER TABLE "public"."journal_events"
  ADD CONSTRAINT "journal_events_review_id_fkey" FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX catalog_pages_expiry_idx ON public.catalog_pages USING btree (expires_at);

CREATE INDEX journal_album_idx ON public.journal_events USING btree (album_id);

CREATE INDEX journal_review_idx ON public.journal_events USING btree (review_id);

CREATE INDEX journal_user_date_idx ON public.journal_events USING btree (user_id, created_at DESC, id DESC);

CREATE INDEX listened_album_idx ON public.listened_albums USING btree (album_id);

CREATE INDEX listened_user_date_idx ON public.listened_albums USING btree (user_id, created_at DESC, album_id);

CREATE INDEX reviews_album_idx ON public.reviews USING btree (album_id);

CREATE INDEX reviews_user_date_idx ON public.reviews USING btree (user_id, created_at DESC, id DESC);

CREATE TRIGGER journal_listened
  AFTER INSERT OR DELETE ON public.listened_albums
  FOR EACH ROW
  EXECUTE FUNCTION private.record_journal();

CREATE TRIGGER journal_rating
  AFTER INSERT OR DELETE OR UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION private.record_journal();

CREATE TRIGGER journal_review
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION private.record_journal();

CREATE TRIGGER review_timestamp
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION private.touch_review();

CREATE POLICY "journal_owner" ON "public"."journal_events"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = ( SELECT auth.uid() AS uid)) AND private.is_active(user_id)));

CREATE POLICY "listened_owner" ON "public"."listened_albums"
  FOR ALL
  TO "authenticated"
  USING (((user_id = ( SELECT auth.uid() AS uid)) AND private.is_active(user_id)))
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND private.is_active(user_id)));

CREATE POLICY "recordings_read" ON "public"."recordings"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "review_delete" ON "public"."reviews"
  FOR DELETE
  TO "authenticated"
  USING (((user_id = ( SELECT auth.uid() AS uid)) AND private.is_active(user_id)));

CREATE POLICY "review_insert" ON "public"."reviews"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND private.is_active(user_id)));

CREATE POLICY "review_read" ON "public"."reviews"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE (p.id = reviews.user_id))));

CREATE POLICY "review_update" ON "public"."reviews"
  FOR UPDATE
  TO "authenticated"
  USING (((user_id = ( SELECT auth.uid() AS uid)) AND private.is_active(user_id)))
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND private.is_active(user_id)));

REVOKE ALL ON FUNCTION "private"."record_journal"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."touch_review"() FROM PUBLIC;

REVOKE ALL ON TABLE "public"."catalog_pages" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."catalog_pages" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."catalog_pages" TO "service_role";

REVOKE ALL ON TABLE "public"."journal_events" FROM "authenticated";

GRANT SELECT ON TABLE "public"."journal_events" TO "authenticated";

REVOKE ALL ON TABLE "public"."journal_events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."journal_events" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."journal_events" TO "service_role";

REVOKE ALL ON TABLE "public"."listened_albums" FROM "authenticated";

REVOKE ALL ("album_id") ON TABLE "public"."listened_albums" FROM "authenticated";

GRANT INSERT ("album_id") ON TABLE "public"."listened_albums" TO "authenticated";

REVOKE ALL ("user_id") ON TABLE "public"."listened_albums" FROM "authenticated";

GRANT INSERT ("user_id") ON TABLE "public"."listened_albums" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."listened_albums" TO "authenticated";

REVOKE ALL ON TABLE "public"."listened_albums" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."listened_albums" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."listened_albums" TO "service_role";

REVOKE ALL ON TABLE "public"."recordings" FROM "anon";

GRANT SELECT ON TABLE "public"."recordings" TO "anon";

REVOKE ALL ON TABLE "public"."recordings" FROM "authenticated";

GRANT SELECT ON TABLE "public"."recordings" TO "authenticated";

REVOKE ALL ON TABLE "public"."recordings" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recordings" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recordings" TO "service_role";

REVOKE ALL ON TABLE "public"."reviews" FROM "anon";

GRANT SELECT ON TABLE "public"."reviews" TO "anon";

REVOKE ALL ON TABLE "public"."reviews" FROM "authenticated";

REVOKE ALL ("album_id") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("album_id") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("body") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("body"), UPDATE ("body") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("user_id") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("user_id") ON TABLE "public"."reviews" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ON TABLE "public"."reviews" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reviews" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reviews" TO "service_role";

-- Preserve the last known rating action for existing accounts. Previous changes
-- were not recorded, and rating an album must never invent an actual listen.
INSERT INTO public.journal_events(user_id, album_id, kind, rating_value, created_at)
SELECT r.user_id, r.album_id, 'rating_set', r.value, r.updated_at
FROM public.ratings r
WHERE NOT EXISTS (
  SELECT 1 FROM public.journal_events e
  WHERE e.user_id = r.user_id AND e.album_id = r.album_id AND e.kind = 'rating_set'
);

