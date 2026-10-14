# Reverb — V0.1.1 locale

Dernier patch : [changements V0.1.1](docs/PATCH-V0.1.1.md).

Une base fonctionnelle de journal musical, en français, construite avec **Expo 57, React Native Web, TypeScript, NativeWind et React Native Reusables** (approche shadcn adaptée au natif). Supabase local fournit les comptes et PostgreSQL. Aucun déploiement ni abonnement payant n'a été créé.

## Ce qui fonctionne

- Comptes sur invitation, confirmation de l'email, mot de passe de 12 caractères minimum, connexion, déconnexion et récupération.
- Profil avec pseudo unique, nom, bio et visibilité publique/privée. Profils privés réservés à leur auteur ; emails jamais inclus dans les profils publics.
- Recherche réelle MusicBrainz, fiches album/EP, pochettes Cover Art Archive avec repli si absentes.
- Notes de 0,5 à 5, par demi-étoile, suppression de note ; liste privée « À écouter » indépendante de la note.
- Bibliothèque persistante, thèmes clair/sombre, export JSON et suppression avec confirmation et vérification du mot de passe.
- Scripts administrateur d'invitation, suspension/restauration et suppression ; permissions vérifiées dans la base.

Les critiques, le journal détaillé, les listes personnalisées, les favoris, les deux Top 5, l'avatar et la bannière sont prévus dans [la V1](docs/V1.md). Abonnements, fil d'amis et RTR viennent ensuite. Spotify n'est pas nécessaire pour utiliser cette version.

## Démarrer sur Windows

Prérequis : Node.js récent (22.18+ ou 24 LTS recommandé), Docker Desktop démarré avec moteur Linux, accès réseau au premier téléchargement. La machine a été testée avec Node 25.2.1 et Supabase CLI 2.120.0. Le SDK Expo fixe les versions compatibles dans `apps/client/package-lock.json`.

Depuis la racine du projet, dans PowerShell :

```powershell
# Le PATH local corrige notamment un ancien shim npm dans AppData/Roaming.
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
npm --prefix apps/client ci
npx --yes supabase@2.120.0 start --exclude realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor
./scripts/configure-local.ps1
```

Le démarrage applique automatiquement les migrations sur une nouvelle base. Le premier téléchargement Docker est conséquent. Les services inutilisés (fichiers, temps réel, fonctions Edge) ne sont pas démarrés.

Dans deux terminaux distincts, à la racine :

```powershell
npm run api
```

```powershell
npm run web
```

Ouvrir **http://localhost:8081**. Utiliser exactement `localhost` pour le web : l'origine autorisée par l'API est `http://localhost:8081`. L'API métier écoute uniquement sur `127.0.0.1:8787`.

Les clés de la stack locale sont écrites dans `.env.local` et `apps/client/.env.local`, exclus de Git. Seule la clé publique/anon est exposée à Expo. La clé serveur reste dans les scripts Node. Ne jamais copier une clé serveur dans une variable `EXPO_PUBLIC_*`.

## Créer le premier compte

```powershell
npm run invite -- moi@example.test
```

1. Ouvrir la boîte de capture locale : **http://127.0.0.1:54324**.
2. Ouvrir l'email d'invitation et suivre « Accepter mon invitation ».
3. Cliquer sur « Continuer », choisir un mot de passe, puis enregistrer un pseudo dans « Mon profil ».

L'email reste dans cette boîte locale : **aucun message n'est envoyé à une vraie adresse**. Un SMTP et un domaine d'envoi seront nécessaires pour inviter des testeurs à distance. Les invitations et liens de récupération sont personnels, expirent et ne sont utilisables qu'une fois. Leur vérification attend une action sur la page afin d'éviter la consommation automatique par un simple préchargement.

L'inscription publique est interdite côté Auth (`auth.enable_signup = false`). Le fournisseur email reste actif (`auth.email.enable_signup = true`) pour permettre aux comptes invités de se connecter ; ce cas est couvert par les tests directs de l'API.

## Développement et contrôles

