# Архитектура проекта Tetris Multiplayer

## Оглавление
1. [Текущее состояние](#текущее-состояние)
2. [Проблемы текущей архитектуры](#проблемы-текущей-архитектуры)
3. [Новая архитектура](#новая-архитектура)
4. [План миграции](#план-миграции)
5. [Best Practices](#best-practices)

---

## Текущее состояние

### Структура проекта
```
Tetris-Vashchenko-Secret/
├── client/                  # Frontend (Vanilla JS)
│   ├── js/
│   │   ├── game/           # Игровая логика
│   │   ├── services/       # API сервисы
│   │   ├── utils/          # Утилиты
│   │   └── websocket/      # WebSocket клиент
│   ├── css/                # Стили
│   └── *.html              # HTML страницы
└── server/                 # Backend (Node.js + Express)
    ├── routes/             # HTTP endpoints
    ├── services/           # Бизнес-логика
    ├── websocket/          # WebSocket handlers
    ├── middleware/         # Middleware
    └── db/                 # База данных
```

### Технологический стек
- **Backend**: Node.js, Express, WebSocket (ws), PostgreSQL, JWT, bcrypt
- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5 Canvas, WebSocket API
- **Ограничения**: Запрещены фронтенд-фреймворки и комментарии в коде

### Статус рефакторинга
- ✅ 58% завершено (46 из 79 задач)
- ✅ Все критические P0 задачи выполнены
- 🟡 33 задачи P1 остались
- 🟢 P2 задачи в очереди

---

## Проблемы текущей архитектуры

### 1. Архитектурные проблемы

#### ARCH-10: Прямая зависимость от pool
**Проблема**: Сервисы напрямую импортируют `pool` из `db.js`
```javascript
import pool from '../db.js';
export class PlayerService {
  static async getById(playerId) {
    const result = await pool.query(...);
  }
}
```
**Последствия**: Невозможно тестировать с моками, жесткая связанность

#### ARCH-11: Отсутствие Repository Pattern
**Проблема**: SQL-запросы смешаны с бизнес-логикой в сервисах
**Последствия**: Нарушение SRP, дублирование кода, сложность тестирования

#### ARCH-12: Отсутствие Validation Layer
**Проблема**: Валидация разбросана по routes и services
**Последствия**: Дублирование кода, непоследовательная валидация

#### ARCH-13: WebSocket аутентификация в message handlers
**Проблема**: Токен передается в каждом сообщении
**Последствия**: Неэффективно, небезопасно

### 2. Производительность

- **PERF-1**: Отсутствие индексов на часто запрашиваемых полях
- **PERF-2**: Отсутствие rate limiting
- **PERF-3**: Отправка состояния каждые 50мс (можно оптимизировать)

### 3. Качество кода

- **CODE-1**: Непоследовательные naming conventions
- **CODE-4**: Смешаны async/await и .then()
- **CODE-5**: Хардкод русских строк на сервере

### 4. Frontend проблемы

- **JS-1**: Глобальные функции в window
- **JS-2**: Inline стили в JS
- **JS-3**: Inline обработчики onclick

---

## Новая архитектура

### Принципы новой архитектуры

1. **Layered Architecture** - четкое разделение слоев
2. **Dependency Injection** - инверсия зависимостей
3. **Repository Pattern** - абстракция доступа к данным
4. **Service Layer** - изолированная бизнес-логика
5. **Module Pattern** - инкапсуляция на фронтенде

### Backend Architecture

```
server/
├── src/
│   ├── config/                    # Конфигурация
│   │   ├── database.js           # Настройки БД
│   │   ├── jwt.js                # JWT конфиг
│   │   └── app.js                # Общие настройки
│   │
│   ├── core/                      # Ядро приложения
│   │   ├── database/
│   │   │   ├── DatabaseClient.js # Абстракция БД
│   │   │   └── migrations/       # Миграции
│   │   ├── di/                   # Dependency Injection
│   │   │   ├── Container.js      # IoC контейнер
│   │   │   └── bindings.js       # Регистрация зависимостей
│   │   └── errors/               # Кастомные ошибки
│   │       ├── DomainError.js
│   │       ├── ValidationError.js
│   │       └── NotFoundError.js
│   │
│   ├── domain/                    # Доменная модель
│   │   ├── entities/             # Бизнес-сущности
│   │   │   ├── Player.js
│   │   │   ├── Room.js
│   │   │   ├── Match.js
│   │   │   └── PlayerStats.js
│   │   ├── repositories/         # Интерфейсы репозиториев
│   │   │   ├── IPlayerRepository.js
│   │   │   ├── IRoomRepository.js
│   │   │   ├── IMatchRepository.js
│   │   │   └── IPlayerStatsRepository.js
│   │   └── services/             # Доменные сервисы
│   │       ├── PlayerService.js
│   │       ├── RoomService.js
│   │       ├── MatchService.js
│   │       └── LeaderboardService.js
│   │
│   ├── infrastructure/            # Инфраструктура
│   │   ├── repositories/         # Реализации репозиториев
│   │   │   ├── PostgresPlayerRepository.js
│   │   │   ├── PostgresRoomRepository.js
│   │   │   ├── PostgresMatchRepository.js
│   │   │   └── PostgresPlayerStatsRepository.js
│   │   ├── auth/
│   │   │   ├── JwtService.js
│   │   │   └── PasswordHasher.js
│   │   └── logging/
│   │       └── Logger.js
│   │
│   ├── application/               # Слой приложения
│   │   ├── dtos/                 # Data Transfer Objects
│   │   │   ├── PlayerDTO.js
│   │   │   ├── RoomDTO.js
│   │   │   └── MatchDTO.js
│   │   ├── validators/           # Валидаторы
│   │   │   ├── AuthValidator.js
│   │   │   ├── RoomValidator.js
│   │   │   └── GameStateValidator.js
│   │   └── use-cases/            # Use Cases (опционально)
│   │       ├── CreateRoomUseCase.js
│   │       └── JoinRoomUseCase.js
│   │
│   ├── presentation/              # Слой представления
│   │   ├── http/
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── player.routes.js
│   │   │   │   └── leaderboard.routes.js
│   │   │   ├── controllers/
│   │   │   │   ├── AuthController.js
│   │   │   │   ├── PlayerController.js
│   │   │   │   └── LeaderboardController.js
│   │   │   └── middleware/
│   │   │       ├── authMiddleware.js
│   │   │       ├── errorHandler.js
│   │   │       ├── rateLimiter.js
│   │   │       └── validator.js
│   │   │
│   │   └── websocket/
│   │       ├── WebSocketServer.js
│   │       ├── handlers/
│   │       │   ├── RoomHandler.js
│   │       │   ├── GameHandler.js
│   │       │   ├── ReactionHandler.js
│   │       │   └── RematchHandler.js
│   │       ├── managers/
│   │       │   ├── ConnectionManager.js
│   │       │   ├── RoomManager.js
│   │       │   └── BroadcastManager.js
│   │       └── middleware/
│   │           └── wsAuthMiddleware.js
│   │
│   └── server.js                  # Точка входа
│
├── tests/                         # Тесты
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
└── .env
```

### Frontend Architecture

```
client/
├── js/
│   ├── core/                      # Ядро приложения
│   │   ├── EventBus.js           # Шина событий
│   │   ├── Router.js             # Клиентский роутинг
│   │   └── DI.js                 # Простой DI контейнер
│   │
│   ├── services/                  # Сервисы
│   │   ├── api/
│   │   │   ├── ApiClient.js      # HTTP клиент
│   │   │   ├── AuthApiService.js
│   │   │   ├── PlayerApiService.js
│   │   │   └── LeaderboardApiService.js
│   │   ├── websocket/
│   │   │   ├── WebSocketClient.js
│   │   │   └── MessageHandler.js
│   │   ├── auth/
│   │   │   ├── AuthService.js
│   │   │   └── TokenStorage.js
│   │   └── storage/
│   │       └── LocalStorageService.js
│   │
│   ├── game/                      # Игровая логика
│   │   ├── core/
│   │   │   ├── TetrisEngine.js   # Игровой движок
│   │   │   ├── GameLoop.js       # Игровой цикл
│   │   │   └── InputHandler.js   # Обработка ввода
│   │   ├── entities/
│   │   │   ├── Board.js
│   │   │   ├── Piece.js
│   │   │   └── GameState.js
│   │   ├── rendering/
│   │   │   ├── CanvasRenderer.js
│   │   │   └── UIRenderer.js
│   │   └── constants/
│   │       └── gameConstants.js
│   │
│   ├── modules/                   # Модули страниц
│   │   ├── auth/
│   │   │   ├── LoginModule.js
│   │   │   └── RegisterModule.js
│   │   ├── game/
│   │   │   ├── GameModule.js
│   │   │   ├── LobbyModule.js
│   │   │   └── MatchModule.js
│   │   ├── profile/
│   │   │   └── ProfileModule.js
│   │   └── leaderboard/
│   │       └── LeaderboardModule.js
│   │
│   ├── components/                # Переиспользуемые компоненты
│   │   ├── Modal.js
│   │   ├── Button.js
│   │   ├── Loader.js
│   │   └── Toast.js
│   │
│   ├── utils/                     # Утилиты
│   │   ├── logger.js
│   │   ├── errorHandler.js
│   │   ├── dateFormatter.js
│   │   └── validators.js
│   │
│   └── app.js                     # Точка входа
│
├── css/
│   ├── base/
│   │   ├── reset.css
│   │   ├── variables.css
│   │   └── typography.css
│   ├── components/
│   │   ├── buttons.css
│   │   ├── modals.css
│   │   └── forms.css
│   ├── layouts/
│   │   ├── navigation.css
│   │   └── grid.css
│   ├── pages/
│   │   ├── game.css
│   │   ├── profile.css
│   │   └── leaderboard.css
│   └── main.css                   # Главный файл
│
└── index.html
```

---

## Ключевые паттерны и решения

### 1. Dependency Injection Container

```javascript
class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  register(name, factory, singleton = false) {
    this.services.set(name, { factory, singleton });
  }

  resolve(name) {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service ${name} not found`);

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this));
      }
      return this.singletons.get(name);
    }

    return service.factory(this);
  }
}
```

### 2. Repository Pattern

```javascript
class IPlayerRepository {
  async findById(playerId) { throw new Error('Not implemented'); }
  async findByEmail(email) { throw new Error('Not implemented'); }
  async create(playerData) { throw new Error('Not implemented'); }
  async update(playerId, data) { throw new Error('Not implemented'); }
}

