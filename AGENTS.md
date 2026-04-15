# AGENTS.md — AI Coding Guidelines for Tetris Vashchenko Secret

## 🎯 Project Overview

**Tetris Vashchenko Secret: Victoria Edition v2.0** — a competitive web-based Tetris game with JWT authentication, 1v1 multiplayer support, player profiles, leaderboard system, and spectator mode. Built with Node.js/Express backend, vanilla JavaScript frontend, PostgreSQL database, and WebSocket real-time communication.

### Key Stack
- **Backend:** Express.js, Node.js (ES6 modules), JWT authentication
- **Real-time:** WebSocket (ws library) for 1v1 duels & spectating
- **Database:** PostgreSQL with connection pooling (pg library) - **v2.0 schema**
- **Frontend:** Vanilla JS, HTML5 Canvas, CSS3
- **Security:** bcrypt password hashing, JWT tokens
- **Client-Server Protocol:** JSON over WebSocket + REST API

---

## 🏗️ Architecture & Data Flow

### Critical Component Boundaries (v2.0 UPDATED)

**Services** (SOLID principle - one class per file):
- `PlayerService.js` - Register, authenticate, get profile, manage stats
- `RoomService.js` - Create/join rooms, manage participants, cleanup
- `MatchService.js` - Create matches, update results, calculate stats, get leaderboard

**Authentication**:
- `authMiddleware.js` - JWT token generation & verification
- All protected routes require `Authorization: Bearer <token>` header
- Token stored in localStorage on client

**Server** (`server/server.js`):
- Express HTTP server serving static `/client/` folder on port 3000
- REST API routes: `/api/auth/*`, `/api/player/*`, `/api/leaderboard/*`
- WebSocket server managing **rooms** (Map keyed by 6-char alphanumeric codes)
- Each room tracks: `player1`, `player2` (with WS, playerId, name), `spectators` Set, `match` object

**Database v2.0 Schema**:
- `players(player_id, name, email, password_hash, created_at, last_active_at)`
- `rooms(room_code, created_by_player_id, created_at, is_active, ended_at)`
- `room_participants(id, room_code, player_id, role, joined_at, left_at)` - role: 'player1'|'player2'|'spectator'
- `matches(match_id, room_code, player1_id, player2_id, player1_score, player2_score, player1_lines, player2_lines, winner_id, duration_seconds, played_at)`
- `player_stats(player_id, total_score, wins, losses, games_played, total_lines_cleared, best_score, best_lines, avg_score, updated_at)`

**Room Message Types** (understand before modifying WS logic):
```
Client→Server: createRoom, joinRoom, ready, gameState, gameEnd, reaction
Server→Client: roomCreated, joined, countdown, startGame, gameState, matchEnded, reaction
```

**Client** (`client/js/game.js`):
- Game engine: `TetrisGame` class handles board logic (10×20), piece rotations, collision detection
- Canvas rendering: `draw()` function re-renders both player boards every frame
- WebSocket client: receives opponent state, broadcasts own state 60 FPS capped
- Roles: `player1` (creator), `player2` (joiner), `spectator` (observer)
- Auth: Sends JWT token on every connection, retrieves from localStorage

### Why This Architecture?
- **Service-oriented (SOLID):** Each service has single responsibility
- **JWT-based security:** Stateless authentication, scalable to multiple servers
- **Room Map-based:** Transient game sessions, no persistence until match ends
- **Two-table split:** `players` + `player_stats` avoids N+1 queries on leaderboard
- **Token-in-localStorage:** Frontend auth state management (logout clears localStorage)

---

## 🔄 Developer Workflows

### Quick Start Commands (v2.0)
```bash
cd server && npm install           # Install dependencies (one-time)
npm run init-db                    # Create PostgreSQL v2.0 schema (one-time)
npm start                          # Start Express + WS on localhost:3000
```

### Database Migration
- Old schema: `scores(id, name, score, created_at)` — **DEPRECATED**
- New schema: `players`, `rooms`, `room_participants`, `matches`, `player_stats` — **CURRENT**
- Migration file: `server/db/migrations/001_initial_schema.sql`
- Run: `npm run init-db` (drops old `scores` table automatically)

### Authentication Flow
1. **Register**: `POST /api/auth/register` → bcrypt hash password → return JWT token
2. **Login**: `POST /api/auth/login` → verify password → return JWT token
3. **Store**: Token in localStorage, player data in localStorage
4. **Use**: Send `Authorization: Bearer <token>` on all protected requests
5. **Logout**: Clear localStorage, redirect to `/login.html`

### Testing Game Flow
1. Open `http://localhost:3000` → register/login
2. Navigate to `/game.html` → create/join room with JWT
3. Open second browser tab → join same room (spectator)
4. Watch WS messages in DevTools → Network → WS
5. Complete game → check `/profile.html` for updated stats
6. Check `/leaderboard.html` for rank update

