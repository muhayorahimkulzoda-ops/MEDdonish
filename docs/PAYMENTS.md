# Платежи и entitlements

## Разделение ответственности

```text
Payment Service          принимает деньги, пишет Payment
Payment Provider Adapter  Web / Google Play / Apple IAP
Entitlement Service       решает, что пользователь может открыть
```

Провайдер не выдаёт доступ. Frontend-страница «Оплата успешна» не выдаёт доступ.

## Источники

```text
WEB_PAYMENT   банковский шлюз на сайте
GOOGLE_PLAY   Play Billing
APPLE_IAP     In-App Purchase
ADMIN         ручная выдача
```

Адаптер провайдера заменяем. Жёсткой привязки к одному банку нет.

## Жизненный цикл платежа

```text
created → pending → paid | failed | cancelled
paid → (опционально) refunded
```

Webhook:

```text
получить → проверить подпись → сумму → order id
→ записать payment_event (идемпотентно)
→ если paid: создать/продлить subscription + entitlement
```

## Магазины

`GET /public/offer` — каноническое предложение: курсы, три цены с сервера, recommended `year_1`, SKU магазинов. `grantsAccess` всегда `false`.

`GET /public/store-products` отдаёт SKU `month_1 | month_5 | year_1` для Google Play и Apple. `grantsAccess` всегда `false`.

`POST /orders` с `WEB_PAYMENT` создаёт сессию провайдера. `WEB_PAYMENT_PROVIDER=sandbox` (локально) или `http` (боевой шлюз). Сумма всегда с сервера.

`POST /orders` с `GOOGLE_PLAY` или `APPLE_IAP` создаёт `pending`.

Клиент после Billing/StoreKit вызывает `POST /orders/:id/store-receipt`. Токен уходит в `StoreReceiptVerifier` (`STORE_VERIFY_URL`). Без ответа провайдера статус остаётся `pending`. Entitlement — только если сервер подтвердил сумму и выставил `payment.status = paid`. Клиентский токен доступ не выдаёт.

В production: `WEB_PAYMENT_PROVIDER=http`, `WEB_PAYMENT_API_URL` и `STORE_VERIFY_URL` только https, ключи через secret manager. `PAYMENTS_DEV_COMPLETE` запрещён. Таймаут вызова провайдера 8 с. Токен магазина не логируется.

## Тарифы

На курс администратор задаёт три цены: 1 месяц, 5 месяцев, 1 год. Валюта — в `course_prices`.

## Ручное управление

Администратор может выдать, сдвинуть даты, продлить, приостановить, отменить, заблокировать. `access_source = admin | promotion | payment`. Действие пишется в `audit_logs`.
