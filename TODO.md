# TODO — Multiplayer/Lobby/Game Fixes

## Status Legend
- `[ ]` not started
- `[-]` in progress
- `[x]` done

## 1) Lobby layout: second player must be on the right
- [x] Fix player slot mapping so `player1` is always left and `player2` is always right in lobby and game UI.
- [x] Ensure perspective changes do not swap logical slots.

## 2) Spectators shown separately from players in lobby
- [x] Add separate spectator list area in lobby.
- [x] Keep player slots fixed even when spectators join/leave.
- [x] Broadcast spectator updates to everyone in room.

## 3) Reconnect support when player drops before game start
- [x] Add player slot reservation for disconnected players.
- [x] Allow only same player to reclaim reserved slot (`player1`/`player2`).
- [x] Prevent "Invalid role or slot taken" for valid rejoin case.
- [x] Add reservation timeout cleanup.

## 4) Game should start when both players click Ready
- [x] Harden `ready` logic against stale sockets/flags.
- [x] Ensure countdown starts exactly once and `startGame` is sent reliably.

## 5) Falling speed desync and perceived stutter
- [x] Make piece sequence deterministic for both players at round start (shared seed/bag).
- [x] Improve tick timing (avoid drift from `setInterval`).
- [x] Reduce unnecessary WS spam to smooth gameplay.

## 6) Cell glow/performance
- [x] Profile rendering hot path and optimize expensive canvas operations.
- [x] Keep glow if performance remains acceptable.

## 7) Move reaction buttons to the left of game fields
- [x] Redesign game layout with left reactions panel.

## 8) Spectators list on the right of game fields
- [x] Add right-side spectators panel during match.

## 9) Add early exit button (right-bottom)
- [x] Add dedicated "leave match" button at bottom-right.
- [x] Wire button to WS leave/forfeit flow.

## 10) Everything must fit on one screen
- [x] Rework responsive layout to avoid vertical scrolling on common desktop sizes.
- [x] Validate mobile fallback without breaking desktop one-screen target.

## 11) Reactions currently not visible
- [x] Implement visible reaction bubbles near sender side (left for player1, right for player2).
- [x] Show same reaction placement for both players and spectators.
- [x] Add short-lived animation/timeout cleanup.

## 12) If player leaves: forfeit/loss + win for opponent, room closes
- [x] Detect in-match player disconnect and auto-forfeit.
- [x] Persist result to DB as loss/win.
- [x] Notify remaining player and redirect to room menu.
- [x] Close room after result handling.

## 13) Find and fix additional logical bugs proactively
- [x] Add guards against null room participants in all WS handlers.
- [x] Prevent duplicated end-of-match writes.
- [x] Ensure disconnect cleanup handles spectators safely.
- [x] Sanity-check auth handling for WS messages.

---

## Progress Log
- 2026-04-17: Created task breakdown and tracking structure. Started implementation phase.
- 2026-04-17: Implemented server/client fixes for lobby slots, spectators, reconnect, ready/start flow, reactions, forfeit-on-leave, and one-screen game layout.
