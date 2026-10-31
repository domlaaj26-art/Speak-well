# CEFR Multilevel Speaking — mock sayt

Savollar: *Speak well 3 — Past exam questions 2026* (Galactus LC, Teacher AJ).
Sayt server talab qilmaydi — to‘rtta fayl, xolos.

```
index.html
styles.css
app.js
data.js
```

---

## 1. GitHub Pages'ga joylash (10 daqiqa, bepul)

1. **github.com** saytiga kiring (hisob bo‘lmasa, bepul oching).
2. O‘ng yuqoridagi **+** → **New repository**.
   - Repository name: `speaking` (istalgan nom)
   - **Public** ni tanlang
   - **Create repository** bosing.
3. Ochilgan sahifada **uploading an existing file** havolasini bosing.
4. Shu papkadagi **to‘rtta faylni** (index.html, styles.css, app.js, data.js) sudrab tashlang → pastdagi **Commit changes**.
   > Muhim: fayllarni papka ichida emas, repozitoriyning ildiziga yuklang.
5. Yuqoridagi **Settings** → chap menyudan **Pages**.
6. **Source**: `Deploy from a branch`, **Branch**: `main` va `/ (root)` → **Save**.
7. Bir-ikki daqiqada sahifada havola chiqadi:
   `https://<foydalanuvchi-nomi>.github.io/speaking/`

Shu havolani o‘quvchilarga yuborasiz. Faylni o‘zgartirsangiz, GitHub'da yangi versiyasini yuklaysiz — sayt bir daqiqada yangilanadi.

**Muhim:** sayt mikrofondan foydalangani uchun manzil `https://` bo‘lishi shart. GitHub Pages buni o‘zi ta'minlaydi.

---

## 2. API kalit (baholash va tabiiy ovoz uchun)

Saytda **Sozlamalar** tugmasi bor. Kalit faqat o‘sha qurilmaning brauzerida saqlanadi, hech qayerga yuborilmaydi.

**Google Gemini — bepul (eng oson yo‘l)**
- kalit: [aistudio.google.com](https://aistudio.google.com) → **Get API key** → **Create API key**. Google hisobi kifoya, karta so‘ralmaydi.
- bepul tarifda ishlaydi: javoblarni baholaydi va ovozni matnga aylantiradi (iPhone'da ham).
- imtihonchi ovozi qurilmaning o‘z ovozi bo‘ladi (Chrome'da “Google UK English” eng tabiiy eshitiladi).
- bepul tarifda kunlik so‘rovlar soni cheklangan; bir sinf uchun yetadi, limitga yetsa ertasiga tiklanadi.

**OpenAI (pullik)** — uchta narsa birdan ishlaydi:
- tabiiy imtihonchi ovozi,
- ovozni matnga aylantirish (iPhone va Safari'da ham),
- javoblarni baholash.

Kalit olish: platform.openai.com → API keys → Create new secret key. Billing'ga oz miqdorda (masalan $5) pul qo‘yish kerak. Bitta to‘liq mock taxminan 2–4 sentga tushadi.

**Anthropic (Claude)** — faqat baholash ishlaydi; ovozni matnga aylantirish yo‘q, shuning uchun Chrome kerak bo‘ladi.

Model nomi maydonini bo‘sh qoldirsangiz, standart model ishlatiladi (`gpt-4o-mini` yoki `claude-sonnet-5-5`).

### Agar kalitni o‘quvchilarga bermoqchi bo‘lmasangiz
Ikki yo‘l bor:
- o‘quvchilar mockni ishlaydi, ovozini yuklab olib sizga yuboradi, baholashni siz o‘z qurilmangizda qilasiz;
- yoki keyinchalik kichik server qismini qo‘shamiz (Vercel funksiyasi) — kalit serverda qoladi.

---

## 3. Qanday ishlaydi

| Qism | Tayyorgarlik | Gapirish | Xom ball |
|---|---|---|---|
| Part 1.1 | — | 30 s × 3 savol | 5 |
| Part 1.2 | — | 45 + 30 + 30 s | 5 |
| Part 2 | 1 daqiqa | 2 daqiqa | 5 |
| Part 3 | 1 daqiqa | 2 daqiqa | 6 |

Jami 21 xom ball rasmiy shkala bo‘yicha 0–75 ga aylantiriladi: **65–75 — C1, 51–64 — B2, 38–50 — B1**.

Har savoldan keyin: ko‘rsatma o‘qiladi → signal → taymer va ovoz yozuvi birga boshlanadi. Mock tugagach har bir javobning yozuvi, matni va o‘lchovlari (so‘z soni, tezlik, sukut, eng uzun pauza) chiqadi. Matnni tahrirlab, keyin **baholashga** yuborasiz.

**Nimani baholaydi:** topshiriq bajarilishi, grammatika, lug‘at, bog‘lovchilar, javob hajmi va pauzalar.
**Nimani baholamaydi:** talaffuz va ohang — buni ovoz yozuvini tinglab o‘zingiz qo‘yasiz.

---

## 4. Qurilmalar

| Qurilma | Ovoz yozish | Nutqni matnga aylantirish |
|---|---|---|
| Android + Chrome | ✅ | ✅ brauzerning o‘zi |
| Kompyuter + Chrome/Edge | ✅ | ✅ brauzerning o‘zi |
| iPhone / iPad (Safari) | ✅ | OpenAI kaliti orqali, yoki klaviaturadagi mikrofon bilan qo‘lda |

---

## 5. Rasmlar

Rasmlar **Wikimedia Commons**dan real fotosuratlar: har mavzuga qidiruv so‘zi berilgan, sayt rasmni avtomatik yuklaydi. Rasm mos kelmasa, uning tagidagi **⟳** tugmasi bilan keyingi rasmga almashtiriladi — tanlovingiz shu brauzerda eslab qolinadi.

Qidiruv so‘zlarini `data.js` faylidagi `p12img` va `p2img` ro‘yxatlaridan o‘zgartirsa bo‘ladi.

---

## 6. Savollarni o‘zgartirish

Hammasi `data.js` ichida: `p11` (shaxsiy savollar), `p12` (rasm taqqoslash), `p2` (mavzular), `p3` (for/against). Yangi savol qo‘shish uchun ro‘yxatga xuddi shu shaklda element qo‘shing — boshqa hech narsani o‘zgartirish shart emas.
