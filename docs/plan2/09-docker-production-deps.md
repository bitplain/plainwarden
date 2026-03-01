# P1: Оптимизация Docker — production-only зависимости

## Проблема

`Dockerfile` (строка 36):
```dockerfile
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
```

Stage `deps` использует `npm ci` без `--omit=dev`, поэтому в production-образ копируются **все зависимости**, включая devDependencies: TypeScript, ESLint, Vitest, Tailwind CLI и др.

Это раздувает размер Docker-образа и увеличивает attack surface.

## Затронутые файлы

- `Dockerfile` — оптимизация stages

## Что сделать

1. Добавить отдельный production deps stage:
   ```dockerfile
   FROM node:22.14-alpine AS prod-deps
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci --omit=dev
   ```

2. В runner stage использовать `prod-deps` вместо `deps`:
   ```dockerfile
   COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
   ```

3. Оставить `builder` stage с полными зависимостями (нужны для сборки)

4. Убедиться, что Prisma CLI входит в production deps (он в `devDependencies` — нужно перенести или оставить отдельно)

## Риски

- Prisma CLI используется в CMD для `migrate deploy` — нужно убедиться, что он доступен
- Возможное решение: копировать только `prisma` бинарь из builder

## Сложность: Низкая
## Приоритет: 🟠 P1
