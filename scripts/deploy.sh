#!/bin/bash

set -e

echo "🚀 Деплой ВСЯК на Selectel VPS"

# Проверка переменных окружения
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Ошибка: DATABASE_URL не задан"
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "❌ Ошибка: JWT_SECRET не задан"
  exit 1
fi

# Сборка
echo "📦 Сборка фронтенда..."
cd packages/frontend
npm run build
cd ../..

echo "📦 Сборка бэкенда..."
cd packages/backend
npm run build
cd ../..

# Копирование файлов на сервер
echo "📤 Копирование файлов..."
SERVER="root@vsyak.zork.ru"
REMOTE_DIR="/var/www/vsyak"

ssh $SERVER "mkdir -p $REMOTE_DIR"
rsync -avz --exclude 'node_modules' --exclude '.git' . $SERVER:$REMOTE_DIR/

# Установка зависимостей на сервере
echo "📥 Установка зависимостей..."
ssh $SERVER "cd $REMOTE_DIR && npm install --production"

# Запуск через PM2
echo "🔄 Перезапуск сервера..."
ssh $SERVER "cd $REMOTE_DIR/packages/backend && pm2 restart vsyak || pm2 start dist/index.js --name vsyak"

echo "✅ Деплой завершён!"
echo "🌐 Проверьте: https://vsyak.zork.ru"