class PostgresPlayerRepository extends IPlayerRepository {
  constructor(dbClient) {
    super();
    this.db = dbClient;
  }

  async findById(playerId) {
    const result = await this.db.query(
      'SELECT * FROM players WHERE player_id = $1',
      [playerId]
    );
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  mapToEntity(row) {
    return new Player({
      id: row.player_id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at
    });
  }
}
```

### 3. Service Layer

```javascript
class PlayerService {
  constructor(playerRepository, passwordHasher, jwtService) {
    this.playerRepo = playerRepository;
    this.passwordHasher = passwordHasher;
    this.jwtService = jwtService;
  }

  async register(name, email, password) {
    const existing = await this.playerRepo.findByEmail(email);
    if (existing) {
      throw new ValidationError('Email already registered');
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const player = await this.playerRepo.create({
      name,
      email,
      passwordHash
    });

    return player;
  }

  async login(email, password) {
    const player = await this.playerRepo.findByEmail(email);
    if (!player) {
      throw new ValidationError('Invalid credentials');
    }

    const isValid = await this.passwordHasher.verify(password, player.passwordHash);
    if (!isValid) {
      throw new ValidationError('Invalid credentials');
    }

    const token = this.jwtService.sign({ playerId: player.id });
    return { player, token };
  }
}
```

### 4. WebSocket Authentication (Upgrade)

```javascript
wss.on('upgrade', async (request, socket, head) => {
  try {
    const token = extractTokenFromRequest(request);
    const decoded = await jwtService.verify(token);
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.playerId = decoded.playerId;
      ws.playerName = decoded.name;
      wss.emit('connection', ws, request);
    });
  } catch (error) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
});
```

### 5. Frontend Module Pattern

```javascript
const GameModule = (() => {
  let wsClient;
  let gameEngine;
  let renderer;

  const init = (dependencies) => {
    wsClient = dependencies.wsClient;
    gameEngine = new TetrisEngine();
    renderer = new CanvasRenderer(document.getElementById('canvas'));
    
    setupEventListeners();
  };

  const setupEventListeners = () => {
    wsClient.on('gameStart', handleGameStart);
    wsClient.on('gameState', handleGameState);
    wsClient.on('gameEnd', handleGameEnd);
  };

  const handleGameStart = (data) => {
    gameEngine.start(data.seed);
    renderer.render(gameEngine.getState());
  };

  return {
    init,
    destroy: () => {
      wsClient.off('gameStart', handleGameStart);
      wsClient.off('gameState', handleGameState);
      wsClient.off('gameEnd', handleGameEnd);
    }
  };
})();
```

### 6. Event Bus для Frontend

```javascript
class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.events.has(event)) return;
    const callbacks = this.events.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) callbacks.splice(index, 1);
  }

  emit(event, data) {
    if (!this.events.has(event)) return;
    this.events.get(event).forEach(callback => callback(data));
  }
}
```

---

## План миграции

### Этап 1: Подготовка инфраструктуры (2-3 дня)

1. Создать новую структуру папок
2. Настроить DI Container
3. Создать базовые абстракции (DatabaseClient, Logger, Errors)
4. Настроить систему миграций БД

### Этап 2: Миграция Data Layer (3-4 дня)

1. Создать интерфейсы репозиториев
2. Реализовать PostgreSQL репозитории
3. Создать Entity классы
4. Покрыть тестами репозитории

### Этап 3: Миграция Business Logic (4-5 дней)

1. Рефакторить сервисы с использованием DI
2. Добавить валидацию через Validators
3. Создать DTOs для передачи данных
4. Покрыть тестами сервисы

### Этап 4: Миграция HTTP Layer (2-3 дня)

1. Рефакторить контроллеры
2. Добавить middleware (rate limiting, validation)
3. Улучшить обработку ошибок
4. Добавить CORS конфигурацию

### Этап 5: Миграция WebSocket Layer (3-4 дня)

1. Переместить аутентификацию в upgrade
2. Рефакторить handlers с использованием DI
3. Добавить heartbeat механизм
4. Оптимизировать broadcast логику

### Этап 6: Миграция Frontend (5-6 дней)

1. Создать Module Pattern структуру
2. Реализовать Event Bus
3. Разделить API и WebSocket клиенты
4. Убрать глобальные функции
5. Рефакторить игровую логику

### Этап 7: Тестирование и оптимизация (3-4 дня)

1. Написать unit тесты
2. Написать integration тесты
3. Провести нагрузочное тестирование
4. Оптимизировать производительность

### Этап 8: Документация и деплой (2 дня)

1. Обновить README
2. Создать API документацию
3. Настроить CI/CD
4. Деплой на production

**Общее время: 24-31 день**

---

## Best Practices

### Backend

1. **Всегда используй Dependency Injection**
   - Не импортируй зависимости напрямую
   - Передавай через конструктор
   - Регистрируй в DI контейнере

2. **Разделяй слои**
   - Repository - только SQL
   - Service - только бизнес-логика
   - Controller - только HTTP
   - Handler - только WebSocket

3. **Используй TypeScript типы через JSDoc**
   ```javascript
   /**
    * @param {number} playerId
    * @param {string} email
    * @returns {Promise<Player>}
    */
   async findById(playerId) { }
   ```

4. **Валидируй на входе**
   - Используй валидаторы перед сервисами
   - Возвращай понятные ошибки
   - Не доверяй клиентским данным

5. **Обрабатывай ошибки правильно**
   - Используй кастомные классы ошибок
   - Логируй все ошибки
   - Не показывай внутренние детали клиенту

### Frontend

1. **Используй Module Pattern**
   - Инкапсулируй логику в модули
   - Экспортируй только публичный API
   - Избегай глобальных переменных

2. **Разделяй ответственность**
   - Rendering - только отрисовка
   - Services - только API/WebSocket
   - Modules - только координация

3. **Используй Event Bus**
   - Для связи между модулями
   - Для реакции на WebSocket события
   - Для глобальных уведомлений

4. **Управляй состоянием**
   - Храни состояние в одном месте
   - Не дублируй данные
   - Используй immutable подход где возможно

5. **Оптимизируй рендеринг**
   - Рендери только при изменениях
   - Используй requestAnimationFrame
   - Избегай layout thrashing

### WebSocket

1. **Аутентификация при подключении**
   - Проверяй токен в upgrade
   - Не передавай токен в сообщениях
   - Закрывай соединение при ошибке

2. **Используй heartbeat**
   - Ping каждые 30 секунд
   - Закрывай мертвые соединения
   - Логируй отключения

3. **Структурируй сообщения**
   ```javascript
   {
     type: 'gameState',
     data: { ... },
     timestamp: Date.now()
   }
   ```

4. **Обрабатывай ошибки**
   - Валидируй входящие сообщения
   - Отправляй ошибки клиенту
   - Не роняй сервер

5. **Оптимизируй broadcast**
   - Отправляй только изменения
   - Используй binary protocol для больших данных
   - Группируй сообщения где возможно

### База данных

1. **Используй транзакции**
   - Для связанных операций
   - Для обеспечения консистентности
   - Откатывай при ошибках

2. **Добавляй индексы**
   - На часто запрашиваемые поля
   - На foreign keys
   - Проверяй query plans

3. **Используй connection pool**
   - Настрой правильный размер
   - Обрабатывай ошибки подключения
   - Закрывай соединения

4. **Пиши миграции правильно**
   - Всегда добавляй down миграцию
   - Тестируй на копии БД
   - Делай бэкапы перед миграцией

---

## Заключение

Новая архитектура решает все выявленные проблемы:

✅ Четкое разделение слоев  
✅ Dependency Injection для тестируемости  
✅ Repository Pattern для абстракции данных  
✅ Валидация на входе  
✅ Правильная WebSocket аутентификация  
✅ Module Pattern на фронтенде  
✅ Event-driven архитектура  
✅ Масштабируемость и поддерживаемость  

Миграция займет 24-31 день при последовательном выполнении этапов.