---

## 🎮 Project-Specific Patterns

### Tetris Game Logic (`client/js/game.js`)
- **Piece representation:** `PIECES[type][rotation]` = 2D arrays (not strings)
- **Color indexing:** `COLORS[pieceType]` → hex colors (1-indexed, 0=empty)
- **Collision model:** Check bottom, sides, rotation using `collides()` method
- **Score formula:** `clearBonus = clearedLines * 100 + (level * 50)`
- **Speed curve:** `dropInterval = Math.max(50, 1000 - lines * 30)` (accelerates ~30ms per 10 lines)

### Authentication Patterns (v2.0 NEW)
- **JWT Secret:** Stored in `server/.env` as `JWT_SECRET`, never hardcoded
- **Token expiry:** 7 days (configurable in `authMiddleware.js`)
- **bcrypt salt rounds:** 10 (balance between security & speed)
- **Password validation:** Min 6 chars, trim whitespace before hashing
- **Token verification:** Always check `req.player` after authMiddleware

### Service Patterns (SOLID)
```javascript
// Each service is a static class with no state
PlayerService.register(name, email, password)  // throws on duplicate
PlayerService.authenticate(nameOrEmail, password)  // throws on invalid
PlayerService.getStats(playerId)  // initializes if missing
MatchService.updateMatchResult(matchId, scores, lines, duration)  // auto-updates stats
```

### Database Patterns
- **Connection pooling:** `pool.query()` returns Promise, always await
- **Transaction safety:** Wrap multi-step operations in try-catch
- **Foreign keys:** Cascading deletes on `room_participants`, SET NULL on `rooms.created_by`
- **Indexing:** `player_stats.total_score DESC` for fast leaderboard queries

### WebSocket Protocol Details (v2.0 UPDATED)
- **Authentication:** Every message can include `token` field (optional but recommended for `createRoom`)
- **Room codes:** 6-char random alphanumeric (case-insensitive in practice)
- **Message format:** Always `{type: string, code?: string, token?: string, ...payload}` + JSON.stringify()
- **Connection check:** Always test `client.readyState === WebSocket.OPEN` before sending
- **Player data flow:** Server broadcasts gameState without player2 secrets to spectators
- **Ready handshake:** Both players must set `ready: true` → server starts 3-sec countdown → broadcasts `startGame`

### UI Navigation Convention (v2.0 UPDATED)
- **Index pages:** `/` (menu), `/login.html`, `/register.html`, `/game.html`, `/profile.html`, `/leaderboard.html`, `/vanya.html`
- **Protected pages:** `/profile.html`, `/game.html` (redirect to `/login.html` if not authenticated)
- **Public pages:** `/`, `/login.html`, `/register.html`, `/leaderboard.html`, `/vanya.html`
- **Static assets:** `client/css/`, `client/js/`, `client/assets/`
- **Auth state:** Check `authService.isLoggedIn()` before rendering protected content

---

## 🔌 Integration Points & Dependencies (v2.0 UPDATED)

### External Libraries
- **Express 4.19.2:** Used for `app.use()`, `app.post()`, `app.get()`, middleware chain
- **ws 8.18.0:** Creates `WebSocketServer({server: httpServer})` — **not http.Server directly**
- **pg 8.20.0:** Exposes `Pool` for connection pooling (query method returns Promise)
- **bcrypt 5.1.1:** `bcrypt.hash()` for password hashing, `bcrypt.compare()` for verification
- **jsonwebtoken 9.0.2:** `jwt.sign()` & `jwt.verify()` for token management
- **dotenv 16.4.5:** `dotenv.config()` loads `.env` into `process.env`

### Cross-Component Communication
- **HTTP-REST hybrid:** REST endpoints handle persistence & authentication, WS handles real-time state
- **State persistence:** Game session transient in memory, match results persisted to PostgreSQL
- **Auth flow:** Token issued on login, sent with every WS message, verified server-side
- **Error handling:** REST returns JSON `{error: message}`, WS sends `{type: 'error', message}`

### Critical Integration Gotcha
- **Static files served from `/client/` folder relative to server root** — ensure `server/` and `client/` are siblings
- **CORS not needed** — same-origin for dev (same port), configure in production
- **JWT Secret:** Must be environment variable, **never hardcode**
- **Password hashing async:** Always `await bcrypt.hash()` and `await bcrypt.compare()`
- **Token expiry:** Check `jwt.verify()` always, catch expired tokens gracefully
- **Database credentials:** Load from `DATABASE_URL` env var, fallback to hardcoded for dev

---

## ⚠️ Common Pitfalls & Conventions (v2.0 UPDATED)

