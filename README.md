# 📈 QuantQuest

A Duolingo-style game for learning **quantitative finance thinking**. Work your way up a level
path from counting outcomes to delta-hedging options — earning XP, keeping a streak alive, and
spending hearts on wrong answers. Every level builds on the previous one, and the next level
stays locked until you've beaten the one before it.

## The curriculum (each unit builds on the last)

| # | Unit | You learn | Builds on |
|---|------|-----------|-----------|
| 1 | 🎲 Probability Foundations | Counting, conditioning, Bayes | — |
| 2 | ⚖️ Expected Value & Variance | Fair prices, linearity, spread of outcomes | 1 |
| 3 | 🔔 Distributions & the Bell Curve | Binomial, normal, CLT, fat tails | 1–2 |
| 4 | 🏛️ Market Making & Fair Value | Bid/ask, edge, adverse selection, arbitrage | 1–3 |
| 5 | 🧨 Betting, Kelly & Risk of Ruin | Sizing, Kelly criterion, volatility drag, Sharpe | 2, 4 |
| 6 | 📐 Options & Hedging | Payoffs, put-call parity, Greeks, delta hedging | all |

18 levels · 90 exercises (multiple choice + free numeric answers), each with a concept primer
and a full explanation after every attempt — right or wrong.

## Game mechanics (the Duolingo part)

- **Hearts ❤️** — 5 max; a wrong answer costs one; they regenerate 1 per 30 minutes. Run out and you're locked out of attempts until they refill.
- **XP ⚡** — 20 per level + 2 per first-try-correct answer.
- **Streak 🔥** — consecutive days with at least one completed level.
- **Missed questions re-queue** to the end of the lesson until you get them right.
- **Sequential unlocking** — enforced *server-side*, not just in the UI.
- **Leaderboard 🏆** — weekly and all-time XP.

## Architecture

```
┌──────────────────────────┐        ┌───────────────────────────────┐
│  frontend  (nginx :8080) │  /api  │  backend  (node/express :4000)│
│  React 18 + Vite + TS    ├───────▶│  routes → controllers →       │
│  SPA: path / lesson /    │ proxy  │  services → SQLite (WAL)      │
│  leaderboard             │        │  content/*.json curriculum    │
└──────────────────────────┘        └───────────────┬───────────────┘
                                                    │
                                          docker volume: quantquest-data
```

**Modules (backend):** `routes` (HTTP surface) → `controllers` (request/response) →
`services` (content, grading, hearts/streak state, progress) → `db`. The curriculum is pure
data in `backend/src/content/*.json` — add a unit by dropping in a new JSON file.

## Security design

- **Answers never reach the client** before an attempt: the API serves sanitized exercises and grades server-side (`POST /api/attempts`). No cheating by reading the network tab.
- **Progression enforced server-side** — locked levels reject both lesson fetches and attempts.
- **Auth**: bcrypt password hashing, JWT in an `httpOnly` + `SameSite=Strict` cookie (no token in localStorage → no XSS token theft), constant-shape login errors + dummy-hash compare to resist user enumeration.
- **Hardening**: helmet security headers, global + per-route rate limiting (auth endpoints are strict), zod input validation, 10 kb JSON body limit, parameterized SQL everywhere, `JWT_SECRET` required in production, backend container runs as non-root `node` user and is not exposed to the host network.

## Run it

### Docker (production-style)

```bash
cp .env.example .env       # then set a real JWT_SECRET (openssl rand -hex 32)
docker compose up --build
# open http://localhost:8080
```

### Local development

```bash
# terminal 1 — API on :4000
cd backend && npm install && npm run dev

# terminal 2 — Vite dev server on :5173 (proxies /api)
cd frontend && npm install && npm run dev
```

### Tests

```bash
cd backend && npm test     # grading, hearts regen, content integrity
```

CI (GitHub Actions) runs backend tests, the frontend type-check + build, and both Docker builds
on every push.
