# P1: Разделение globals.css на модули

## Проблема

`src/app/globals.css` — 3661 строк / 78 KB в одном файле. Содержит стили для всех модулей: terminal, calendar, kanban, settings, AI chat, setup wizard, login и т.д.

Проблемы:
- Невозможно определить, какие стили относятся к какому модулю
- Вероятны мёртвые стили от удалённых компонентов
- Merge-конфликты при параллельной работе
- Tailwind уже подключён, но большая часть стилей — ручной CSS

## Затронутые файлы

- `src/app/globals.css` — разрезать
- `src/components/**/*.module.css` — **[NEW]** CSS Modules
- `src/app/**/page.module.css` — **[NEW]** page-level стили

## Что сделать

1. Аудит стилей: определить какие блоки относятся к каким компонентам
2. Вынести в CSS Modules:
   - `Terminal.module.css`
   - `Calendar.module.css`
   - `Kanban.module.css`
   - `AiChat.module.css`
   - `Settings.module.css`
   - `Setup.module.css`
   - `Login.module.css`
3. Оставить в `globals.css` только:
   - CSS variables / design tokens
   - Reset / base styles
   - Tailwind imports
   - Общие utility classes
4. Удалить мёртвые стили (PurgeCSS или ручной аудит)

## Риски

- Возможны сломанные стили из-за специфичности CSS (selector weight)
- CSS Modules меняют имена классов — нужно обновить все `className` в компонентах

## Сложность: Средняя
## Приоритет: 🟠 P1
