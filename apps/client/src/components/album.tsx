import { useState } from "react";
import { View, Image, Pressable } from "react-native";
import { Link } from "expo-router";
import { Star, StarHalf, Disc3 } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { clickStar, formatRating } from "@/lib/rating";
import type { Album } from "@/lib/types";

export function Cover({
  album,
  large = false,
}: {
  album: Album;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View className="aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted">
      {!failed ? (
        <Image
          source={{
            uri: `https://coverartarchive.org/release-group/${album.mbid}/front-250`,
          }}
          accessibilityLabel={`Pochette de ${album.title}`}
          className="size-full"
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View className="items-center gap-3 p-3">
          <Disc3 size={large ? 64 : 36} color="#80958b" />
          <Text variant="muted" className="text-center">
            Pochette indisponible
          </Text>
        </View>
      )}
    </View>
  );
}
export function AlbumGrid({
  albums,
  ratings = {},
}: {
  albums: Album[];
  ratings?: Record<string, number>;
}) {
  return (
    <View className="-mx-2 flex-row flex-wrap">
      {albums.map((album) => (
        <View
          key={album.id}
          className="mb-7 w-1/2 px-2 sm:w-1/3 md:w-1/4 lg:w-1/6"
        >
          <Link
            href={{ pathname: "/albums/[id]", params: { id: album.id } }}
            asChild
          >
            <Pressable
              role="link"
              accessibilityLabel={`${album.title}, ${album.artist}`}
              className="gap-2 rounded-md"
            >
              <Cover album={album} />
              <Text numberOfLines={2} className="font-semibold">
                {album.title}
              </Text>
              <Text variant="muted" numberOfLines={2}>
                {album.artist}
              </Text>
              {!!ratings[album.id] && (
                <Text className="text-primary">
                  ★ {formatRating(ratings[album.id])}
                </Text>
              )}
            </Pressable>
          </Link>
        </View>
      ))}
    </View>
  );
}
export function Stars({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const green = colorScheme === "dark" ? "#77c995" : "#22673f";
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = (value ?? 0) >= star * 2;
          const half = value === star * 2 - 1;
          return (
            <Pressable
              key={star}
              role="button"
              disabled={disabled}
              accessibilityLabel={`Noter ${formatRating(clickStar(value, star))}`}
              onPress={() => onChange(clickStar(value, star))}
              className="size-11 items-center justify-center rounded-md"
            >
              <Star
                size={30}
                color={green}
                fill={fill ? green : "transparent"}
              />
              {half && (
                <View className="absolute">
                  <StarHalf size={30} color={green} fill={green} />
                </View>
              )}
            </Pressable>
          );
        })}
        <Text className="ml-2">
          {value ? formatRating(value) : "Pas encore noté"}
        </Text>
      </View>
      <Text variant="muted">
        Cliquez à nouveau sur une étoile pour une demi-étoile.
      </Text>
      {value !== null && (
        <Button
          variant="ghost"
          className="self-start"
          disabled={disabled}
          onPress={() => onChange(null)}
        >
          <Text>Retirer ma note</Text>
        </Button>
      )}
    </View>
  );
}
