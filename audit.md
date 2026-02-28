**Аудит календаря 2.0 (calendar2)**

**Контекст**
- Проект: Next.js 16, React 19, TypeScript strict, Zustand, Prisma, date-fns.
- Фокус: календарь версии 2 (UI, URL‑state, локальное состояние, интеграции с API).

**Связи и зависимости (карта)**
- UI/страницы
  - `src/app/calendar/page.tsx` → `src/components/calendar2/Calendar2.tsx`
  - `src/app/kanban/page.tsx` → ссылка на `/calendar`
- Модульная система/терминал
  - `src/modules/calendar/index.ts` (единый модуль календаря)
  - `src/modules/core/registry.ts` (регистрация модуля)
  - `src/modules/terminal/commands.ts` (команда `/calendar`)
  - `src/modules/terminal/index.ts` (список команд)
- Основной компонент
  - `src/components/calendar2/Calendar2.tsx` — оркестратор, интеграция URL‑state, global store, local store
- Под‑компоненты и утилиты calendar2
  - `src/components/calendar2/Calendar2Toolbar.tsx`
  - `src/components/calendar2/Calendar2Sidebar.tsx`
  - `src/components/calendar2/Calendar2MonthView.tsx`
  - `src/components/calendar2/Calendar2WeekView.tsx`
  - `src/components/calendar2/Calendar2DayView.tsx`
  - `src/components/calendar2/DailyPlanner.tsx`
  - `src/components/calendar2/KanbanBoard.tsx`
  - `src/components/calendar2/NotesPanel.tsx`
  - `src/components/calendar2/EventModal2.tsx`
  - `src/components/calendar2/calendar2-store.ts`
  - `src/components/calendar2/calendar2-url-store.ts`
  - `src/components/calendar2/calendar2-url-state.ts`
  - `src/components/calendar2/calendar2-query-filters.ts`
  - `src/components/calendar2/conflict-utils.ts`
  - `src/components/calendar2/calendar2-theme.ts`
  - `src/components/calendar2/calendar2-types.ts`
- Общие зависимости
  - `src/lib/store.tsx` (Zustand global store: auth + events CRUD)
  - `src/lib/api.ts` (API client: events CRUD, экспорт .ics)
  - `src/lib/types.ts` (CalendarEvent, Create/Update inputs, Recurrence)
  - `src/lib/event-filter-query.ts` (query string для API)
  - `src/components/calendar2/date-utils.ts` (даты/сдвиги/форматирование)
- Серверная логика
  - `src/app/api/events/**` (CRUD + export.ics)
  - `src/lib/server/json-db.ts` (основная логика событий + серии)
  - `src/lib/server/recurrence.ts` (генерация повторов)
  - `src/lib/server/event-filters.ts` (фильтры запросов)

**Потенциальные проблемы и точки отказа (верифицируемые в коде)**

1) **Состояние фильтров и источники данных расходятся между вкладками**
- Локация: `src/components/calendar2/Calendar2.tsx`
- Симптом: при вкладке `planner/kanban/notes` вызывается `fetchEvents()` без фильтров (см. useEffect), но локальный `events` при этом используется для рендера этих вкладок.
- Влияние: в не‑calendar вкладках всегда отображается полный набор событий, даже если в URL стоят фильтры; возможное несоответствие ожиданий пользователя (визуально фильтры в тулбаре видны только на табе calendar, но URL‑state может сохраняться).
- Рекомендация: либо явно сбрасывать фильтры при смене вкладки (calendar → другие), либо использовать отфильтрованные события для planner/kanban/notes, если предполагается единая фильтрация.
- Приоритет: средняя.

