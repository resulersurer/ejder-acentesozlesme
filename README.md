# Ejder Acenta Sözleşme

Angular + Neon + Vercel uyumlu sözleşme oluşturucu.

## Ne yapar

Form ile sözleşme bilgilerini doldurursun, canlı önizleme görürsün, kaydı Neon veritabanına gönderip paylaşılabilir bir link üretirsin.

## Kurulum

1. `npm install`
2. Neon tarafında bir veritabanı oluştur ve `schema.sql` içeriğini çalıştır.
3. Vercel projesinde `DATABASE_URL` ortam değişkenini ekle.
4. Yerelde tam akış için `npx vercel dev` kullan.
5. `npm run build`
6. `vercel` ile deploy et veya GitHub repo ile bağla.

## Paylaşım linki

Uygulama kayıt sonrası `?draft=<id>` formatında link üretir. Bu linki acenteye gönderdiğinde kayıt Neon üzerinden yüklenir.

## Notlar

`contractText` alanında `{{senderName}}`, `{{agencyName}}`, `{{referenceNo}}`, `{{effectiveDate}}`, `{{agencyContact}}`, `{{notes}}` yer tutucuları kullanılabilir.