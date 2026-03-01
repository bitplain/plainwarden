# P2: Хранение дат как DateTime вместо String

## Проблема

В `prisma/schema.prisma`:
```prisma
model Event {
  date  String    // "2025-03-01"
  time  String?   // "14:30"
}
```

Строковое хранение дат и времени:
- Невозможно использовать PostgreSQL range-запросы (`date >= '2025-01-01'` работает, но без типобезопасности)
- Нет поддержки timezone
- Нет встроенной валидации формата на уровне БД
- Сортировка работает только благодаря ISO-формату (хрупко)

## Затронутые файлы

- `prisma/schema.prisma` — изменить типы полей
- `prisma/migrations/` — **[NEW]** миграция данных
- `src/lib/server/json-db.ts` — обновить CRUD-функции
- `src/lib/server/recurrence.ts` — обновить генерацию дат
- `src/lib/server/validators.ts` — обновить парсинг
- `src/lib/types.ts` — обновить типы
- `src/components/calendar2/` — обновить UI
- `src/tools/calendar.ts` — обновить AI tools

## Что сделать

1. Изменить схему:
   ```prisma
   model Event {
     date  DateTime @db.Date      // только дата
     time  DateTime? @db.Time(0)  // только время
     // Или:
     startAt DateTime             // полный timestamp
   }
   ```

2. Создать миграцию данных:
   - Конвертировать `"2025-03-01"` → `Date`
   - Конвертировать `"14:30"` → `Time`

3. Обновить все функции, работающие с датами

## Риски

- **Breaking change** — нужна data migration для существующих данных
- Выбор формата: `Date` + `Time` vs единый `DateTime` (timestamp)
- Timezone handling — нужно определить стратегию (UTC vs local)

## Сложность: Высокая
## Приоритет: 🟡 P2
