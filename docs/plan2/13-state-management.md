# P2: Zustand Store — расширение или миграция

## Проблема

`src/lib/store.tsx` управляет только auth + calendar events. Notes, Kanban, Reminders, AI — обращаются к API напрямую из компонентов. Это создаёт:
- Несогласованность state management (часть данных в store, часть — в `useState`)
- Дублирование loading/error состояний
- Невозможность шарить данные между компонентами без prop drilling

## Затронутые файлы

- `src/lib/store.tsx` — расширить или заменить
- `src/components/*.tsx` — обновить потребителей

## Что сделать

### Вариант A: Расширить Zustand store
1. Добавить slices для Notes, Kanban, Reminders
2. Использовать zustand slices pattern для разделения

### Вариант B: React Query / SWR (рекомендуется)
1. Оставить Zustand для UI state (auth, theme, settings)
2. Использовать React Query для серверного состояния:
   - Автоматический кэш, refetch, optimistic updates
   - Дедупликация запросов
   - Background refetching
3. Заменить ручной `fetchEvents()` → `useQuery(['events', filters])`

## Сложность: Высокая
## Приоритет: 🟡 P2