```powershell
npm run typecheck
npm run lint
npm test
npm run test:integration
npm --prefix apps/client run build:web
node --env-file=.env.local scripts/catalog-smoke.mjs "Daft Punk"
npx --yes supabase@2.120.0 db advisors --local --type security --level warn --fail-on error
```

Les tests d'intégration exigent Supabase et l'API locale démarrés. Ils créent puis suppriment uniquement leurs comptes de test, lisent les emails capturés et refusent de viser un hébergement distant. Ils couvrent les invitations, récupération, RLS, données privées, persistance, export, suspension et suppression. Les métadonnées musicales de test sont supprimées à la fin. Les emails capturés restent consultables dans Mailpit.

Pour les essais visuels, `node --env-file=.env.local tests/prepare-ui.mjs` prépare un compte jetable dans `.artifacts/ui-account.json`. `node --env-file=.env.local tests/prepare-ui.mjs --cleanup` supprime ce compte. Ce mécanisme est réservé à la stack locale.

## Administration locale

Studio : **http://127.0.0.1:54323**. Le statut d'accès est séparé du profil modifiable.

```powershell
npm run admin -- suspend UUID_DU_COMPTE
npm run admin -- restore UUID_DU_COMPTE
npm run admin -- delete UUID_DU_COMPTE
```

La suppression administrateur est définitive. Si une suppression est interrompue, le statut `deleting` bloque les accès métier et la commande `delete` permet de la terminer. Une suspension bloque aussi les JWT précédemment émis via les politiques RLS ; la restauration réactive le compte.

Arrêter les deux terminaux avec `Ctrl+C`, puis `npx --yes supabase@2.120.0 stop`. Les données locales sont conservées. **Ne pas utiliser `stop --no-backup` ni `db reset` sur des données à garder.**

## Architecture

```text
apps/client/src/app/          Écrans Expo Router universels
apps/client/src/components/   Composants métier + composants React Native Reusables
apps/client/src/lib/          Client Supabase, règles de note, types
scripts/                     API Node locale et administration privilégiée
supabase/migrations/          Schéma, contraintes, RLS, quota partagé du catalogue
supabase/templates/           Emails français de développement
tests/                        Tests métier et intégration réelle sur la stack locale
docs/                         Produit, choix techniques, recherche, état de livraison
```

Les UUID Reverb sont indépendants des MBID MusicBrainz. Cette première source est conservée dans `albums.mbid` ; la table de correspondances multi-fournisseurs sera extraite lorsqu'une seconde source sera introduite. Les notes ne dépendent pas d'un compte Spotify.

Les recherches passent par le serveur : validation, délai réseau borné, déduplication par processus, cache PostgreSQL de 24 heures et réservation du quota dans PostgreSQL (1,1 seconde entre créneaux). Les entrées expirées sont purgées à la prochaine recherche. Les résultats sont limités à 24 : affiner le titre/artiste si nécessaire. La classification communautaire peut être imparfaite. Pas de streaming, pas d'import massif, pas de recommandation automatique.

## Limites avant déploiement

Cette livraison est une **base locale**, pas une bêta prête à être ouverte. Voir [l'état de livraison](docs/LIVRAISON-V0.1.0.md) et [les recherches fournisseurs](docs/V0.1.0.md).

- Finaliser l'identité légale/contact, les durées de conservation, SMTP/DNS, HTTPS, URL de retour, sauvegardes et exercice de restauration.
- Confirmer les conditions MusicBrainz pour l'usage envisagé et les droits des pochettes. Remplacer le User-Agent local par une identification avec contact réel avant ouverture.
- Choisir l'hébergement de l'API et du web. Le serveur fourni est volontairement configuré pour la boucle locale, sans exploitation publique ni supervision.
- Traiter les alertes de dépendances détaillées dans le rapport de livraison avant exposition publique.
- Les écrans sont fondés sur React Native, mais **aucun build Android/iOS n'est validé**. Liens profonds d'authentification, adresses réseau, stockage natif, ergonomie et règles des stores restent à tester.

La finition visuelle et les fonctionnalités V1 seront affinées ensemble. Les contraintes de catalogue et de déploiement ne sont pas considérées comme résolues par ce prototype local.
