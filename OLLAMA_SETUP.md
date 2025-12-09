# 🦙 Ollama Beállítás (Lokális, Teljesen Ingyenes)

Ollama használata a History Tutor AI-ban - teljesen ingyenes, lokális AI modell futtatás.

## 📦 Telepítés

### 1. Ollama telepítése

**Windows:**
1. Töltsd le: https://ollama.com/download/windows
2. Futtasd a telepítőt
3. Az Ollama automatikusan elindul a háttérben

**Mac:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Modell letöltése

Nyisd meg a terminált és futtasd:

```bash
ollama pull llama3.2
```

Vagy más modellt is használhatsz:
- `llama3.2` - Kisebb, gyorsabb (ajánlott kezdéshez)
- `llama3.1` - Nagyobb, pontosabb
- `mistral` - Alternatíva
- `phi3` - Microsoft modell

### 3. Ellenőrzés

Ellenőrizd, hogy az Ollama fut:

```bash
ollama list
```

Ez meg kell mutassa a letöltött modelleket.

### 4. Környezeti változók (opcionális)

A `.env.local` fájlban beállíthatod (de alapértelmezetten működik):

```env
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

**Megjegyzés:** Ha nem állítod be, az Ollama alapértelmezett lesz!

## 🚀 Használat

1. Indítsd el az Ollama-t (általában automatikusan fut)
2. Indítsd el a Next.js dev szervert:
   ```bash
   npm run dev
   ```
3. Kész! Az alkalmazás automatikusan az Ollama-t fogja használni.

## 🔧 Hibaelhárítás

### "Cannot connect to Ollama"

1. **Ellenőrizd, hogy az Ollama fut:**
   ```bash
   ollama list
   ```
   Ha hibaüzenetet kapsz, indítsd el az Ollama-t.

2. **Windows-on:**
   - Nyisd meg a Task Manager-t
   - Nézd meg, hogy fut-e az "Ollama" folyamat
   - Ha nem, indítsd el az Ollama alkalmazást

3. **Port ellenőrzés:**
   - Nyisd meg: http://localhost:11434
   - Ha nem tölt be, az Ollama nem fut

### "Model not found"

Futtasd:
```bash
ollama pull llama3.2
```

### Lassú válaszidő

- A kisebb modellek (pl. `llama3.2`) gyorsabbak
- A nagyobb modellek pontosabbak, de lassabbak
- Első futtatáskor lassabb lehet (modell betöltése)

## 📊 Elérhető modellek

Nézd meg az összes elérhető modellt:
```bash
ollama list
```

Népszerű modellek:
- `llama3.2` - 3B paraméter, gyors, jó minőség
- `llama3.1:8b` - 8B paraméter, jobb minőség
- `mistral` - Alternatíva, jó teljesítmény
- `phi3` - Microsoft, kisebb modell

## 💡 Tippek

1. **Első használat:** A `llama3.2` modell jó választás - gyors és jó minőségű
2. **Jobb minőség:** Ha több RAM-od van, próbáld ki a `llama3.1:8b` modellt
3. **Offline használat:** Az Ollama teljesen offline működik, nincs szükség internetre
4. **Teljesítmény:** A GPU használata jelentősen felgyorsítja a válaszidőt

## 🎯 Előnyök

✅ **Teljesen ingyenes** - nincs API kulcs, nincs költség  
✅ **Lokális** - az adataid nem mennek fel a felhőbe  
✅ **Offline** - működik internet nélkül  
✅ **Privát** - teljes adatvédelem  
✅ **Korlátlan** - nincs rate limit vagy quota  

## ⚠️ Hátrányok

- Szükséges helyi telepítés
- RAM igényes (legalább 8GB ajánlott)
- Első futtatáskor lassabb lehet

