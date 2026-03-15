# ዋዜማ · Wazema Hymn Entry Tool

**Built for Saint George Eritrean Orthodox Church — Seattle**
*Deacon Eskndr Tadesse*

---

## What Is This?

Wazema is a volunteer-powered hymn entry tool built to help digitize hundreds of Orthodox hymns (መዛሙር) for the **Wazema Flutter app**. Volunteers use this web tool to type hymns in multiple languages, and submissions go directly into a structured JSON database on GitHub — ready to be pulled into the mobile app.

The tool is named after **ዋዜማ (Wazema)** — the eve of a feast day in the Ethiopian and Eritrean Orthodox Tewahedo tradition, a time of prayer, hymns, and preparation.

---

## Who Uses It

- **Deacon Eskndr Tadesse** — Admin. Sets up the tool, manages tokens, reviews submissions.
- **Volunteers** — Members of the church community who type hymns. They only need the site password and a GitHub token.

---

## How It Works

### For Volunteers
1. Open the site link shared by Deacon Eskndr
2. Enter the volunteer password (`Mezmur2025` unless changed)
3. Tap **+ New** to create a new hymn
4. Select a **category** (e.g. ማርያም · Mariam) using the toggle buttons
5. Select a **subcategory** if applicable (e.g. Kidane Mehret)
6. Fill in the hymn details:
   - Title and subtitle per language tab
   - Zemari/t (singer, composer, or author)
   - YouTube URL per language (optional)
7. Type the **Chorus / ኣዝ** once — it automatically repeats after every verse on export
8. Add **Verses / ስታንዛ** one by one using the **+ Verse** button
9. Each verse has individual lines — mark highlighted text (like "Praises of Mary") using the gold prefix box
10. Press **Enter** inside a line to add a new line instantly
11. Switch language tabs to add other languages
12. Use **✨ Romanize** on the Tigrinya (Rom.) or Amharic (Rom.) tab to auto-romanize with AI
13. Tap **✝ Submit** — the tool checks for duplicates first
14. If a similar hymn exists in another language, use **⇄ Merge Languages** to add your version to the existing record

### For Admin (Deacon Eskndr)
1. Open the site
2. Tap the **Wazema** title **5 times quickly** to open the Admin panel (secret access)
3. Enter your **GitHub Personal Access Token** (`ghp_xxx` with `repo` scope)
4. Tap **Save**
5. Tap **✝ Create All Group JSON Files on GitHub** — sets up all 12 category files in the `data/` folder
6. Share the site URL + password with volunteers
7. Share the GitHub token privately with volunteers for submitting

---

## Auto-Romanize (AI Feature)

The app has a built-in AI romanization feature powered by Claude (Anthropic):

1. Type the hymn in **Tigrinya** or **Amharic**
2. Switch to the **Tigrinya (Rom.)** or **Amharic (Rom.)** tab
3. Tap **✨ Romanize**
4. First time: enter your Anthropic API key (get one free at console.anthropic.com)
5. The AI fills in the entire romanized version — title, chorus, all verses — in seconds

**Cost:** Less than $0.001 per hymn. Free $5 credit on signup covers 5,000+ hymns.

---

## Languages Supported

| Key | Language |
|-----|----------|
| `ti` | Tigrinya (ትግርኛ) |
| `ti_ro` | Tigrinya Romanized |
| `am` | Amharic (አማርኛ) |
| `am_ro` | Amharic Romanized |
| `en` | English |
| `om` | Oromo (Oromiffa) |
| `ro` | Romanian |

All languages are **optional per hymn**. A volunteer who only knows Tigrinya can submit just that — another volunteer can later find the same hymn and add the English version using the **Merge Languages** feature.

---

## Hymn Categories (JSON Files)

Each category corresponds to one JSON file in the `data/` folder:

| File | Category |
|------|----------|
| `Mariam.json` | ማርያም · St. Mary |
| `Egziabher.json` | እግዚኣብሔር · God (Egziabher) |
| `Michael.json` | ቅዱስ ሚካኤል · St. Michael |
| `Gabriel.json` | ቅዱስ ገብርኤል · St. Gabriel |
| `Giorgis.json` | ቅዱስ ጊዮርጊስ · St. George |
| `Yohannes.json` | ቅዱስ ዮሓንስ · St. John |
| `Sillase.json` | ሥሳሴ · Holy Trinity |
| `KidusnAbbot.json` | ቅዱሳን ኣቦት · Holy Fathers |
| `KidusnMelaikt.json` | ቅዱሳን መላእኽት · Angels |
| `Nissha.json` | ንስሓ · Repentance |
| `Zewetr.json` | ዘወትር · Everyday |
| `Mera.json` | መርዓ · Wedding |

