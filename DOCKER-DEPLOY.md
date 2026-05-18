# 🐳 Docker Deployment Guide - Tetris Vashchenko Secret

## Архитектура

```
Пользователи → Nginx (80/443) → Node.js (3000) → PostgreSQL (5432)
```

**3 контейнера:**
- `tetris-nginx` - Nginx reverse proxy + статические файлы
- `tetris-app` - Node.js backend (Express + WebSocket)
- `tetris-db` - PostgreSQL база данных

---

## 🚀 Быстрый старт (локально)

### Предварительные требования
- Docker Desktop установлен
- Docker Compose установлен

### Шаги

1. **Создать `.env` файл (уже создан):**
```bash
cp .env.example .env
```

2. **Запустить контейнеры:**
```bash
docker-compose up --build
```

3. **Открыть браузер:**
```
http://localhost
```

4. **Остановить контейнеры:**
```bash
docker-compose down
```

5. **Остановить и удалить данные БД:**
```bash
docker-compose down -v
```

---

## 🌐 Деплой на VPS (Production)

### 1. Подготовка VPS

```bash
# Подключиться к VPS
ssh user@your-vps-ip

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установить Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Клонировать репозиторий

```bash
git clone <your-repo-url>
cd Tetris-Vashchenko-Secret
```

### 3. Настроить переменные окружения

```bash
# Создать .env файл
nano .env
```

**Важно! Измените следующие значения:**
```env
POSTGRES_PASSWORD=strong-random-password-here
JWT_SECRET=another-strong-random-secret-here
DB_SSL=false
AUTO_INIT_DB=true
HTTP_PORT=80
HTTPS_PORT=443
```

**Генерация сильных секретов:**
```bash
# Для POSTGRES_PASSWORD
openssl rand -base64 32

# Для JWT_SECRET
openssl rand -base64 64
```

### 4. Запустить приложение

```bash
# Запустить в фоновом режиме
docker-compose up -d --build

# Проверить статус
docker-compose ps

# Посмотреть логи
docker-compose logs -f
```

### 5. Проверить работу

```bash
# Открыть в браузере
http://your-vps-ip
```

---

## 🔒 Настройка HTTPS (SSL)

### Вариант A: Let's Encrypt (бесплатный SSL)

1. **Установить Certbot:**
```bash
sudo apt update
sudo apt install certbot
```

2. **Остановить Nginx контейнер:**
```bash
docker-compose stop nginx
```

3. **Получить сертификат:**
```bash
sudo certbot certonly --standalone -d your-domain.com
```

4. **Скопировать сертификаты:**
```bash
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
sudo chmod 644 ssl/*.pem
```

5. **Раскомментировать HTTPS блок в `nginx.conf`:**
   - Открыть `nginx.conf`
   - Найти секцию `# HTTPS Server`
   - Раскомментировать весь блок
   - Изменить `server_name your-domain.com;` на ваш домен

6. **Перезапустить контейнеры:**
```bash
docker-compose up -d --build
```

7. **Настроить автообновление сертификата:**
```bash
sudo crontab -e
# Добавить строку:
0 0 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /path/to/project/ssl/ && docker-compose restart nginx
```

### Вариант B: Cloudflare (проще)

1. Добавить домен в Cloudflare
2. Включить SSL/TLS в режиме "Flexible"
3. Настроить DNS A-запись на IP вашего VPS
4. Готово! Cloudflare автоматически добавит HTTPS

---

## 📊 Управление

### Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Только app
docker-compose logs -f app

# Только nginx
docker-compose logs -f nginx

# Только postgres
docker-compose logs -f postgres
```

### Перезапуск сервисов
```bash
# Все сервисы
docker-compose restart

# Только app
docker-compose restart app

# Только nginx
docker-compose restart nginx
```

### Обновление приложения
```bash
git pull
docker-compose up -d --build
```

### Резервное копирование БД
```bash
# Создать backup
docker-compose exec postgres pg_dump -U postgres tetris > backup_$(date +%Y%m%d).sql

# Восстановить backup
docker-compose exec -T postgres psql -U postgres tetris < backup_20260515.sql
```

### Очистка
```bash
# Остановить и удалить контейнеры
docker-compose down

# Удалить контейнеры + volumes (БД будет удалена!)
docker-compose down -v

# Удалить неиспользуемые образы
docker image prune -a
```

---

## 🔧 Troubleshooting

### Проблема: WebSocket не работает

**Решение:** Проверить, что в `nginx.conf` настроен WebSocket:
```nginx
location /ws {
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Проблема: База данных не инициализируется

**Решение:**
```bash
# Проверить логи
docker-compose logs postgres
docker-compose logs app

# Вручную запустить инициализацию
docker-compose exec app node init-db.js
```

### Проблема: Порт 80 занят

**Решение:** Изменить порт в `.env`:
```env
HTTP_PORT=8080
```

### Проблема: Статические файлы не загружаются

**Решение:** Проверить права доступа:
```bash
ls -la client/
# Должны быть readable для всех
```

### Проблема: "Cannot connect to Docker daemon"

**Решение:**
```bash
# Запустить Docker
sudo systemctl start docker

# Добавить пользователя в группу
sudo usermod -aG docker $USER
newgrp docker
```

---

## 📈 Мониторинг

### Проверка использования ресурсов
```bash
docker stats
```

### Проверка здоровья контейнеров
```bash
docker-compose ps
```

### Проверка сети
```bash
docker network inspect tetris-vashchenko-secret_tetris-network
```

---

## 🎯 Рекомендации для Production

1. **Безопасность:**
   - Используйте сильные пароли (32+ символов)
   - Включите HTTPS
   - Настройте firewall (ufw)
   - Регулярно обновляйте Docker образы

2. **Производительность:**
   - Настройте Nginx кеширование
   - Используйте CDN для статики
   - Мониторьте использование ресурсов

3. **Резервное копирование:**
   - Настройте автоматический backup БД
   - Храните backups в отдельном месте
   - Тестируйте восстановление

4. **Мониторинг:**
   - Настройте логирование
   - Используйте мониторинг (Prometheus, Grafana)
   - Настройте алерты

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи: `docker-compose logs -f`
2. Проверьте статус: `docker-compose ps`
3. Проверьте переменные окружения в `.env`
4. Проверьте документацию Docker

---

**Версия:** 2.0  
**Дата:** 2026-05-15