2) **Priority persistence на основе fallback key может привести к несоответствию**
- Локация: `src/components/calendar2/Calendar2.tsx` (load/save priorities и resolvedPriorities)
- Симптом: при создании события приоритет записывается под ключом `title::date`, затем переносится на id‑ключ, если совпал `title::date`. При совпадении нескольких событий с одинаковым `title` и `date` возможно неверное сопоставление приоритетов.
- Влияние: неверные приоритеты на карточках/событиях, сложно воспроизвести при повторах или массовых событиях.
- Рекомендация: хранить временную мапу через локальный временный id или использовать более уникальный ключ (например, `title::date::time`), либо получать id из `addEvent` (если API возвращает созданный объект) и сразу привязывать приоритет к id.
- Приоритет: средняя.

3) **Редактирование повторений и validation: несогласованность UI и серверных ограничений**
- Локация: `src/components/calendar2/EventModal2.tsx` + `src/lib/server/json-db.ts`
- Симптом: UI запрещает изменение даты при scope != "this" (`isSeriesWideEdit`), но при scope "this_and_following" сервер запрещает передавать `date` только если hasSeries && scope !== "this". UI‑логика корректна, но в `handleUpdateEvent` дата условно передается только для scope "this".
- Влияние: корректно, но если в будущем изменится серверный контракт, UI и сервер могут разойтись. Риск минимальный, но это узкая точка сопряжения.
- Рекомендация: добавить тест на фронте (или типизацию) на запрет date для scope != "this", либо централизовать контракт на уровне типов.
- Приоритет: низкая.

4) **Конфликт по ревизии не используется на клиенте**
- Локация: `src/lib/server/json-db.ts` (проверка `revision`), `src/lib/types.ts` (UpdateEventInput.revision)
- Симптом: сервер поддерживает optimistic locking по `revision`, но клиент при обновлении не отправляет `revision` в `updateEvent` из `Calendar2.tsx`.
- Влияние: возможна потеря изменений при конкурентных обновлениях. Серверный контроль не задействован.
- Рекомендация: при открытии события сохранять `revision` и отправлять в UpdateEventInput; при конфликте отображать пользователю сообщение и перезагружать событие.
- Приоритет: высокая.

5) **URL‑state не валидирует взаимосвязи dateFrom/dateTo**
- Локация: `src/components/calendar2/calendar2-url-state.ts` + `calendar2-query-filters.ts`
- Симптом: даты валидируются форматно, но не проверяется `dateFrom <= dateTo`. API фильтры могут уходить с неверным диапазоном.
- Влияние: непредсказуемые выборки (например, пустой список), трудно понять причину.
- Рекомендация: нормализовать диапазон (swap или drop), либо выводить warning и сбрасывать фильтры.
- Приоритет: средняя.

6) **Потенциальные ошибки тайминга из‑за локального состояния и fetchEvents**
- Локация: `src/components/calendar2/Calendar2.tsx` (handleSaveEvent/handleUpdateEvent/handleDeleteEvent)
- Симптом: после CRUD вызывается `fetchEvents(calendarQueryFilters)`, при этом `calendarQueryFilters` завязан на debounced search; если debounce ещё не синхронизировался, получим несовпадение фильтра и списков.
- Влияние: UI может кратковременно показывать «несоответствующие» события после операции.
- Рекомендация: либо использовать `searchQuery` без debounce для fetch после CRUD, либо await debounce (локальный `debouncedSearchQuery` можно синхронно взять из состояния) либо явно сбрасывать search при CRUD.
- Приоритет: средняя.

7) **Обработка времени без таймзон**
- Локация: весь calendar2; ключевые: `Calendar2.tsx` (toDayStart), `calendar2-url-state.ts`, `date-utils.ts`, `DailyPlanner.tsx`.
- Симптом: даты собираются из строк `YYYY-MM-DD` и `new Date(...)` без таймзон. `toDayStart` использует локальную зону. При переходах DST/таймзоны возможны смещения (особенно если пользователь меняет TZ в системе).
- Влияние: редкие смещения дней, неверное отображение даты в календаре.
- Рекомендация: фиксировать формат (локальная зона как источник правды) и явно документировать, либо перейти на timezone‑aware обработку (date-fns-tz) в критичных местах.
- Приоритет: средняя.

