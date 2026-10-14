import { View } from "react-native";
import { useSearch } from "@/providers/search";
import { AlbumGrid } from "@/components/album";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  Field,
  Empty,
  Loading,
  Notice,
  PageTitle,
  RequireSession,
} from "@/components/common";
export default function Search() {
  const { query, setQuery, albums, searched, busy, error, search } =
    useSearch();
  return (
    <RequireSession>
      <View className="gap-7">
        <PageTitle
          title="Suivez votre curiosité."
          description="Retrouvez un album ou un EP par son titre ou son artiste."
        />
        <View className="flex-row flex-wrap items-end gap-3">
          <View className="min-w-56 flex-1">
            <Field
              label="Titre d’album ou artiste"
              value={query}
              onChangeText={setQuery}
              placeholder="Daft Punk, Mitski, bladee…"
              maxLength={100}
              returnKeyType="search"
              onSubmitEditing={search}
            />
          </View>
          <Button disabled={busy || query.trim().length < 2} onPress={search}>
            <Text>{busy ? "Recherche…" : "Rechercher"}</Text>
          </Button>
        </View>
        <Notice error message={error} />
        {busy ? (
          <Loading />
        ) : albums.length ? (
          <AlbumGrid albums={albums} />
        ) : (
          !error && (
            <Empty
              title={
                searched ? "Aucun album trouvé." : "Par quel album commencer ?"
              }
              detail={
                searched
                  ? "Essayez le nom de l’artiste ou une autre orthographe. Certaines éditions peuvent manquer au catalogue."
                  : "Commencez avec un disque que vous aimez, ou un artiste que vous voulez découvrir."
              }
            />
          )
        )}
        <Text variant="muted">
          Métadonnées : MusicBrainz · Pochettes : Cover Art Archive. Les
          morceaux et imports Spotify arriveront dans une étape ultérieure.
        </Text>
      </View>
    </RequireSession>
  );
}
