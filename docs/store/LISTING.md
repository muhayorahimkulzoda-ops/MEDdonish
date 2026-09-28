# Листинг магазинов — предложение MEDdonish

Сюда копировать в Play Console и App Store Connect. AAB / IPA отсюда не загружаются: нужна native-сборка.

Готовый пакет консоли:
- Data Safety: `docs/store/play-data-safety.json`
- App Privacy: `docs/store/app-privacy.json`
- IAP: `docs/store/iap-products.json`
- Review notes: `docs/store/REVIEW.md`
- Icon 512 / 1024 и feature graphic 1024×500: `docs/store/assets/` и http://localhost:3001/store/icon-512.png
- App Links: `/.well-known/assetlinks.json` (SHA-256 upload-ключа уже вписан). После включения Play App Signing заменить на fingerprint **app signing** key из Play Console.
- Universal Links: `/.well-known/apple-app-site-association` (TEAMID после Apple Developer)

Скриншоты телефона снимают с native-сборки. Бренд-графика — не подмена скриншотов приложения.

Цены и SKU берёт сервер: `GET /public/offer`. Клиент сумму не задаёт. `grantsAccess` всегда `false`.

## Short description

RU (80): Профессиональные курсы по медицине: видео, тесты, клиника. Три тарифа.

EN (80): Professional medical courses: video, tests, clinic. Three access plans.

TG (80): Курсҳои касбии тиббӣ: видео, тест, клиника. Се тариф.

## Full description (RU)

MEDdonish — образовательная платформа для студентов-медиков.

Что входит в доступ к курсу:
- адаптивное видео уроков;
- PDF-конспект внутри приложения;
- тесты с таймером и оценкой;
- ситуационные задачи и клинические примеры.

Три тарифа: 1 месяц, 5 месяцев, 1 год. Сумму задаёт сервер.

Доступ открывается только после подтверждённой оплаты на сервере. Google Play и App Store доступ сами не выдают.

Одно активное устройство. Защищённый контент нельзя скачать как исходный файл.

Политика: https://meddonish.com/privacy
Условия: https://meddonish.com/terms
Удаление аккаунта: https://meddonish.com/account-deletion

Это не медицинская услуга и не замена клинической практике.

## Full description (EN)

MEDdonish is an educational platform for medical students.

A course plan includes adaptive lesson video, in-app PDF notes, timed tests, case tasks, and clinical examples.

Plans: 1 month, 5 months, 1 year. The server sets the price.

Access opens only after the server marks the payment as paid. The store does not grant entitlement.

One active device. Protected content cannot be downloaded as a source file.

Privacy: https://meddonish.com/privacy
Terms: https://meddonish.com/terms
Account deletion: https://meddonish.com/account-deletion

This is not a medical service.

## Full description (TG)

MEDdonish платформаи таълимӣ барои донишҷӯёни тиб аст.

Дар тариф: видеои дарс, конспекти PDF, тестҳо, вазифаҳо ва намунаҳои клиникӣ.

Тарифҳо: 1 моҳ, 5 моҳ, 1 сол. Нархро сервер муайян мекунад.

Дастрасӣ танҳо пас аз пардохти тасдиқшуда дар сервер кушода мешавад. Мағоза дастрасӣ намедиҳад.

Як дастгоҳ. Муҳтавои ҳифзшударо ҳамчун файли манбаъ боргирӣ кардан мумкин нест.

Махфият: https://meddonish.com/privacy
Шартҳо: https://meddonish.com/terms
Несткунии ҳисоб: https://meddonish.com/account-deletion

Ин хизмати тиббӣ нест.

## In-app products

| Plan | Google SKU | Apple Product ID | Type |
|---|---|---|---|
| 1 month | meddonish.month_1 | meddonish.month_1 | Non-renewing / non-subscription period |
| 5 months | meddonish.month_5 | meddonish.month_5 | same |
| 1 year | meddonish.year_1 | meddonish.year_1 | same |

Review note: purchase creates `pending` order. Entitlement is created only after signed webhook `paid`. Test account cannot grant access from the client.

## Data safety / App Privacy

Collected: phone number, device id, language, learning progress, store payment facts.
Not collected: medical records, diagnoses, patient data.
Not sold.
Account deletion and data export are in the app and on the website.

## Age / IARC

Educational. No user-generated social, no ads to children, no real-world medical advice.
Suggested: PEGI 3 / Everyone, unless local reviewer asks 12+ for medical imagery.
