# Livraison locale V0.1.0 — 13 octobre 2026

**État : fondations implémentées et vérifiées localement. Aucun déploiement.** Le cadrage historique reste dans `V0.1.0.md`, les décisions produit V1 dans `V1.md`, et les commandes de lancement dans `../README.md`.

## Technologie retenue

Expo 57 + React Native 0.86 + React Native Web + Expo Router, TypeScript, NativeWind 4.2 et React Native Reusables. Supabase Auth/PostgreSQL local avec Docker. API métier Node distincte pour MusicBrainz, export et suppression du compte. Les écrans partagent des composants natifs ; les builds Android/iOS restent à réaliser ultérieurement.

## Disponible

| Domaine | Livraison |
|---|---|
| Comptes | Invitation, vérification par lien email, mot de passe, connexion/déconnexion, récupération |
| Sécurité | Inscription publique refusée par Auth ; RLS ; statut d'accès non modifiable par l'utilisateur ; aucune clé serveur dans le client |
| Profil | Pseudo unique, nom, bio, initiales, public/privé ; fiche par pseudo |
| Catalogue | Recherche MusicBrainz par titre/artiste, albums et EP officiels ; pochette éventuelle ; source visible |
| Notes | 0,5–5 par demi-étoile ; clic répété sur la troisième étoile : 3 puis 2,5 ; suppression de note |
| Bibliothèque | Notes récentes et liste privée « À écouter », conservées dans PostgreSQL |
| Contrôle des données | Export JSON avec références d'albums ; suppression avec mot de passe et confirmation explicite |
| Administration | Scripts invitation, suspension, restauration d'accès et suppression |
| Interface | Français, clair/sombre mémorisé, tailles adaptatives, formulaires nommés, état d'erreur et de chargement |

La V0.1.0 ne contient pas encore les critiques, Top 5, favoris, avatar/bannière importés, listes personnalisées ni journal détaillé. La V1 personnelle reste celle convenue ; les fonctions sociales appartiennent à la version multiuser suivante.

## Vérifications réalisées

- Migration appliquée par Supabase sur la nouvelle base locale ; redémarrage de la stack depuis les volumes conservés.
- **10 tests d'intégration passent** : inscription publique refusée, deux invitations réellement capturées et vérifiées, liens à usage unique, récupération du mot de passe, refus de modification du catalogue et des privilèges, bornes des notes, isolation des écritures, public/privé, persistance, export, suspension avec ancien JWT et suppression en cascade.
- **2 tests métier passent** sur la notation et l'absence de note zéro.
- Vérification TypeScript, ESLint et export web de production exécutés avec succès (versions verrouillées par `package-lock.json`).
- `expo install --check` : versions compatibles.
- `supabase db advisors --local --type security --level warn --fail-on error` : aucun problème signalé.
- Recherche réelle « Daft Punk » et deuxième appel servi depuis le cache : résultats cohérents, dont *Discovery*, *Homework* et *Random Access Memories*. Les premiers résultats non officiels ont motivé l'ajout du filtre `status:official` et des exclusions des types live/compilation/remix.
- Navigateur : connexion avec compte jetable, recherche, fiche *Discovery*, note 3 → 2,5, ajout à la liste privée, enregistrement de la bio et déconnexion vérifiés. Navigation Tab entre les champs du profil contrôlée. Rendu inspecté à 390, 768 et 1280 pixels de largeur ainsi que dans le panneau étroit ; thèmes clair et sombre inspectés. Le compte de vérification a ensuite été supprimé.
- Corrections issues des contrôles : fournisseur email réactivé tout en interdisant l'inscription publique ; chaînes vides retirées des enfants React Native `View` ; exclusion de l'export compilé de l'analyse TypeScript ; suppression du verrou Auth devenu obsolète dans la version Supabase installée.

Ces contrôles ne remplacent pas un audit indépendant ni les essais d'un hébergement réel. Les emails ont été capturés dans Mailpit ; aucune délivrabilité externe n'est démontrée.

## Écarts et limites connues

- Pas de pagination externe du catalogue : maximum 24 résultats par recherche, à affiner. Bibliothèque et profil chargent par lots ; l'API Supabase locale conserve son plafond de lignes. La couverture et la classification MusicBrainz peuvent laisser passer des objets éditoriaux atypiques.
- Catalogue importé à partir des résultats de recherche. Les métadonnées utilisées restent indépendantes des comptes utilisateurs. Une table `album_sources` multi-fournisseurs n'est pas encore nécessaire : la référence MusicBrainz est stockée dans `albums.mbid`, et les notes pointent vers des UUID Reverb.
- Cache partagé en base et créneaux MusicBrainz de 1,1 seconde ; déduplication locale au processus. Le limiteur de demandes par utilisateur reste en mémoire dans l'API locale : avant plusieurs instances hébergées, il devra être partagé lui aussi.
- L'expiration du cache est de 24 heures ; les lignes expirées sont supprimées lors d'une recherche suivante, sans tâche planifiée locale.
- La notice de confidentialité est un brouillon propre au développement local. Contact, responsable, bases légales, durées, CGU et prestataires définitifs restent à préciser avant bêta.
- Le serveur API écoute en boucle locale. HTTPS, configuration d'origine, adresses de retour, supervision, sauvegardes et exercice complet de restauration restent à préparer pour l'hébergement.
- La récupération utilise actuellement l'URL de développement web. Liens profonds et parcours natifs seront adaptés avec les builds Android/iOS. Aucun test sur appareil natif ni publication sur un store.

## Dépendances à traiter avant exposition publique

Après installation et tentative de corrections compatibles (`npm audit fix --ignore-scripts`, sans `--force`), npm signale **35 alertes : 21 élevées et 14 modérées**. Ce nombre inclut les dépendances parentes touchées par propagation ; il ne signifie pas 35 vulnérabilités distinctes.

Les cinq causes rapportées sont :

| Dépendance | Type d'alerte | Contexte à revoir |
|---|---|---|
| `braces` | Déni de service par motifs imbriqués | Chaîne d'outillage Metro/Tailwind |
| `decode-uri-component` | Déni de service sur encodage malformé | Chaîne de traitement des URL d'Expo Router, également pertinente côté client |
| `node-forge` | Validation de signature RSA | Outillage/signature Expo |
| `postcss-selector-parser` | Complexité de parsing | Compilation CSS |
| `uuid` | Bornes de buffers | Dépendance de l'outillage Xcode/Expo |

Les corrections proposées automatiquement imposaient des changements majeurs, voire des retours à d'anciens SDK incompatibles. Elles n'ont pas été forcées. Ne pas considérer cette stack comme prête pour une ouverture publique : requalifier les chemins réellement exposés et choisir des mises à jour compatibles/correctifs avec tests avant déploiement.

Références des avis : [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [decode-uri-component](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [PostCSS](https://github.com/advisories/GHSA-rj75-hqrm-r3gf), [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Source des versions et alertes : sortie npm audit du 13 octobre 2026 ; la gravité réelle pour le déploiement reste à évaluer.

## Avant d'inviter à distance

Reprendre les critères d'ouverture de `V0.1.0.md` : conditions catalogue et pochettes, budget/hébergement, SMTP et domaine d'envoi, données légales, sécurisation du déploiement et sauvegardes. Ne pas exposer directement les serveurs de développement et Studio. Aucun de ces choix ne demande de payer maintenant.
