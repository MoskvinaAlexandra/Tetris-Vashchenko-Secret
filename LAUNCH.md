
# Tetris Vashchenko Secret: Victoria Edition 😎

Веб-приложение с классическим Тетрисом для студентов группы ФТ-202-1, поддерживающее:
- ✅ Игру в тетрис в браузере
- ✅ Дуэли 1v1 со зрительным залом (WebSocket)
- ✅ Сохранение результатов в БД
- ✅ Таблицу top-10 лидеров
- ✅ О Ване Ващенко ✨

---

## 🚀 Быстрый старт

### Требования
- **Node.js** v18+
- **PostgreSQL** (версия 10+, слушает на localhost:5432)

### Установка и запуск

#### 1️⃣ Установить зависимости (server/)
```bash
cd server
npm install
```

#### 2️⃣ Инициализировать БД (создать таблицу scores)
```bash
npm run init-db
```

#### 3️⃣ Запустить сервер
```bash
npm start
```
✅ Сервер будет доступен на **http://localhost:3000**

#### 4️⃣ Открыть браузер
Переди на **http://localhost:3000** и играй!

---

## 📋 Основные страницы

| Страница | Путь | Функция |
|----------|------|---------|
| **Главная меню** | `/` | Кнопки: Играть, ТОП, О Ване |
| **Игра 1v1** | `/game.html` | Дуэль 1v1 + зрители |
| **Топ игроков** | `/leaderboard.html` | Таблица top-10 |
| **О Ване** | `/vanya.html` | Info о Ване Ващенко |

---

## 🎮 Как играть

### Создание комнаты:
1. Перейди на `/game.html`
2. Нажми **"Создать новую комнату"** → Введи своё имя → Получи код комнаты
3. Поделись кодом с противником

### Присоединение:
1. Введи полученный код
2. Выбери **"Присоединиться как ИГРОК"** или **"Зайти как ЗРИТЕЛЬ"**
3. Нажми **"Готов"** обе стороны → Начнётся отсчёт → Игра!

### Управление:
- **←/→** - Движение влево/вправо
- **↑** - Ротация фигуры
- **↓** - Ускоренное падение
- **Пробел** - Hard Drop

---

## 🏗️ Структура проекта

```
tetris-vashchenko-secret/
├── client/                      # ✅ Клиентская часть
│   ├── index.html              # Главное меню
│   ├── game.html               # Игра 1v1
│   ├── leaderboard.html        # Топ-10 лидеров
│   ├── vanya.html              # О Ване Ващенко
│   ├── css/
│   │   └── game.css            # Стили (Neon Green Theme)
│   └── js/
│       ├── game.js             # Логика тетриса + WebSocket
│       └── utils.js            # Утилиты (copyCode)
│
├── server/                      # ✅ Серверная часть
│   ├── server.js               # Express + WebSocket сервер
│   ├── db.js                   # PostgreSQL pool
│   ├── init-db.js              # Инициализация БД
│   ├── package.json            # Зависимости
│   └── routes/
│       └── scores.js           # (примеры для будущего)
│
├── README.md                    # (этот файл)
├── TODO.md                      # История развития
└── .git/                        # Git репозиторий
```

---

## 🔗 API Endpoints

| Метод | Путь | Тело запроса | Ответ |
|-------|------|-------------|-------|
| `POST` | `/api/scores` | `{name, score}` | `{success: true}` |
| `GET` | `/api/top10` | - | `[{name, score, created_at}, ...]` |

**Пример сохранения очков:**
```bash
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -d '{"name":"Ваня","score":12345}'
```

---

## 🌐 WebSocket события

### Client → Server
- `{type: 'createRoom', name}` - Создать комнату
- `{type: 'joinRoom', code, role, name}` - Присоединиться (role: 'player2' | 'spectator')
- `{type: 'ready', code, ready}` - Готовность к игре
- `{type: 'gameState', code, state}` - Отправить состояние доски
- `{type: 'reaction', code, reaction}` - Отправить реакцию (👍, 🔥 и т.д.)

### Server → Client
- `{type: 'roomCreated', code, role}` - Комната создана
- `{type: 'joined', code, role, opponent}` - Успешно присоединился
- `{type: 'countdown', count}` - Отсчёт перед игрой (3, 2, 1, 0)
- `{type: 'startGame', code}` - Начало игры
- `{type: 'playerReady', ready}` - Статус противника
- `{type: 'gameState', state}` - Состояние доски противника
- `{type: 'reaction', reaction}` - Реакция противника

---

## 🐞 Troubleshooting

### ❌ "Connection refused" при запуске
- **Проверь:** Сервер запущен? `npm start` в `server/`?
- **Порт 3000 занят?** Используй `npm start` с `PORT=3001 npm start`

### ❌ "Cannot connect to database"
- **Проверь:** PostgreSQL запущен? (`psql` доступен)
- **Инициализировал БД?** `npm run init-db` не ошибался?
- **Креденшалы:** Пользователь `postgres`, пароль `postgres`

### ❌ Таблица лидеров пуста
- Запусти `npm run init-db` ещё раз
- Сыграй в игру и заверши её — очки сохранятся

---

## 📦 Зависимости

**Server (server/package.json):**
- `express@^4.19.2` - HTTP сервер
- `ws@^8.18.0` - WebSocket
- `pg@^8.13.0` - PostgreSQL клиент

**Client:**
- Vanilla JavaScript (Chrome, Firefox, Safari)

---

## 👨‍💻 Автор
Разработано для студентов группы ФТ-202-1  
**Главная звезда:** Ваня Ващенко ✨😎

---

## 📝 Лицензия
Для любительского использования. Не для коммерции.

---

## ✨ Спасибо за внимание!
Добро пожаловать в **Tetris Vashchenko Secret: Victoria Edition** — уникальный опыт дуэльного тетриса!
