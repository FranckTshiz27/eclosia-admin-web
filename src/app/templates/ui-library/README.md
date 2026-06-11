# Bibliothèque de Modèles UI (UI Library)

Bienvenue dans la bibliothèque de modèles UI de l'application FP-CAREER. Ce dossier contient des extraits de code (HTML + CSS) que vous pouvez copier et coller pour créer rapidement de nouvelles interfaces cohérentes et responsives.

## Structure du Dossier

- **[buttons.template.html](./buttons.template.html)** : Modèles pour les boutons (Primaire, Outline, Danger, Icônes).
- **[cards.template.html](./cards.template.html)** : Différents styles de cartes (Contenu, Statistiques, Actions).
- **[forms.template.html](./forms.template.html)** : Une grille de formulaire complète (Inputs, Selects, Textareas) qui s'adapte automatiquement sur mobile.
- **[tables.template.html](./tables.template.html)** : Tableaux de données avec badges, avatars et défilement horizontal sur mobile.
- **[tabs.template.html](./tabs.template.html)** : Système d'onglets pour organiser le contenu.

## Comment l'utiliser ?

1.  **Ouvrez** le fichier `.html` correspondant à l'élément que vous souhaitez créer.
2.  **Copiez** la section HTML souhaitée dans votre fichier `.component.html`.
3.  **Copiez** les styles CSS (balise `<style>`) dans votre fichier `.component.css`.
4.  **Adaptez** les labels et les liaisons Angular (`[(ngModel)]`, `(click)`, etc.) selon vos besoins.

## Caractéristiques Techniques

- **Responsive Design** : Chaque modèle inclut déjà les `media queries` pour un affichage optimal sur Tablettes et Smartphones.
- **Cohérence Visuelle** : Les couleurs, arrondis (border-radius) et ombres suivent la charte graphique de l'application.
- **Icônes** : Utilise **Bootstrap Icons** (`bi-`).

---
*Généré par Antigravity pour FP-CAREER*
