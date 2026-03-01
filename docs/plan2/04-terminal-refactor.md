# P1: Рефакторинг Terminal.tsx — разделение God Component

## Проблема

`src/components/Terminal.tsx` — 1106 строк, один компонент содержит:
- Форму логина (username/password flow)
- Polling напоминаний (interval-based)
- Shell-команды (fetch → `/api/terminal/run`)
- Slash-команды (routing, clear, help, settings)
- iFrame embed (settings panel)
- Keyboard shortcuts (Tab, Escape, ArrowUp/Down)
- AI виджет (mount/unmount)
- Визуальные эффекты и scale настройки
- Clock компонент
- History management

Это делает компонент невозможным для unit-тестирования и крайне сложным для модификации.

## Затронутые файлы

- `src/components/Terminal.tsx` — разрезать
- `src/hooks/` — **[NEW]** хуки
- `src/components/terminal/` — **[NEW]** подкомпоненты

## Что сделать

1. Вынести хуки:
   - `useTerminalHistory` — массив `HistoryEntry[]`, навигация стрелками
   - `useTerminalAuth` — login flow, polling `/api/auth/me`, setup state
   - `useTerminalShell` — отправка shell-команд, форматирование вывода
   - `useTerminalSettings` — scale, stroke, localStorage sync
   - `useReminderPoller` — polling `/api/agent/reminders`

2. Вынести компоненты:
   - `TerminalPrompt` — поле ввода + mode switch
   - `TerminalOutput` — рендер истории
   - `LoginForm` — форма логина
   - `ReminderBanner` — баннер с напоминаниями
   - `TerminalClock` — уже мемоизирован, вынести в файл

3. Сохранить `Terminal` как композитный компонент-контейнер.

## Риски

- Нужно аккуратно прокинуть refs и state между компонентами
- Keyboard shortcuts зависят от focus state — может потребовать shared context

## Сложность: Высокая
## Приоритет: 🟠 P1
