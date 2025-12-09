# History Tutor AI

Adaptív történelem tanulási rendszer Knowledge Tracing (BKT) és generatív AI (Groq/Ollama/OpenAI) kombinációjával.

## 🚀 Funkciók

- **Személyre szabott tananyagok**: LLM generálja a tananyagot a tanulási stílus és nehézségi szint alapján
- **Adaptív kvízek**: AI generálja a kvízeket, amelyek a diák teljesítménye alapján változnak
- **Knowledge Tracing**: BKT modell követi a tudás fejlődését fogalmonként
- **Interakció követés**: Scroll depth, időmérés, engagement tracking
- **Adaptív visszajelzés**: Gyenge területek alapján új magyarázatok és kvízek

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + TailwindCSS
- **Backend**: Next.js API Routes + Python FastAPI (BKT server)
- **Adatbázis**: Supabase (PostgreSQL)
- **AI**: Ollama (alapértelmezett, lokális, teljesen ingyenes) / Groq API (cloud, ingyenes) / OpenAI (opcionális)
- **Knowledge Tracing**: BKT (Bayesian Knowledge Tracing)

## 📦 Telepítés

### 1. Függőségek telepítése

```bash
npm install
```

### 2. Környezeti változók beállítása

Hozz létre egy `.env.local` fájlt:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Provider - Ollama az alapértelmezett (nincs szükség beállításra!)
# Telepítsd az Ollama-t: https://ollama.com/
# Futtasd: ollama pull llama3.2

# Opcionális: Ollama beállítások
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Alternatívák (ha nem Ollama-t szeretnél):
# USE_OLLAMA=false
# GROQ_API_KEY=your_groq_api_key  # https://console.groq.com/
# OPENAI_API_KEY=your_openai_api_key

# BKT Server (opcionális)
BKT_SERVER_URL=http://localhost:8000
```

### 3. Supabase adatbázis beállítása

1. Hozz létre egy Supabase projektet: https://supabase.com
2. Futtasd le a `db/schema.sql` fájlt a Supabase SQL Editor-ben
3. Másold ki a projekt URL-t és API kulcsokat

### 4. BKT Server indítása (opcionális)

```bash
cd bkt_server
pip install -r requirements.txt
python main.py
```

A BKT server a `http://localhost:8000` címen fog futni.

### 5. Development server indítása

```bash
npm run dev
```

A Next.js app a `http://localhost:3000` címen lesz elérhető.

## 📁 Projekt struktúra

```
/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── quiz-gen/      # Kvíz generálás
│   │   ├── log/           # Interakció logging
│   │   ├── preferences/   # Tanulási preferenciák
│   │   └── bkt/           # Knowledge Tracing
│   ├── lesson/[id]/       # Tananyag oldal
│   ├── quiz/[lessonId]/   # Kvíz oldal
│   └── lessons/           # Tananyag lista
├── lib/                   # Utility függvények
│   ├── supabase.ts        # Supabase client
│   └── ai.ts              # OpenAI wrapper
├── db/                    # Adatbázis séma
│   └── schema.sql         # PostgreSQL séma
└── bkt_server/            # BKT Python backend
    ├── main.py            # FastAPI server
    └── requirements.txt   # Python dependencies
```

## 🗄️ Adatmodell

### Fő táblák

- **users**: Felhasználók és tanulási preferenciák
- **lessons**: Történelem tananyagok
- **quizzes**: Generált kvízek
- **quiz_attempts**: Kvíz megoldások
- **interactions**: Felhasználói interakciók (scroll, idő)
- **bkt_states**: Knowledge Tracing állapotok
- **skills**: Fogalmak/skill-ek a BKT-hez

## 🧪 Tesztelés

### Seed adatok hozzáadása

Futtasd le ezt a SQL-t a Supabase-ben egy példa tananyag létrehozásához:

```sql
INSERT INTO lessons (title, content, difficulty, topic) VALUES (
  'Az első világháború okai',
  'Az első világháború 1914-ben kezdődött és 1918-ig tartott. Fő okai közé tartozott a militarizmus, a szövetségi rendszerek, az imperializmus és a nacionalizmus. A gyilkosság Ferenc Ferdinánd trónörökös ellen Sarajevóban 1914. június 28-án volt a közvetlen kiváltó ok.',
  'normal',
  'I. világháború'
);
```

## 🔄 Működés

1. **Tananyag olvasás**: A diák elolvassa a személyre szabott tananyagot
2. **Kvíz generálás**: Az AI generál egy kvízt a tananyag alapján
3. **Válaszok értékelése**: A válaszokat a BKT modell feldolgozza
4. **Tudásszint frissítés**: A BKT frissíti a fogalmak tudásszintjét
5. **Adaptáció**: Az AI új magyarázatokat és kvízeket generál a gyenge területek alapján
6. **Ismétlés**: A folyamat addig ismétlődik, amíg a tudásszint elég magas nem lesz

## 🎯 Következő lépések

- [ ] Felhasználó autentikáció (Supabase Auth)
- [ ] DKT (Deep Knowledge Tracing) implementáció
- [ ] Vizuális elemek (idővonal, térképek)
- [ ] Interaktív párbeszédes mód
- [ ] Progress dashboard
- [ ] Több nyelv támogatás

## 📝 Licenc

MIT
