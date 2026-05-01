# Guess the Song

Jeu de soirée multijoueur : chaque joueur soumet une chanson, puis tout le monde essaie de deviner qui a ajouté chaque morceau.

## Prérequis

- [Node.js](https://nodejs.org/) v18+

## Installation

```bash
npm install
```

## Lancer le serveur

```bash
# Production
npm start

# Développement (rechargement automatique)
npm run dev
```

Le serveur écoute sur **http://localhost:3000** par défaut.

## Comment jouer

1. Un joueur crée une salle et partage le code à ses amis.
2. Chaque joueur recherche et soumet une chanson via l'API iTunes.
3. Une fois tous les joueurs prêts, l'hôte lance la partie.
4. Pour chaque chanson, les joueurs devinent qui l'a soumise.
5. Les résultats s'affichent après chaque morceau.

## Stack technique

- **Backend** : Node.js + Express + Socket.IO
- **Frontend** : HTML / CSS / JavaScript vanilla
- **API** : iTunes Search API (previews 30 s)
