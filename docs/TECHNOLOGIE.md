# Choix technique — 13 octobre 2026

Expo, React Native, React Native Web, Expo Router et TypeScript remplacent la proposition initiale Next.js. La priorité est une application personnelle avec des écrans partageables sur Android et iOS. Next.js serait préférable pour un site fortement centré sur le référencement et le rendu serveur ; ce n'est pas la priorité actuelle.

L'application universelle vit dans `apps/client`. Le backend reste Supabase (Auth et PostgreSQL avec RLS), utilisable localement avec Docker. Aucun abonnement payant ni déploiement requis pour développer.

L'interface utilise React Native Reusables, adaptation communautaire de l'approche shadcn, et NativeWind. Les composants shadcn basés sur le DOM ne sont pas utilisables directement dans une application native. Les règles métier et les contrats restent indépendants des écrans.

Sources : [Expo Router](https://docs.expo.dev/router/installation/), [Expo et Supabase](https://docs.expo.dev/guides/using-supabase/), [React Native Reusables](https://reactnativereusables.com/docs), [NativeWind](https://www.nativewind.dev/docs/getting-started/installation).

## Direction fonctionnelle validée

Bibliothèque, recherche et profil ; navigation simple, pochettes mises en avant, thèmes clair/sombre avec accent vert discret. Sur téléphone, navigation compacte ; sur grand écran, contenu centré et plus de colonnes d'albums. États à couvrir : chargement, première visite, catalogue vide, erreur réseau, session absente ou expirée et sauvegarde réussie.

Cette livraison construit des parcours fonctionnels avant la finition graphique. Les maquettes raster détaillées sont reportées avec cette finition, conformément au brief confirmé. Pas de nouvelle validation graphique nécessaire pour les composants standards de cette étape.
