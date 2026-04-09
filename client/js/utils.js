// Utils
function copyCode() {
  navigator.clipboard.writeText(roomCode).then(() => {
    const old = document.getElementById('roomCode').textContent;
    document.getElementById('roomCode').textContent = 'Скопировано!';
    setTimeout(() => document.getElementById('roomCode').textContent = old, 2000);
  });
}