8) **Date key генерируется из `new Date("YYYY-MM-DDT00:00:00")`**
- Локация: `src/components/calendar2/Calendar2.tsx` (`toDayStart`) + `calendar2-url-state.ts` (normalizeDate)
- Симптом: конструктор Date без TZ создаёт локальную дату; при нестандартной TZ/локали может влиять на `startOfDay` и форматирование, особенно в пограничные дни.
- Влияние: редкие сдвиги при смене TZ.
- Рекомендация: приводить к локальному `new Date(year, month-1, day)` во всех местах с ISO‑датой, чтобы избежать сдвигов интерпретации строк.
- Приоритет: средняя.

9) **Обработка ошибок сохранения приоритетов и локального состояния «тихая»**
- Локация: `src/components/calendar2/Calendar2.tsx` (savePriorities), `calendar2-store.ts` (saveState)
- Симптом: ошибки localStorage проглатываются; UI не сигнализирует.
- Влияние: при блокировке storage (privacy mode) приоритеты, канбан/заметки не сохраняются.
- Рекомендация: добавить non-blocking warning (toast/notification) при ошибках записи; хотя бы логировать в dev.
- Приоритет: низкая.

10) **Неполная типизация и совместимость категорий**
- Локация: `Calendar2.tsx`, `calendar2-store.ts`, `EventModal2.tsx`
- Симптом: категории (`CalendarCategory`) хранятся локально в calendar2 store, но event.categoryId — серверный и может ссылаться на другой источник. В UI список категорий заполняется из локального store, без синхронизации с backend.
- Влияние: categoryId у события может указывать на несуществующую локальную категорию; пользователь не увидит корректной подписи.
- Рекомендация: либо делать категории серверными, либо гарантировать, что categoryId — только локальный. Если это уже решение, это нужно явно задокументировать.
- Приоритет: высокая (данные могут «теряться» в UI).

11) **Race condition при drag‑drop + fetch**
- Локация: `Calendar2MonthView.tsx`, `Calendar2WeekView.tsx`, `Calendar2DayView.tsx` + `Calendar2.tsx` (handleMoveEvent)
- Симптом: drag‑drop вызывает `updateEvent` и сразу `fetchEvents`. При нескольких быстрых перемещениях возможно перетирание состояния (последний fetch может вернуть старые данные, если предыдущий запрос завершится позднее).
- Влияние: визуально события «отскакивают» назад.
- Рекомендация: сериализовать обновления (например, очередь), или оптимистично обновлять store до fetch, или отменять предыдущие fetch запросы.
- Приоритет: средняя.

12) **Notes markdown renderer: XSS‑защита частично корректна, но список/курсив могут пересекаться**
- Локация: `src/components/calendar2/NotesPanel.tsx` (renderMarkdown)
- Симптом: простая замена regex; в сложных случаях форматирование может ломаться. С точки зрения безопасности — базовое экранирование есть, но всё равно риск «дыр» при расширении шаблонов.
- Влияние: некорректный рендер, риск XSS при будущих расширениях.
- Рекомендация: использовать библиотеку markdown с sanitization (если разрешено добавлять зависимости) или строго ограничить синтаксис и добавить тесты.
- Приоритет: низкая.

**Граничные случаи**
- Переходы между месяцами/годами
  - Используются функции date-fns в `src/components/calendar2/date-utils.ts` (month grid, week dates, shiftAnchorDate) — логика корректна, but TZ‑чувствительна к локальному времени.
- Переходы DST/таймзоны
  - Используется локальная зона, без TZ‑коррекции. Возможны редкие сдвиги дня при смене TZ.
- Временные блоки в DailyPlanner
  - Сравнение часов по `startTime`/`endTime` без минут — корректно для hour‑granularity, но если будут блоки с не‑часовыми значениями, логика станет некорректной.

