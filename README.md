# Muscu Kids 💪

Appli mobile de sport gamifiée pour un enfant de 12 ans, façon Duolingo : séances courtes, XP, gems, coffres, quêtes du jour, streak et classement entre joueurs du même téléphone.

C'est une **PWA** (application web installable) : pas d'App Store, on l'ouvre dans le navigateur du téléphone et on l'ajoute à l'écran d'accueil. Elle marche ensuite hors ligne.

## Le programme

- **Réveil express** (matin, ≈4-5 min) : échauffement, 3 exercices, petite suspension à la barre.
- **Séance du soir** (≈15 min) : échauffement, bloc barre de traction, circuit en 2 tours (haut du corps, bas du corps ou corps complet selon le jour), étirements.
- Au choix à chaque séance : **poids du corps** ou **haltères** (disques de 1 à 2,5 kg).
- Les répétitions augmentent doucement avec le niveau (niveaux 1-4, 5-8, 9+).
- **Chemin de la traction** en 6 étapes : suspension → omoplates → négatives → négatives longues → tractions assistées → première traction. Une étape tous les 4 séances du soir.

Tout le contenu est dans [`js/data.js`](js/data.js) : on peut changer exercices, répétitions et récompenses sans toucher au reste.

## La gamification

| Élément | Règle |
| --- | --- |
| ⚡ XP | 20 le matin, 40 le soir, + 2 par jour de streak (max +14). Niveaux à 50, 150, 300, 500 XP… |
| 🔥 Streak | +1 par jour avec au moins une séance. Un jour manqué la remet à zéro, sauf avec un 🧊 gel. Bonus de gems à 3, 7, 14, 30, 50, 100 jours. |
| 🎯 Quêtes du jour | 3 par jour (la première est toujours « Termine une séance »), chacune donne des gems. Les 3 finies = coffre en or. |
| 🎁 Coffres | Bronze après le matin, argent après le soir, or pour les 3 quêtes. On tape 3 fois pour l'ouvrir. |
| 💎 Gems | Boutique : gels de streak (100) et avatars (50 à 400). |
| 🏆 Classement | XP de la semaine (remise à zéro le lundi) ou total, entre les joueurs créés sur le téléphone. |

## Lancer en local

```bash
npm start      # sert le dossier sur http://localhost:8080
npm test       # tests de la logique de jeu (Node 20+)
```

Aucune dépendance à installer : HTML, CSS et JavaScript simples.

## Mettre en ligne (GitHub Pages)

1. Dans le dépôt GitHub : **Settings → Pages → Source : GitHub Actions**.
2. Chaque push sur `main` publie l'appli sur `https://paul2nice.github.io/muscu-kids/`.
3. Sur le téléphone, ouvrir ce lien puis « Ajouter à l'écran d'accueil » (Safari : bouton Partager ; Chrome : menu ⋮).

## Données et suite

Les données restent sur le téléphone (`localStorage`). Le profil « Pour les parents » permet de sauvegarder et restaurer un fichier.

Le journal `sessions` (une ligne par séance : joueur, date, semaine, type, XP) est prévu pour être envoyé plus tard à un petit serveur (Supabase ou Firebase) afin de faire un classement avec les copains sur leurs propres téléphones.
