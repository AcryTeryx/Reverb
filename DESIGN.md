# Reverb — conventions visuelles V0.1.0

Direction fonctionnelle approuvée : sobre, centrée sur les pochettes, bibliothèque/recherche/profil, clair et sombre, accent vert discret, navigation clavier, aucune animation décorative. La finition graphique reste une étape ultérieure.

- Composants : React Native Reusables (boutons, champs, cartes, textes, badges), NativeWind, Lucide.
- Couleurs sémantiques : variables `background`, `foreground`, `primary`, `muted`, `border`, `destructive` dans `apps/client/global.css`. Aucun sens porté uniquement par la couleur.
- Fond clair légèrement chaud, fond sombre vert charbon ; le vert indique l'action principale et la note.
- Police système ; titres courts, textes secondaires lisibles, contenu centré, largeur maximale de 1152 px.
- Pochettes carrées, repli explicite si indisponibles. Grille : 2 colonnes étroites, puis 3/4/6 colonnes selon la largeur.
- Fiche album : pile verticale sur téléphone ; pochette à gauche et actions à droite sur tablette et ordinateur.
- Champs nommés, liens explicites, focus visible, boutons désactivés pendant la sauvegarde, messages d'état et d'erreur accessibles.
- Pas de score communautaire fictif, de compte simulé dans l'interface ou de contenu social anticipant la V1 multiuser.