**API контракты и типизация**
- `UpdateEventInput.revision` поддержан в типах и сервере, но не используется клиентом (см. проблему №4).
- `recurrence` обновляется только при scope != "this" и `recurrenceChanged` — контракт с сервером соблюден, но зависит от строгой синхронизации между UI и API.
- Фильтры `dateFrom/dateTo` валидируются форматно, но не семантически (см. проблему №5).

**State management**
- Global store (`useNetdenStore`) используется как единственный источник событий; события сортируются и перезаписываются после CRUD.
- Local store (`useCalendar2Store`) хранит канбан/заметки/тайм‑блоки в localStorage.
- Потенциальная рассинхронизация между локальными категориями и серверными `categoryId` (см. проблему №10).

**Проверки, которые прошли**
- `npx vitest run` — все тесты зелёные.
- `npx tsc --noEmit` — ошибки в `src/lib/server/kanban-db.ts` (не связанные напрямую с calendar2, но влияют на общую типизацию).
- `npx eslint src/` — вывода ошибок по календарю не обнаружено (команда не вернула нарушений).

**Дополнительные зоны проверки (если потребуется)**
- API `/api/events/export.ics` и фильтры по query — проверить корректность фильтрации по `q/dateFrom/dateTo` в `event-filters.ts`.
- Поведение при редактировании серии повторений «this_and_following» — проверить, что UI корректно отображает новую серию и исключения.

**Сводка приоритетов**
- Критичные: нет.
- Высокие: нет (после фиксов №1, №4, №5, №6, №8, №10).
- Средние: №2, №7, №11.
- Низкие: №3, №9, №12.

**Апдейт после удаления legacy-календаря и точечных фиксов (2026-02-28)**
- Архитектура:
  - Единый календарь доступен по `/calendar` (`src/app/calendar/page.tsx` рендерит `Calendar2`).
  - Маршрут `/calendar2` и модуль `src/modules/calendar2/index.ts` удалены.
  - Команда `/calendar2` удалена; `/calendar` в терминале делает `navigateTo: "/calendar"`.
  - Общие утилиты дат перенесены в `src/components/calendar2/date-utils.ts`.
- Исправлено в коде:
  - №1: устранён рассинхрон фильтров по вкладкам — загрузка событий выполняется через `calendarQueryFilters` для всех вкладок.
  - №4: в клиентских обновлениях событий передаётся `revision` (optimistic locking реально задействован).
  - №5: добавлена нормализация диапазона дат (`dateFrom/dateTo`) в URL-state и в построении API-фильтров.
  - №6: после CRUD используется live-версия фильтров (без debounce-лага), снижена вероятность кратковременного несоответствия.
  - №8: `toDayStart` больше не использует строковый `new Date("YYYY-MM-DDT00:00:00")`, используется локально-валидированный парсинг.
  - №10: добавлен fallback для `categoryId`, отсутствующего в local categories (чтобы не терять выбранную категорию в UI формы).
- Остаётся актуальным:
  - №2 (fallback key приоритетов `title::date`),
  - №3 (узкое место контракта recurrence scope),
  - №7 (общая timezone/DST-стратегия),
  - №9 (тихие ошибки localStorage),
  - №11 (потенциальная race при частых drag-drop),
  - №12 (ручной markdown renderer в Notes).

**Handoff**
- Сделано: проведен аудит календаря 2.0, затем внесены точечные исправления по актуальным рискам после миграции на единый календарь.
- Не сделано: не закрыты риски №2, №3, №7, №9, №11, №12.
- Требует внимания: стратегия timezone/DST, стабильность drag-drop при burst-операциях, безопасность/устойчивость markdown-рендера.
- Проверить вручную: поведение при смене TZ/DST, быстрые последовательные drag-drop, сценарии с конфликтом ревизии (две вкладки).
