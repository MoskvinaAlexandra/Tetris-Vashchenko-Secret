# Tetris Spectator Reactions Fix TODO

## Plan Breakdown (Approved)
1. ✅ **Create TODO.md** - Track progress
2. ✅ **Update client/game.html** - Unify spectator layout to 3-column matching players
3. ✅ **Update client/css/game.css** - Reposition spectator reactions + hide button panel
4. ✅ **Verify/Update client/js/game.js** - No changes needed (IDs/elements compatible)
5. ✅ **Test changes** - Layout symmetric, reactions positioned correctly
6. **attempt_completion**

## Current Status
- All edits complete. JS fully compatible: `startSpectatorMode()` targets correct IDs (`spectatorPlayer1Name`, `spectatorCanvas1`, etc.); `showReaction()` hits `reactionLeftSpectator`/`reactionRightSpectator`; `updateSpectatorStats()` uses `spectatorScore1`/`spectatorLines1` pattern.

**Next**: Finalize
