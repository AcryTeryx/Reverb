import { createContext, useContext, useRef, useState } from "react";
import { api } from "@/lib/supabase";
import type { Album, Recording } from "@/lib/types";
import { errorMessage } from "@/components/common";
import { useSession } from "@/providers/session";

function useSearchState() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"albums" | "recordings">("albums");
  const [scope, setScope] = useState<"all" | "title" | "artist">("all");
  const [submitted, setSubmitted] = useState<{
    query: string;
    type: string;
    scope: string;
  } | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function search(more = false) {
    if (
      pending.current ||
      (!more && query.trim().length < 2) ||
      (more && nextOffset === null)
    )
      return;
    const input =
      more && submitted ? submitted : { query: query.trim(), type, scope };
    pending.current = true;
    setBusy(true);
    setError("");
    if (!more) {
      setAlbums([]);
      setRecordings([]);
      setSearched(false);
      setNextOffset(null);
      setSubmitted(input);
    }
    try {
      const result = await api<{
        albums: Album[];
        recordings: Recording[];
        total: number;
        nextOffset: number | null;
      }>(
        `/catalog/search?q=${encodeURIComponent(input.query)}&type=${input.type}&scope=${input.scope}&offset=${more ? nextOffset : 0}`,
      );
      setAlbums((previous) =>
        more
          ? [
              ...new Map(
                [...previous, ...result.albums].map((row) => [row.id, row]),
              ).values(),
            ]
          : result.albums,
      );
      setRecordings((previous) =>
        more
          ? [
              ...new Map(
                [...previous, ...result.recordings].map((row) => [row.id, row]),
              ).values(),
            ]
          : result.recordings,
      );
      setTotal(result.total);
      setNextOffset(result.nextOffset);
      setSearched(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return {
    query,
    setQuery,
    type,
    setType,
    scope,
    setScope,
    submitted,
    albums,
    recordings,
    total,
    nextOffset,
    searched,
    busy,
    error,
    search,
  };
}

const Context = createContext<ReturnType<typeof useSearchState> | null>(null);

function SearchState({ children }: { children: React.ReactNode }) {
  const value = useSearchState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  // Keep navigation state in memory, isolated from every other account.
  return (
    <SearchState key={session?.user.id ?? "anonymous"}>{children}</SearchState>
  );
}

export function useSearch() {
  const value = useContext(Context);
  if (!value) throw new Error("SearchProvider manquant");
  return value;
}
