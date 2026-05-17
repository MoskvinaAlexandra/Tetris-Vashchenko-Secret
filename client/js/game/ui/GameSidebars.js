const REACTION_BUTTONS = ['👏', '🔥', '💎', '❤️', '😡', '🎉', '⚡'];

function buildReactionButtons() {
  return REACTION_BUTTONS.map((emoji) => `
    <button class="vs-button-secondary reaction-button" type="button" onclick="sendReaction('${emoji}')"><span>${emoji}</span></button>
  `).join('');
}

function buildPlayerLeftSidebar() {
  return `
    <aside class="left-controls-panel">
      <div class="room-code-panel">
        <button id="matchRoomCodeBtn" class="vs-button-secondary leave-match-btn match-room-code-btn" type="button" onclick="copyCode()">----</button>
      </div>
      <div class="reaction-panel">
        <p class="reaction-target-label">Реакции для</p>
        <div class="reaction-target-row">
          <button id="playerReactionTargetBtn" class="vs-button-secondary target-toggle-button single-target-button active-target inert-target-button" type="button" tabindex="-1" aria-disabled="true">Соперник</button>
        </div>
        <hr class="reaction-divider">
        <div class="reaction-column">
          ${buildReactionButtons()}
        </div>
      </div>
    </aside>
  `;
}

function buildPlayerRightSidebar() {
  return `
    <aside class="right-side-panel">
      <button class="vs-button-secondary leave-match-btn" type="button" onclick="toggleSettings()" title="Открыть настройки">Настройки</button>
      <div class="spectator-panel in-game">
        <h3>Зрители</h3>
        <ul id="gameSpectatorsList" class="spectator-list"></ul>
      </div>
      <button class="vs-button-secondary leave-match-btn" type="button" onclick="leaveRoom()">Выйти из матча</button>
    </aside>
  `;
}

function buildSpectatorLeftSidebar() {
  return `
    <aside class="left-controls-panel spectator-controls">
      <div class="room-code-panel">
        <button id="spectatorRoomCodeBtn" class="vs-button-secondary leave-match-btn match-room-code-btn" type="button" onclick="copyCode()">----</button>
      </div>
      <div class="reaction-panel">
        <p class="reaction-target-label">Реакции для</p>
        <div class="reaction-target-row">
          <button id="spectatorTargetPlayer1" class="vs-button-secondary target-toggle-button" type="button" onclick="setSpectatorReactionTarget('player1')">Игрок 1</button>
          <button id="spectatorTargetPlayer2" class="vs-button-secondary target-toggle-button" type="button" onclick="setSpectatorReactionTarget('player2')">Игрок 2</button>
        </div>
        <hr class="reaction-divider">
        <div class="reaction-column">
          ${buildReactionButtons()}
        </div>
      </div>
    </aside>
  `;
}

function buildSpectatorRightSidebar() {
  return `
    <aside class="right-side-panel">
      <button class="vs-button-secondary leave-match-btn" type="button" onclick="toggleSettings()" title="Открыть настройки">Настройки</button>
      <div class="spectator-panel in-game">
        <h3>Зрители</h3>
        <ul id="spectatorModeList" class="spectator-list"></ul>
      </div>
      <button class="vs-button-secondary leave-match-btn" type="button" onclick="leaveRoom()">Покинуть комнату</button>
    </aside>
  `;
}

export function renderGameSidebars() {
  const mounts = {
    gameLeftSidebar: buildPlayerLeftSidebar(),
    gameRightSidebar: buildPlayerRightSidebar(),
    spectatorLeftSidebar: buildSpectatorLeftSidebar(),
    spectatorRightSidebar: buildSpectatorRightSidebar()
  };

  Object.entries(mounts).forEach(([id, markup]) => {
    const mount = document.getElementById(id);
    if (mount) {
      mount.innerHTML = markup;
    }
  });
}
