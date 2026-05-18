FROM node:20-alpine

WORKDIR /app

# Копируем package.json в правильное место и устанавливаем зависимости
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Копируем весь код сервера
COPY server/ ./

# Копируем check-db.cjs в /app/server/ (где есть node_modules)
COPY check-db.cjs ./

# Копируем entrypoint скрипт
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
