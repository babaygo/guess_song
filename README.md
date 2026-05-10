# Guess the Song 🎵

Jeu de soirée multijoueur : chaque joueur soumet des chansons, puis tout le monde essaie de deviner qui a ajouté chaque morceau.

🔗 **Demo** : [guess song demo](https://guessthesong-wqnf.onrender.com/)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat&logo=socket.io&logoColor=white)
![Deezer](https://img.shields.io/badge/Deezer_API-EF5466?style=flat&logo=deezer&logoColor=white)

## Stack

- **Backend** : Node.js + Express + Socket.IO
- **Frontend** : HTML / CSS / JavaScript vanilla
- **API** : Deezer Search API (previews 30 s)

## Prérequis

- [Node.js](https://nodejs.org/) v18+

## Lancer

```bash
npm install
```

```bash
# Développement (rechargement automatique)
npm run dev

# Production
npm start
```

Le serveur tourne sur **http://localhost:3000** par défaut.

## Comment jouer

1. Un joueur crée une salle et partage le code à ses amis (2 à 8 joueurs).
2. L'hôte configure le nombre de chansons par joueur (2 à 6).
3. Chaque joueur recherche et soumet ses chansons via l'API Deezer.
4. Une fois tous les joueurs prêts, l'hôte lance la partie.
5. Pour chaque chanson, les joueurs devinent qui l'a soumise.
6. Les résultats s'affichent après chaque morceau, avec un récap final.

## Fonctionnalités

- Salles temps réel via **Socket.IO**
- Reconnexion automatique après un F5
- Mélange aléatoire de la playlist
- Score par manche + récapitulatif en fin de partie
