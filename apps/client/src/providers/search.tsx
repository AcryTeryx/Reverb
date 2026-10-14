import { createContext, useContext, useRef, useState } from "react";
import { api } from "@/lib/supabase";
import type { Album } from "@/lib/types";
import { errorMessage } from "@/components/common";
import { useSession } from "@/providers/session";

function useSearchState() {
  const [query, setQuery] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function search() {
    if (pending.current || query.trim().length < 2) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setAlbums([]);
    try {
      const result = await api<{ albums: Album[] }>(
        `/catalog/search?q=${encodeURIComponent(query.trim())}`,
      );
      setAlbums(result.albums);
      setSearched(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { query, setQuery, albums, searched, busy, error, search };
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
