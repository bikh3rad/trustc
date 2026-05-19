# trustC — Demo Credentials

> **DEMO USE ONLY.** All accounts ship with the public seed (`seed.sql`).
> Rotate every password before any non-local deployment.

**Every demo account — platform staff and founders — shares one password:**

> `demo1234`

Each row in `auth.users` still has its own bcrypt(cost=12) hash, but every
hash is generated from the same plaintext. The login screen also exposes the
full account roster (with role + status) via the public endpoint
`GET /v1/auth/demo-users`, so testers can pick any user and log in with the
single password above.

## Platform accounts

| Role     | Email                | Status  |
|----------|----------------------|---------|
| ADMIN    | admin@trustc.io      | ACTIVE  |
| VC       | vc@trustc.io         | ACTIVE  |
| AUDITOR  | auditor@trustc.io    | ACTIVE  |

## Portfolio founders (Bonyad Mostazafan affiliates)

| Company (شرکت)                | Code     | Email                          | Status   |
|-------------------------------|----------|--------------------------------|----------|
| صنایع غذایی سینا              | SINA     | founder@sina.trustc.io         | ACTIVE   |
| نفت بهران                     | BEHRAN   | founder@behran.trustc.io       | ACTIVE   |
| توسعه صنایع بهشهر             | BIDC     | founder@bidc.trustc.io         | ACTIVE   |
| کویر تایر                     | KAVIR    | founder@kavir.trustc.io        | ACTIVE   |
| سرمایه‌گذاری البرز             | ALBORZ   | founder@alborz.trustc.io       | ACTIVE   |
| آلومینیوم ایران (ایرالکو)     | IRALCO   | founder@iralco.trustc.io       | ACTIVE   |
| سیمان فارس و خوزستان          | SIMAN    | founder@siman.trustc.io        | ACTIVE   |
| هتل‌های بین‌المللی پارسیان     | PARSIAN  | founder@parsian.trustc.io      | PENDING* |
| کشتیرانی والفجر               | VALFAJR  | founder@valfajr.trustc.io      | ACTIVE   |
| پاکسان                        | PAXAN    | founder@paxan.trustc.io        | PENDING* |

\* `PENDING` accounts cannot log in until approved via
`POST /v1/admin/users/{id}/approve` (kept for the admin-approval demo).

## Resetting a password

Admins can overwrite any account's password through the admin UI
(/admin/users → "تنظیم رمز") or via:

```
POST /v1/admin/users/{id}/password
Content-Type: application/json

{ "password": "demo1234" }
```

The plaintext is forwarded to the auth service, hashed there, and persisted
as a fresh bcrypt(cost=12) row. The admin service emits a
`trustc.admin.user_password_reset` audit event (without the password).

## How they map

Each founder's `startup_id` in `auth.users` points to the matching row in
`startup.startups` (UUIDs `11111111-…-0001` through `11111111-…-000a`).
Founder contact rows in `startup.founders` use the same emails.
