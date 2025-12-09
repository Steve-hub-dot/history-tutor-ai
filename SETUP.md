# 🚀 Gyors beállítási útmutató

## 1. Függőségek telepítése

```bash
npm install
```

## 2. Supabase projekt létrehozása

1. Menj a https://supabase.com oldalra
2. Hozz létre egy új projektet
3. Másold ki a következőket:
   - Project URL
   - `anon` `public` API key
   - `service_role` API key (Settings → API)

## 3. AI Provider beállítása (INGYENES!)

### Ollama (Alapértelmezett - Teljesen ingyenes, lokális) 🦙

**Ollama az alapértelmezett, nincs szükség beállításra!**

1. Telepítsd az Ollama-t: https://ollama.com/
2. Futtasd: `ollama pull llama3.2` (vagy más modellt)
3. Kész! Az Ollama automatikusan fut a háttérben

Részletes útmutató: lásd az `OLLAMA_SETUP.md` fájlt.

### Alternatívák (opcionális):

**Groq (Cloud-based, gyors):**
1. Menj a https://console.groq.com/ oldalra
2. Regisztrálj egy ingyenes fiókot
3. Másold ki az API kulcsot
4. Add hozzá: `USE_OLLAMA=false` és `GROQ_API_KEY=...` a `.env.local`-ban

## 4. Környezeti változók

Hozz létre egy `.env.local` fájlt a projekt gyökerében:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Provider - Ollama az alapértelmezett (nincs szükség beállításra!)
# Ha Ollama-t használsz (ajánlott, ingyenes), nincs szükség semmire!

# Opcionális: Ollama beállítások (ha más portot vagy modellt szeretnél)
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Alternatívák (ha nem Ollama-t szeretnél használni):
# USE_OLLAMA=false
# GROQ_API_KEY=gsk_xxxxxxxxxxxxx
# OPENAI_API_KEY=sk-...
```

## 5. Adatbázis séma létrehozása

1. Nyisd meg a Supabase Dashboard-ot
2. Menj a SQL Editor-re
3. Másold be és futtasd le a `db/schema.sql` tartalmát
4. (Opcionális) Futtasd le a `db/seed.sql`-t is példa adatokért

## 6. BKT Server (opcionális)

Ha külön szeretnéd futtatni a BKT szervert:

```bash
cd bkt_server
pip install -r requirements.txt
python main.py
```

A szerver a `http://localhost:8000` címen fog futni.

**Megjegyzés**: Ha nem futtatod külön, a Next.js API route-ok fallback értékeket használnak.

## 7. Development server indítása

```bash
npm run dev
```

Nyisd meg a böngészőben: http://localhost:3000

## ✅ Ellenőrzés

1. Főoldal betöltődik
2. `/lessons` oldalon látod a tananyagokat (ha futtattad a seed.sql-t)
3. Egy tananyagot megnyitva láthatod a tartalmat
4. A kvíz gombra kattintva generálódik egy AI kvíz

## 🔧 Hibaelhárítás

### "Supabase connection error"
- Ellenőrizd, hogy a `.env.local` fájlban helyesek-e a Supabase kulcsok
- Győződj meg róla, hogy a Supabase projekt aktív

### "AI API error"
- **Groq**: Ellenőrizd a Groq API kulcsot a https://console.groq.com/ oldalon
- **Ollama**: Győződj meg róla, hogy az Ollama fut (`ollama serve` vagy automatikusan)
- **OpenAI**: Ellenőrizd az OpenAI API kulcsot és krediteket

### "BKT server unavailable"
- Ez normális, ha nem futtatod a BKT szervert külön
- A rendszer fallback értékeket használ

### Nincsenek tananyagok
- Futtasd le a `db/seed.sql` fájlt a Supabase SQL Editor-ben

