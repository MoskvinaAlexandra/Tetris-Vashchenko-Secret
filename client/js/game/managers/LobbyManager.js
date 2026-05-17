import { t } from '../../i18n.js';
export class LobbyManager {
  constructor() {
    this.roomCode = null;
    this.role = null;
    this.isReady = false;
    this.rematchRequested = false;
    this.playerNames = {
      player1: t('player1'),
      player2: t('player2')
    };
    this.spectators = [];
  }
  createRoom(wsClient, myName, token) {
    if (!wsClient) return;
    wsClient.createRoom(myName, token);
  }
  joinRoom(wsClient, code, role, myName, token) {
    if (!wsClient || !code) return;
    wsClient.joinRoom(code, role, myName, token);
  }
  leaveRoom(wsClient) {
    if (!wsClient || !this.roomCode) return;
    wsClient.leaveRoom();
  }
  toggleReady(wsClient) {
    if (this.role === 'spectator' || !this.roomCode) return;
    this.isReady = !this.isReady;
    wsClient.sendReady(this.isReady);
    this.updateReadyButton();
  }
  requestRematch(wsClient) {
    if (this.role === 'spectator' || !this.roomCode || this.rematchRequested) {
      return;
    }
    this.rematchRequested = true;
    const rematchBtn = document.getElementById('rematchBtn');
    if (rematchBtn) {
      rematchBtn.disabled = true;
    }
    wsClient.requestRematch();
  }
  applyRoomState(message) {
    const { player1, player2, spectators } = message;
    if (player1?.name) this.playerNames.player1 = player1.name;
    if (player2?.name) this.playerNames.player2 = player2.name;
    this.spectators = spectators || [];
    this.updateLobbyView({ player1, player2 });
    this.renderSpectatorsLists();
  }
  showLobby() {
    this.showOnly('lobby');
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    if (roomCodeDisplay) {
      roomCodeDisplay.classList.remove('hidden');
      roomCodeDisplay.style.display = 'block';
    }
  }
  showSpectatorLobby() {
    this.showLobby();
  }
  updateRoomCode(code) {
    this.roomCode = code;
    const roomCodeEl = document.getElementById('roomCode');
    if (roomCodeEl) roomCodeEl.textContent = code || '';
  }
  updateLobbyView(players = null) {
    const player1 = players?.player1;
    const player2 = players?.player2;
    const player1NameEl = document.getElementById('player1LobbyName');
    const player2NameEl = document.getElementById('player2LobbyName');
    const player1StatusEl = document.getElementById('player1LobbyStatus');
    const player2StatusEl = document.getElementById('player2LobbyStatus');
    if (player1NameEl) player1NameEl.textContent = this.playerNames.player1;
    if (player2NameEl) player2NameEl.textContent = this.playerNames.player2;
    if (player1StatusEl) player1StatusEl.textContent = this.buildLobbyStatus(player1, 'player1');
    if (player2StatusEl) player2StatusEl.textContent = this.buildLobbyStatus(player2, 'player2');
    this.updateReadyButton();
  }
  updateReadyButton() {
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
      readyBtn.textContent = this.isReady ? t('notReady') : t('ready');
    }
  }
  buildLobbyStatus(slot, role) {
    if (!slot) return t('slotFree');
    if (!slot.connected) return t('slotReconnecting');
    if (slot.ready) return t('slotReady');
    if (this.role === role) return t('slotYouHere');
    return t('slotWaiting');
  }
  renderSpectatorList(listElement, spectators) {
    if (!listElement) return;
    listElement.innerHTML = '';
    if (!spectators.length) {
      const empty = document.createElement('li');
      empty.textContent = t('noSpectators');
      listElement.appendChild(empty);
      return;
    }
    spectators.forEach((spectator) => {
      const item = document.createElement('li');
      item.textContent = spectator.name || `Зритель #${spectator.playerId}`;
      listElement.appendChild(item);
    });
  }
  renderSpectatorsLists() {
    const listIds = ['lobbySpectatorsList', 'gameSpectatorsList', 'spectatorModeList'];
    listIds.forEach((id) => {
      const list = document.getElementById(id);
      this.renderSpectatorList(list, this.spectators);
    });
  }
  resetRoundFlags() {
    this.isReady = false;
    this.rematchRequested = false;
    const rematchBtn = document.getElementById('rematchBtn');
    if (rematchBtn) {
      rematchBtn.disabled = false;
      rematchBtn.textContent = t('rematch');
    }
  }
  getRoomInput() {
    const input = document.getElementById('roomInput');
    return input ? input.value.trim().toUpperCase() : '';
  }
  showOnly(sectionId) {
    document.body.classList.toggle('in-match', sectionId === 'gameArea' || sectionId === 'spectatorArea');
    ['menu', 'lobby', 'gameArea', 'spectatorArea'].forEach((id) => {
      const section = document.getElementById(id);
      if (section) {
        if (id === sectionId) {
          section.classList.remove('hidden');
          section.style.display = 'block';
        } else {
          section.classList.add('hidden');
          section.style.display = 'none';
        }
      }
    });
  }
  resetToMenu() {
    this.roomCode = null;
    this.role = null;
    this.spectators = [];
    this.resetRoundFlags();
    this.showOnly('menu');
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    const countdown = document.getElementById('countdown');
    if (roomCodeDisplay) {
      roomCodeDisplay.classList.add('hidden');
      roomCodeDisplay.style.display = 'none';
    }
    if (countdown) {
      countdown.classList.add('hidden');
      countdown.style.display = 'none';
    }
  }
}