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
