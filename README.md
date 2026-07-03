# CityCase

CityCase è un MVP web investigativo per esplorare casi storici tramite mappa, nodi, documenti, connessioni, Street View e modalità Live con geolocalizzazione.

Il caso demo `001 — Il Delitto di Domenico Manzoni` non è hardcoded nel frontend: viene caricato dal database tramite seed Prisma.

L'identità ufficiale usa il simbolo `Nodo Intrecciato`, disponibile in `public/brand`.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Google Maps JavaScript API
- Auth mock MVP con utente `demo-user`

## Setup

1. Installa le dipendenze:

```bash
npm install
```

2. Crea `.env` partendo da `.env.example`:

```bash
cp .env.example .env
```

3. Configura PostgreSQL in `DATABASE_URL`, per esempio:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/citycase?schema=public"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
```

Opzionale: se vuoi un PostgreSQL locale rapido, il progetto include `docker-compose.yml`:

```bash
docker compose up -d
```

4. Crea le tabelle:

```bash
npx prisma migrate dev
```

5. Carica il caso demo:

```bash
npm run seed
```

6. Avvia l'app:

```bash
npm run dev
```

Apri `http://localhost:3000`.

## Google Maps e Street View

Senza `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, l'MVP mostra una mappa fallback navigabile con marker demo. Inserendo una chiave valida, l'area centrale usa Google Maps JavaScript API e i nodi `place` mostrano Street View nel pannello destro.

## Modelli Prisma

Lo schema include:

- `City`
- `Case`
- `Node`
- `NodeConnection`
- `Document`
- `Question`
- `LiveUnlock`
- `UserProgress`
- `UserNote`
- `UserConnection`
- `UserTheory`

Enum principali:

- `NodeType`: `person`, `place`, `document`, `event`, `object`, `hypothesis`, `question`
- `ReliabilityLevel`: `verified`, `documented`, `probable`, `oral_tradition`, `citycase_hypothesis`

## Funzioni MVP

- Dashboard fascicoli
- Apertura fascicolo
- Workspace investigativo
- Mappa di Forlì con marker dei luoghi
- Scheda nodo selezionato
- Documenti collegati al nodo
- Connessioni ufficiali e connessioni personali
- Note personali sui nodi
- Timeline semplice
- Google Street View per nodi `place`
- Controllo geolocalizzazione e sblocco contenuti Live se vicino al luogo
