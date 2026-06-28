# Guess the Song 🎵

Jeu de soirée multijoueur : chaque joueur soumet des chansons, puis tout le monde essaie de deviner qui a ajouté chaque morceau.

🔗 **Demo** : [guess song demo](https://guesssong-hza2.onrender.com/)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat&logo=socket.io&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Deezer](https://img.shields.io/badge/Deezer_API-EF5466?style=flat&logo=deezer&logoColor=white)

## Stack

- **Backend** : Node.js + Express 5 + Socket.IO (TypeScript)
- **Frontend** : React 19 + Vite + Tailwind CSS (TypeScript)
- **API musique** : Deezer Search API (previews 30 s)

> ⚠️ **Note légale** : les conditions de l'API Deezer interdisent tout usage commercial.
> Voir `claude/Plan_conformite_juridique_guess_song.md` avant toute monétisation.

## Prérequis

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) (gestionnaire de paquets du monorepo)

## Structure

```
app/
├── server/   # API Express + Socket.IO
└── client/   # Application React (Vite)
```

## Installation

```bash
pnpm install
```

## Lancer en développement

Le projet est un monorepo : le serveur et le client se lancent séparément, dans **deux terminaux**, à la racine du projet.

```bash
# Terminal 1 — serveur
pnpm dev:server      # → http://localhost:3000
```

```bash
# Terminal 2 — client
pnpm dev:client      # → http://localhost:5173
```

Ouvre ensuite **http://localhost:5173**. Le client redirige les appels `/api` vers le serveur (`:3000`) via le proxy Vite.

## Build / Production

```bash
# Serveur
pnpm --filter server build
pnpm --filter server start

# Client (build statique dans app/client/dist)
pnpm --filter client build
pnpm --filter client preview   # prévisualisation locale du build
```

## Variables d'environnement

**Serveur** (`app/server`)

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port d'écoute du serveur |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origine autorisée (CORS + Socket.IO) |
| `MAX_ACTIVE_ROOMS` | `5000` | Nombre maximal de salons simultanés |
| `MAX_PLAYERS_PER_ROOM` | `8` | Joueurs maximum par salon |
| `TRUST_PROXY` | `0` | Confiance au proxy pour l'IP (rate limiting) |

**Client** (`app/client`)

| Variable | Défaut | Description |
|---|---|---|
| `VITE_CLIENT_SOCKET` | `http://localhost:3000` | URL du serveur Socket.IO |

## Pages légales & RGPD

Le client inclut des pages légales accessibles depuis le pied de page de l'accueil :

- `/#/mentions-legales`
- `/#/cgu`
- `/#/confidentialite`

ainsi qu'une bannière de consentement aux cookies. Ces pages sont des **gabarits** à compléter (identité de l'éditeur, SIRET, contact, hébergeur) et à faire valider juridiquement avant toute monétisation.

## Comment jouer

1. Un joueur crée une salle et partage le code à ses amis (2 à 8 joueurs).
2. L'hôte configure le nombre de chansons par joueur (2 à 6).
3. Chaque joueur recherche et soumet ses chansons.
4. Une fois tous les joueurs prêts, l'hôte lance la partie.
5. Pour chaque chanson, les joueurs devinent qui l'a soumise.
6. Les résultats s'affichent après chaque morceau, avec un récap final.

## Fonctionnalités

- Salles temps réel via **Socket.IO**
- Reconnexion automatique après un F5
- Liens d'invitation partageables
- Mélange aléatoire de la playlist
- Score par manche + récapitulatif en fin de partie
