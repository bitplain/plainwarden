# P0: SSL-подключение к PostgreSQL — проверка сертификата

## Проблема

В `src/lib/server/setup.ts` (строка 166):

```typescript
return { rejectUnauthorized: false };
```

При `sslMode: "require"` соединение шифруется, но сертификат сервера **не проверяется**. Это позволяет MITM-атаку: атакующий может перехватить трафик между приложением и БД.

## Затронутые файлы

- `src/lib/server/setup.ts` — функция `toPgSslMode()`
- `src/lib/types.ts` — расширить `SslMode` enum
- Setup wizard UI — добавить опцию CA cert

## Что сделать

1. Добавить `sslMode: "verify-full"` в enum `SslMode`
2. При `verify-full` — принимать CA-сертификат (PEM) через Setup Wizard
3. Передавать `ca` параметр в `pg.Client` SSL-конфиг
4. Документировать различия между режимами для пользователя
5. Минимально: добавить предупреждение в UI при использовании `require` без проверки

## Риски

- Усложняет процесс Setup Wizard (пользователю нужно предоставить CA cert)
- Self-signed сертификаты на self-hosted PostgreSQL — частый случай

## Сложность: Низкая
## Приоритет: 🔴 P0
