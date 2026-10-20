export type Album = {
  id: string;
  mbid: string;
  title: string;
  artist: string;
  release_date: string;
  kind: "Album" | "EP";
  source_url: string;
};
export type Profile = {
  id: string;
  username: string | null;
  display_name: string;
  bio: string;
  visibility: "public" | "private";
};
export type Rating = {
  album_id: string;
  value: number;
  updated_at: string;
  albums: Album;
};
export type ListeningItem = {
  album_id: string;
  created_at: string;
  albums: Album;
};
export type Review = {
  id: string;
  user_id: string;
  album_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  albums?: Album;
};
export type JournalEvent = {
  id: string;
  album_id: string;
  kind:
    | "rating_set"
    | "rating_removed"
    | "listened"
    | "unlistened"
    | "review_created"
    | "review_updated";
  rating_value: number | null;
  created_at: string;
  albums: Album;
  reviews: { body: string } | null;
};
export type Recording = {
  id: string;
  mbid: string;
  title: string;
  artist: string;
  disambiguation: string;
  duration_ms: number | null;
  first_release_date: string;
  source_url: string;
};
