# Авторизация

## Пользователь (подписчик)

Идентификатор — номер телефона. Подтверждение номера — SMS OTP.

На сайте аккаунт можно создать так:

```text
имя + фамилия + телефон + пароль → request-otp (purpose=register) → SMS
→ POST /auth/register (код SMS) → cookie-сессия
```

Аккаунт также появляется в сценарии покупки: `request-otp` → `verify-otp` (без пароля). Такой пользователь входит по SMS и задаёт пароль в профиле.

Повторный вход на сайте: телефон + пароль, или телефон + SMS. На мобильных клиентах: PIN (`/auth/login`) или повторный OTP.

Сброс пароля: `request-otp` (purpose=reset) → `POST /auth/reset-password`.

```text
request-otp → SMS provider (`console` локально, `http` в staging/production)
OTP хешируется. Провайдер не пишет код в логи и не кладёт его в `sms_deliveries`.
`OTP_DEV_ECHO` только для development; в production boot падает.
```

Пароль хранится только как bcrypt-хеш (12 раундов). Не короче 8 символов, буква и цифра. В `localStorage` не кладётся.

Web-сессия: HttpOnly cookie `meddonish_access` / `meddonish_refresh`, `SameSite=Lax`, `Secure` в production. Для cookie-запросов на изменение данных нужен заголовок `x-csrf-token` (cookie `meddonish_csrf`, не HttpOnly).

## Токены

| Токен | TTL | Где живёт |
|---|---|---|
| Access | 15 минут | память клиента / HttpOnly cookie на web |
| Refresh | 30 дней | Android Keystore / iOS Keychain / HttpOnly cookie на web |
| CSRF | 30 дней | cookie без HttpOnly, только web |

Refresh token:

- хранится только как hash;
- привязан к `device_id`;
- rotation при каждом refresh;
- отзыв при logout, смене устройства, блокировке, сбросе пароля.

## Device binding

После успешного входа регистрируется устройство. Одновременно активно одно.

Политика при конфликте (настройка `single_device_policy`):

- `require_release` — клиент должен явно освободить старое устройство;
- `auto_revoke` — старая сессия завершается, новое становится активным.

Каждый защищённый запрос сверяет `device_id` из токена с активным устройством. Logout отзывает сессию устройства — access JWT после этого не принимается.

## Admin

Отдельная сущность `admin_accounts`: email + пароль + TOTP. Не смешивать с телефонными пользователями.

## Запрещено

- Логировать OTP, access token, refresh token, пароль.
- Хранить refresh token открытым текстом на устройстве.
- Пускать в материалы без проверки device + entitlement.
- Google / Apple / соцсети для входа подписчика.
