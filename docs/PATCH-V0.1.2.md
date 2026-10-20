# Reverb — Patch V0.1.2

Date : 20 octobre 2026 · Version précédente : V0.1.1 · Branche de validation : `preview`.

## Catalogue musical élargi

- Les albums et EP sont recherchés auprès de MusicBrainz au lieu de dépendre uniquement du petit catalogue d'exemples. Les morceaux sont également recherchables, sans notation individuelle dans cette version.
- Les résultats sont chargés par pages, enregistrés dans le catalogue local avec leur identifiant MusicBrainz et mis en cache pour limiter les appels au fournisseur.
- La recherche accepte les artistes hors de la liste de démonstration. Les albums studio et EP sont retenus ; les lives, compilations, remixes et DJ-mix sont filtrés.
- Les requêtes sont limitées et échappées. Les appels MusicBrainz partagent une file de quota et retentent brièvement en cas de panne temporaire en respectant `Retry-After`. Les erreurs de requête et de quota reçoivent un message adapté.

## Critiques et journal personnel

- Un album peut avoir plusieurs critiques distinctes d'une même personne. Modifier une critique conserve sa date de publication ; publier une autre critique ne remplace pas la première.
- La note courante, les critiques, le statut « déjà écouté » et la liste « À écouter » restent indépendants. Marquer un album comme écouté n'invente pas une date d'écoute.
- Le journal personnel affiche les actions horodatées. Ses données restent privées et sont incluses dans l'export du compte ; la suppression du compte les efface.
- Les paramètres et informations de confidentialité indiquent ces nouveaux traitements. Les permissions de base de données couvrent les critiques et le journal.

## Vérifications

- TypeScript (`npm run typecheck`) : réussi.
- Tests unitaires de requête catalogue et reprise MusicBrainz : 4 réussis.
- ESLint (`npm run lint`) : non terminé ; Expo lint est resté bloqué après le chargement de `.env.local`.
- Tests d'intégration catalogue et journal : non exécutables ici, car l'accès au Supabase local sur `127.0.0.1:54321` a été refusé.
- Déploiement : non effectué. Le branchement de vrais fournisseurs, l'hébergement, l'email et les contrôles de lancement restent décrits dans [la livraison V0.1.0](LIVRAISON-V0.1.0.md).

## Limites connues à suivre

- La recherche au catalogue est faite à la demande ; elle ne télécharge pas automatiquement toute la discographie d'un artiste.
- La résolution des alias, homonymes et fautes de frappe d'artistes devra être améliorée. Un nom approximatif peut ne produire aucun résultat ou une sélection ambiguë.
- L'affichage historique du journal devra conserver le texte de critique tel qu'il était lors de chaque événement, si l'on veut distinguer les versions dans le temps.
- Les fonctionnalités V1 confirmées dans [la spécification produit](V1.md) qui ne figurent pas dans ce patch restent à réaliser : Top 5 albums et morceaux, favoris, listes personnelles, avatar et bannière.

