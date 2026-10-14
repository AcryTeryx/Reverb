# Reverb — Patch V0.1.1

Date : 14 octobre 2026 · Version précédente : V0.1.0 · Livraison locale, sans déploiement.

## Navigation vers le profil

- **Avant :** « Mon profil » ouvrait directement le formulaire de modification.
- **Maintenant :** « Mon profil » ouvre votre page `/u/{pseudo}`.
- Un petit bouton carré avec un crayon apparaît à droite, sur la même ligne que le pseudo. Il ouvre les paramètres du profil, toujours disponibles à l’adresse `/profil`.
- Le crayon est réservé au propriétaire du profil ; son libellé accessible est « Modifier mon profil ».
- La destination est calculée à chaque ouverture de « Mon profil », pour tenir compte d’un changement de pseudo. Un compte sans pseudo arrive sur le formulaire pour terminer son profil.
- Les règles de visibilité restent identiques : un profil privé est accessible uniquement à son auteur.

## Recherche conservée au retour

Le parcours devient : **recherche « Daft Punk » → ouverture de Discovery → Retour → recherche « Daft Punk » avec ses résultats**.

Le texte, les résultats et l’état de la dernière recherche restent en mémoire pendant la navigation. Revenir par le navigateur ou par le bouton « Recherche » retrouve cet état, sans relancer automatiquement une requête au catalogue. Une recherche en cours peut terminer pendant la consultation d’une autre page.

Cette mémoire est propre au compte connecté. Elle est effacée à la déconnexion, au changement de compte ou au rechargement complet de l’application. Il ne s’agit pas d’un historique permanent. La position exacte de défilement n’est pas enregistrée par ce patch.

## Version et compatibilité

Version portée à **0.1.1** dans les manifestes, le verrou de dépendances, le pied de page, l’API et l’agent MusicBrainz par défaut. Une valeur MusicBrainz personnalisée dans `.env.local` reste prioritaire.

Aucune dépendance ajoutée et aucune migration de base de données. Comptes, notes et listes existants sont conservés. Les documents V0.1.0 restent disponibles comme historique ; les fonctionnalités V1 ne sont pas incluses dans ce patch.

## Vérifications

- TypeScript : validation réussie.
- ESLint : validation réussie, sans erreur ni avertissement.
- Compilation et export web Expo : réussis ; l’API locale annonce `0.1.1`.
- Tests existants des notes : 2 tests réussis.
- Navigateur local : « Mon profil » mène à `/u/{pseudo}`, puis le crayon ouvre le formulaire.
- Navigateur local : « Daft Punk → Discovery → Retour » restitue le champ et les 19 résultats précédents.
- Déconnexion puis reconnexion : la recherche précédente a bien disparu.
- Contrôle visuel du profil sur ordinateur et à largeur mobile : crayon aligné avec le pseudo.

Les vérifications utilisent un compte local temporaire, supprimé après les essais. Les limites de préparation au déploiement décrites dans [la livraison V0.1.0](LIVRAISON-V0.1.0.md) restent applicables.

## Repères techniques

- `apps/client/src/app/mon-profil.tsx` : résolution du profil du compte connecté et redirection Expo Router.
- `apps/client/src/app/u/[username].tsx` : accès à l’édition depuis son profil.
- `apps/client/src/providers/search.tsx` : état de recherche conservé au-dessus des pages, isolé par compte.
- `apps/client/src/app/recherche.tsx` : utilisation de cet état partagé.

Référence de navigation : [redirections Expo Router](https://docs.expo.dev/router/reference/redirects/).
