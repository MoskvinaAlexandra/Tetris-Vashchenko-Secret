function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU');
}
function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('ru-RU');
}
function formatDateTime(date) {
  const d = new Date(date);
  return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU')}`;
}
function formatRelativeTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) {
    return 'только что';
  } else if (diffMin < 60) {
    return `${diffMin} ${pluralize(diffMin, 'минуту', 'минуты', 'минут')} назад`;
  } else if (diffHour < 24) {
    return `${diffHour} ${pluralize(diffHour, 'час', 'часа', 'часов')} назад`;
  } else if (diffDay < 7) {
    return `${diffDay} ${pluralize(diffDay, 'день', 'дня', 'дней')} назад`;
  } else {
    return formatDate(d);
  }
}
function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few;
  } else {
    return many;
  }
}
if (typeof window !== 'undefined') {
  window.formatDate = formatDate;
  window.formatTime = formatTime;
  window.formatDateTime = formatDateTime;
  window.formatRelativeTime = formatRelativeTime;
  window.pluralize = pluralize;
}