# Biznes AI Kömekçi (Gemini)

TikTok sahypaňyza goýmak üçin biznes soraglara jogap berýän AI çat-boty. Google Gemini-niň **mugt** (free tier) API-si bilen işleýär.

## Gemini mugt açary nirden almaly

1. https://aistudio.google.com saýtyna giriň (Google hasabyňyz bilen).
2. Çep tarapdaky **"Get API key"** (Ýa-da "API keys") düwmesine basyň.
3. **"Create API key"** basyň — açar dörär, ony göçüriň.
4. Gemini free tier **mugt**: aýlyk çäklendirme bar (mes., günde birnäçe onlarça sorag), ýöne köp wideo üçin ýeterlik.

## Sazlamak

1. `config.json` faýlyny açyň we:
   - `api_key` — öz Gemini açaryňyzy goýuň
   - `business_name` — firma adyňyz, mysal üçin `"Aşgabat Süýt Önümleri"`
   - `business_info` — firma barada maglumat (hyzmatlary, bahalary, iş wagty we ş.m.) — bot şulardan jogap berer
   - `welcome_message` — ilkinji garşylanma söz
2. İşletmek:
   ```
   node server.js
   ```
3. Brauzerde açyň: `http://localhost:3000`

## TikTok-da ulanmak

Sahypa bütin dünýä açyk bolmaly (wagtlaýyn sylgy däl, hemişelik host). Şol sebäpli:

- **Wagtlaýyn synag üçin:** açary goýup, boty synap bilersiňiz.
- **Hemişelik sylgy üçin:** `node server.js` bilen boty öz hostyňyzda (VPS, Railway, Render ýaly mugt hostlar) işledip, çykan adresi TikTok bio-da goýuň.

## Faýllar

| Faýl | Beýany |
|------|--------|
| `server.js` | Gemini bilen işleýän serwer |
| `public/index.html` | Çat interfeýsi (mobil üçin) |
| `config.json` | Açar we firma sazlamalary |
| `package.json` | Render üçin Node.js buýruklary |
