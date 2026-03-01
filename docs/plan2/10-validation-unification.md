# P2: Объединение валидации

## Проблема

Три отдельных набора валидационных helper-функций с дублирующейся логикой:

| Модуль | Файл | Функции |
|--------|------|---------|
| Generic | `src/lib/server/validators.ts` (482 строки) | `readString`, `isRecord`, `readJsonBody` |
| Kanban | `src/lib/server/kanban-validators.ts` (~12 KB) | свои `readString`, `isRecord` |
| Setup | `src/lib/server/setup.ts` | `readRequiredString`, `assertRecord`, `readOptionalString` |

Каждый файл определяет свои `readString` / `assertRecord` с чуть разными сигнатурами.

## Затронутые файлы

- `src/lib/server/validators.ts` — расширить как единственный источник примитивов
- `src/lib/server/kanban-validators.ts` — мигрировать на общие примитивы
- `src/lib/server/setup.ts` — мигрировать на общие примитивы

## Что сделать

### Вариант A: Рефактор на общие примитивы
1. В `validators.ts` определить полный набор базовых функций:
   - `readString()`, `readOptionalString()`, `readPositiveInteger()`, `readDate()`, `readTime()`, `readEmail()`, `readIdentifier()`, `assertRecord()`
2. Использовать из `kanban-validators.ts` и `setup.ts`

### Вариант B: Миграция на Zod (рекомендуется)
1. Добавить `zod` как зависимость
2. Определить schemas для каждого endpoint:
   ```typescript
   const loginSchema = z.object({
     email: z.string().email().max(255),
     password: z.string().min(1).max(1024),
   });
   ```
3. Автоматическая типизация через `z.infer<typeof schema>`
4. Единообразные сообщения об ошибках

## Риски

- Zod — новая зависимость (~50 KB)
- Нужно мигрировать все 49 route handlers

## Сложность: Средняя
## Приоритет: 🟡 P2
