# Provenance des composants

- Socle généré par `create-expo-app@5.0.0`, modèle `blank-typescript`, SDK Expo 57. Licence du modèle conservée dans `apps/client/LICENSE`.
- `button.tsx`, `text.tsx`, `input.tsx`, `card.tsx` et `badge.tsx` proviennent du registre officiel [React Native Reusables](https://reactnativereusables.com/docs), version NativeWind, récupéré le 13 octobre 2026. Les alias d'import ont été adaptés à `@/` ; les fichiers sont ensuite formatés localement.
- Registre : `https://reactnativereusables.com/r/nativewind/{name}.json`. Configuration compatible registre shadcn dans `apps/client/components.json`. Licence MIT conservée dans `docs/licenses/react-native-reusables.txt` (Founded Labs).
- Icônes : `lucide-react-native`. Pochette d'album : Cover Art Archive, avec attribution MusicBrainz et repli en cas d'absence.

React Native Reusables est une adaptation communautaire de l'approche shadcn ; ce n'est pas le package web DOM shadcn/ui. Ce choix évite d'imposer une réécriture complète des composants pour Android/iOS. Vérifier et conserver les licences des dépendances lors des mises à jour.