> **Note:** Hymns from Mariam or Egziabher with subcategory **Mera** are automatically saved to both their category file AND `Mera.json`.

---

## Hymn Data Format

Each hymn is saved matching the Wazema Flutter app schema exactly:

```json
{
  "id": "hymn_abc123",
  "category": "Mariam",
  "subcategory": "KidaneMehret",
  "group": {
    "ti": "ማርያም",
    "am": "ማርያም",
    "en": "Mary",
    "ti_ro": "Mariyam",
    "am_ro": "Mariyam"
  },
  "title": {
    "ti": "ውዳሴ ማርያም",
    "en": "Praises of Mary"
  },
  "lyrics": {
    "ti": "[[chorus]]\nChorus text\n[[/chorus]]\n\n[[highlight]]Special line [[/highlight]]rest of line",
    "en": "[[chorus]]\nChorus text\n[[/chorus]]\n\nVerse 1..."
  },
  "subtitle": {
    "ti": "ቀሲስ ዕንግዳ ወርቅ",
    "en": "Priest Engedaworqe"
  },
  "youtubeUrls": {
    "ti": "https://youtube.com/...",
    "en": "https://youtube.com/..."
  },
  "singer": "Name of Zemari/t",
  "color": "#DB2777"
}
```

### Lyrics Tag Format

| Tag | Meaning |
|-----|---------|
| `[[chorus]]...[[/chorus]]` | Chorus block — auto-inserted after every verse |
| `[[highlight]]prefix [[/highlight]]rest` | Inline highlight for repeated phrases |

---

## Merge / Multi-Volunteer Workflow

When Volunteer A submits in Tigrinya and Volunteer B wants to add English:

1. Volunteer B types the hymn in English
2. Taps **✝ Submit**
3. The tool finds the existing Tigrinya version on GitHub
4. Shows: *"Already has: ti — You are adding: en"*
5. Volunteer B selects the existing hymn → taps **⇄ Merge Languages**
6. English is added to the same record — no duplicates

---

## Technical Setup

### Requirements
- Public GitHub repository (`EskndrEssey/Mezmur-Typer`)
- GitHub Pages enabled on `main` branch
- GitHub Personal Access Token with `repo` scope
- Anthropic API key for Auto-Romanize feature (optional)
- No backend, no server, no frameworks — pure HTML + CSS + JavaScript

### Repository Structure
```
Mezmur-Typer/
├── data/
│   ├── Mariam.json
│   ├── Egziabher.json
│   ├── Michael.json
│   ├── Gabriel.json
│   ├── Giorgis.json
│   ├── Yohannes.json
│   ├── Sillase.json
│   ├── KidusnAbbot.json
│   ├── KidusnMelaikt.json
│   ├── Nissha.json
│   ├── Zewetr.json
│   └── Mera.json
├── app.js        ← All application logic
├── index.html    ← App structure and sheets
├── styles.css    ← Apple-inspired dark mode design
└── README.md     ← This file
```

### Browser Storage
| Key | Value |
|-----|-------|
| `wazema_hymns` | All hymn drafts |
| `wazema_active_id` | Last selected hymn |
| `wz_gh_token` | GitHub token |
| `wz_vol_pass` | Volunteer password |
| `wz_vol_token_session` | Session token (clears on tab close) |
| `wz_anthropic_key` | Anthropic API key for romanization |

### Autosave
Every keystroke auto-saves to localStorage after 400ms. Work is never lost. Cmd/Ctrl + S forces immediate save.

---

## Offline Support

The tool works **fully offline** for drafting:
- Type and edit hymns without internet
- All drafts saved locally to the device
- Use **⧉ Copy JSON** to copy and send hymn manually

Only **Submit**, **Merge**, and **Auto-Romanize** require internet.

---

## Live Site

**https://eskndressee.github.io/Mezmur-Typer**

Password: `Mezmur2025`

---

## Contact

**Deacon Eskndr Tadesse**
Saint George Eritrean Orthodox Church
Seattle, Washington

*"ስም እግዚኣብሂር ኣምላኽና ዝከበረን ዝተመስገነን ይኹን" — May the name of God be glorified.*

---

*Built with ❤️ for the Eritrean Orthodox community. Wazema Flutter app by Deacon Eskndr Tadesse.*
