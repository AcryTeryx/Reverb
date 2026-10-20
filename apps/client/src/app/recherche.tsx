import { View, Linking } from "react-native";
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
  const {
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
  } = useSearch();
  return (
    <RequireSession>
      <View className="gap-7">
        <PageTitle
          title="Suivez votre curiosité."
          description="Explorez les albums, EP et morceaux de tous les artistes référencés sur MusicBrainz."
        />
        <View className="gap-4">
          <View className="flex-row gap-2">
            <Button
              variant={type === "albums" ? "secondary" : "outline"}
              disabled={busy}
              accessibilityState={{ selected: type === "albums" }}
              onPress={() => setType("albums")}
            >
              <Text>Albums / EP</Text>
            </Button>
            <Button
              variant={type === "recordings" ? "secondary" : "outline"}
              disabled={busy}
              accessibilityState={{ selected: type === "recordings" }}
              onPress={() => setType("recordings")}
            >
              <Text>Morceaux</Text>
            </Button>
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="muted">Chercher par</Text>
            {(
              [
                { value: "all", label: "Titre ou artiste" },
                { value: "title", label: "Titre" },
                { value: "artist", label: "Artiste" },
              ] as const
            ).map((item) => (
              <Button
                key={item.value}
                variant={scope === item.value ? "secondary" : "ghost"}
                disabled={busy}
                accessibilityState={{ selected: scope === item.value }}
                onPress={() => setScope(item.value)}
              >
                <Text>{item.label}</Text>
              </Button>
            ))}
          </View>
        </View>
        <View className="flex-row flex-wrap items-end gap-3">
          <View className="min-w-56 flex-1">
            <Field
              label="Votre recherche"
              value={query}
              onChangeText={setQuery}
              placeholder="Daft Punk, Mitski, bladee…"
              maxLength={100}
              returnKeyType="search"
              editable={!busy}
              onSubmitEditing={() => search()}
            />
          </View>
          <Button
            disabled={busy || query.trim().length < 2}
            onPress={() => search()}
          >
            <Text>{busy ? "Recherche…" : "Rechercher"}</Text>
          </Button>
        </View>
        <Notice error message={error} />
        {searched && submitted && (
          <Text variant="muted">
            {submitted.type === "albums" ? "Albums / EP" : "Morceaux"} · «{" "}
            {submitted.query} » · {albums.length + recordings.length} affichés
            sur {total} correspondances MusicBrainz
          </Text>
        )}
        {busy && !searched ? (
          <Loading />
        ) : albums.length ? (
          <AlbumGrid albums={albums} />
        ) : recordings.length ? (
          <View className="gap-0">
            <Text variant="muted" className="pb-4">
              Les morceaux sont consultables. La notation et les critiques
              concernent les albums / EP.
            </Text>
            {recordings.map((song) => (
              <View
                key={song.id}
                className="flex-row items-center justify-between gap-4 border-b border-border py-4"
              >
                <View className="flex-1 gap-1">
                  <Text className="font-semibold">{song.title}</Text>
                  <Text variant="muted">
                    {song.artist}
                    {song.first_release_date
                      ? ` · ${song.first_release_date}`
                      : ""}
                  </Text>
                  {!!song.disambiguation && (
                    <Text variant="muted">{song.disambiguation}</Text>
                  )}
                  {!!song.duration_ms && (
                    <Text variant="muted">
                      {Math.floor(song.duration_ms / 60000)}:
                      {String(
                        Math.floor(song.duration_ms / 1000) % 60,
                      ).padStart(2, "0")}
                    </Text>
                  )}
                </View>
                <Button
                  variant="outline"
                  accessibilityLabel={`Voir ${song.title} sur MusicBrainz`}
                  onPress={() =>
                    Linking.openURL(
                      `https://musicbrainz.org/recording/${song.mbid}`,
                    )
                  }
                >
                  <Text>Fiche ↗</Text>
                </Button>
              </View>
            ))}
          </View>
        ) : (
          !error && (
            <Empty
              title={
                searched
                  ? "Aucun résultat trouvé."
                  : "Par quelle musique commencer ?"
              }
              detail={
                searched
                  ? "Essayez le nom de l’artiste ou une autre orthographe. Certaines éditions peuvent manquer au catalogue."
                  : "Commencez avec un disque que vous aimez, ou un artiste que vous voulez découvrir."
              }
            />
          )
        )}
        {nextOffset !== null && (
          <Button
            variant="outline"
            disabled={busy}
            onPress={() => search(true)}
          >
            <Text>
              {busy ? "Chargement…" : "Afficher les résultats suivants"}
            </Text>
          </Button>
        )}
        <Text variant="muted">
          Métadonnées : MusicBrainz · Pochettes : Cover Art Archive. Les données
          peuvent être incomplètes. Les albums live, compilations et remixes
          sont exclus de l’onglet Albums / EP. Aucune lecture audio n’est
          proposée.
        </Text>
      </View>
    </RequireSession>
  );
}
