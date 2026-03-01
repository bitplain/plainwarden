# P2: Error Boundaries на клиенте

## Проблема

Ни один React-компонент не обёрнут в Error Boundary. Необработанная ошибка в `Terminal.tsx` (1106 строк) или `AiChatWidget.tsx` уронит **весь UI** — пользователь увидит белый экран.

Next.js App Router поддерживает `error.tsx` файлы для каждого сегмента маршрута, но ни одного такого файла в проекте нет.

## Затронутые файлы

- `src/app/error.tsx` — **[NEW]** корневой error boundary
- `src/app/calendar/error.tsx` — **[NEW]**
- `src/app/settings/error.tsx` — **[NEW]**
- `src/app/setup/error.tsx` — **[NEW]**
- `src/app/login/error.tsx` — **[NEW]**

## Что сделать

1. Создать `src/app/error.tsx` — fallback UI с кнопкой «Перезагрузить»
2. Создать error boundaries для каждого route segment
3. Добавить `global-error.tsx` для ошибок в root layout
4. Добавить логирование ошибок (отправлять в `console.error` или внешний сервис)
5. Стилизовать error pages в стиле приложения (terminal aesthetic)

## Сложность: Низкая
## Приоритет: 🟡 P2