### Don't
- **Hardcode JWT Secret:** Use `process.env.JWT_SECRET`
- **Store plain passwords:** Always hash with bcrypt before insert
- **Send password_hash to client:** Filter in SELECT queries
- **Trust client tokens without verify:** Always call `jwt.verify()` server-side
- **Forget `await` on async operations:** Promise rejections will crash if not caught
- **Mutate room objects without null checks:** Always verify `room.player1?.ws?.readyState`
- **Forget to close intervals:** Store `clearInterval(id)` references for cleanup on WS close

### Do
- **Always append `msg.code` and `msg.token` to WS messages:** Server uses both
- **Test database init separately:** Run `npm run init-db` before `npm start`
- **Validate input:** Check `msg.name` length, `msg.score` is number, email format
- **Log with type prefix:** `console.log('🔐 Auth:', msg)` pattern aids debugging
- **Use service layer:** Never query DB directly in routes, use `PlayerService`, `MatchService`, etc.
- **Handle crypto operations with try-catch:** bcrypt and jwt can throw
- **Clear sensitive data on logout:** `authService.logout()` clears localStorage + token

### Naming Conventions
- **Rooms:** `roomCode` or `code` (6-char string)
- **Player roles:** `'player1'` | `'player2'` | `'spectator'` (string literals, case-sensitive)
- **Board array:** `board` (2D array where `board[row][col]` is piece type ID 0-7)
- **Services:** `PlayerService`, `RoomService`, `MatchService` (PascalCase, static methods)
- **Auth header:** `Authorization: Bearer <token>` (space between Bearer and token)

---

## 📋 Key Files to Know (v2.0 UPDATED)

| File | Purpose | Ownership |
|------|---------|-----------|
| `server/server.js` | Express + WS entry point, room management | Core logic |
| `server/services/PlayerService.js` | Player CRUD + auth | Auth layer |
| `server/services/RoomService.js` | Room CRUD | Game session layer |
| `server/services/MatchService.js` | Match tracking + stats updates | Persistence layer |
| `server/middleware/authMiddleware.js` | JWT token generation & verification | Security |
| `server/routes/auth.js` | Register/login endpoints | Public API |
| `server/routes/player.js` | Player profile & stats endpoints | Protected API |
| `server/routes/leaderboard.js` | Leaderboard endpoints | Public API |
| `server/db.js` | PostgreSQL connection pool | Database |
| `server/init-db.js` | Schema initialization | One-time setup |
| `server/.env` | Environment variables | Configuration |
| `client/js/game.js` | Tetris engine + WS client | Game logic |
| `client/js/services/authService.js` | Frontend auth state management | Client auth |
| `client/js/auth.js` | Register page logic | UI |
| `client/js/login.js` | Login page logic | UI |
| `client/js/profile.js` | Profile page logic | UI |
| `client/js/leaderboard.js` | Leaderboard page logic | UI |

---

## 🚀 For AI Agents: Quick Checklist Before Code Changes

- [ ] **Database**: Is connection string correct? Does `init-db` run successfully?
- [ ] **JWT**: Is `JWT_SECRET` set in `.env`? Does `verifyToken()` handle expired tokens?
- [ ] **Password**: Is bcrypt used? Are passwords hashed before DB insert?
- [ ] **WebSocket**: Does message have `code` field? Does auth work without token?
- [ ] **Game loop**: Is frame rate capped at 60 FPS? Does `sendMove()` sync properly?
- [ ] **Error handling**: Does try-catch log meaningfully? Does cleanup happen on WS close?
- [ ] **Static files**: Are `.css`, `.js` paths correct relative to `/client/`?
- [ ] **Timestamps**: All game times in milliseconds, DB times in SQL TIMESTAMP?
- [ ] **Service layer**: Is DB access only through services? No direct queries in routes?
- [ ] **Token expiry**: Are expired tokens caught and user redirected to login?

---

## 📚 Reference: Neon Green Theme

The project uses a consistent "Neon Green" aesthetic. Key colors:
- Background: `#0a0a0a` or `#000` (very dark)
- Text/Highlight: `#0f0` (lime green, CSS shorthand for `#00ff00`)
- Pieces: See `COLORS` array in `game.js` (cyan, yellow, green, blue, orange, purple, red)
- Borders: CSS `border: 2px solid #0f0`
- Shadows: `box-shadow: 0 0 15px rgba(0, 255, 0, 0.5)` (0.3 to 0.7 opacity)

When styling new UI elements, follow this pattern for consistency.

---

## 🔐 Security Best Practices

- **JWT Secret:** Generate with `openssl rand -base64 32` for production
- **Password validation:** Min 6 chars, no special requirements (keep simple for UX)
- **HTTPS:** Use in production (WebSocket over WSS)
- **CORS:** Restrict to frontend domain in production
- **SQL Injection:** Use parameterized queries (pg library does this by default)
- **Rate limiting:** Consider adding for auth endpoints (npm package `express-rate-limit`)
- **Token storage:** localStorage (acceptable for SPA), httpOnly cookie (more secure but harder to use with WS)

