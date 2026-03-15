# ዋዜማ · Wazema Hymn Entry Tool

**Built for Saint George Eritrean Orthodox Church — Seattle**
*Deacon Eskndr Tadesse*

---

## What Is This?

Wazema is a volunteer-powered hymn entry tool built to help digitize hundreds of Orthodox hymns (መዛሙር) for the **Wazema Flutter app**. Volunteers use this web tool to type hymns in multiple languages, and submissions go directly into a structured JSON database on GitHub — ready to be pulled into the mobile app.

The tool is named after **ዋዜማ (Wazema)** — the eve of a feast day in the Ethiopian and Eritrean Orthodox Tewahedo tradition, a time of prayer, hymns, and preparation.

---

## Who Uses It

- **Deacon Eskndr Tadesse** — Admin. Sets up the tool, manages the token, reviews submissions.
- **Volunteers** — Members of the church community who type hymns. They only need the site password and a GitHub token.

---

## How It Works

### For Volunteers
1. Open the site link shared by Deacon Eskndr
2. Enter the volunteer password
3. First time submitting: paste the GitHub token you were given
4. Select a **category** (e.g. ማርያም · Mariam) using the toggle buttons
5. Select a **subcategory** if applicable (e.g. Kidane Mehret)
6. Fill in the hymn details:
   - Title and subtitle per language
   - Zemari/t (singer, composer, or author)
   - YouTube URL per language (optional)
7. Type the **Chorus / ኣዝ** once — it will automatically repeat after every verse on export
8. Add **Verses / ስታንዛ** one by one. Each verse has individual lines. Mark any special repeated line (like "Praises of Mary") using the gold prefix box on the left of each line
9. Switch language tabs to add other languages (Tigrinya, Amharic, English, Oromo, Romanian, and romanized versions)
10. Click **✝ Submit** — the tool checks for duplicates first
11. If a similar hymn already exists in another language, you can **⇄ Merge Languages** to add your language to the existing record

### For Admin (Deacon Eskndr)
1. Open the site
2. Click **⚙ Admin** in the top header
3. Enter:
   - **Volunteer Password** — shared with all volunteers
   - **GitHub Personal Access Token** — your `ghp_xxx` token with `repo` scope
4. Click **Save Settings**
5. Click **✝ Create All Group JSON Files on GitHub** — this sets up all 12 category files in the `data/` folder
6. Share the site URL and password with volunteers

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

Each category corresponds to one JSON file in the `data/` folder of the GitHub repo:

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

> **Note:** If a hymn belongs to Mariam or Egziabher AND is a wedding hymn, it gets saved to both its category file AND `Mera.json` automatically.

---

## Hymn Data Format

Each hymn is saved in the following JSON structure (matching the Wazema Flutter app schema exactly):

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
    "ti": "[[chorus]]\nChorus text\n[[/chorus]]\n\nVerse 1 line 1\n[[highlight]]Special line [[/highlight]]rest of line",
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
| `[[highlight]]prefix [[/highlight]]rest` | Inline highlight — e.g. `[[highlight]]Praises of Mary [[/highlight]]in the morning prayers` |

---

## Merge / Multi-Volunteer Workflow

When Volunteer A submits a hymn in Tigrinya and Volunteer B wants to add the English version:

1. Volunteer B types the hymn in English
2. Clicks **✝ Submit**
3. The tool searches GitHub and finds the existing Tigrinya version
4. Shows: *"Already has: ti — You are adding: en"*
5. Volunteer B clicks **Select this hymn to merge into** → then **⇄ Merge Languages**
6. The English is added to the existing record — no duplicates created

---

## Technical Setup

### Requirements
- A public GitHub repository
- GitHub Pages enabled on the `main` branch
- A GitHub Personal Access Token with `repo` scope
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
├── index.html    ← App structure and modals
├── styles.css    ← Apple-inspired dark mode design
└── README.md     ← This file
```

### Local Storage
The tool saves all hymn drafts to the browser's `localStorage` automatically:
- `wazema_hymns` — all hymn drafts
- `wazema_active_id` — last selected hymn
- `wz_vol_token_session` — volunteer token (session only, cleared on browser close)
- `wz_vol_pass` — volunteer password (admin sets this)
- `wz_gh_token` — admin GitHub token

### Autosave
Every keystroke is debounced and saved to localStorage after 400ms. Work is never lost even if the browser is closed. Cmd/Ctrl + S forces an immediate save.

---

## Offline Support

The tool works **fully offline** for drafting hymns. Volunteers can:
- Type and edit hymns without internet
- Save drafts locally
- Use **⧉ Copy JSON** to copy the formatted hymn and send it manually

Only **Submit** and **Merge** require an internet connection (to reach GitHub).

---

## Contact

**Deacon Eskndr Tadesse**
Saint George Eritrean Orthodox Church
Seattle, Washington

*"ስም እግዚኣብሂር ኣምላኽና ዝከበረን ዝተመስገነን ይኹን" — May the name of God be glorified.*

---

*Built with ❤️ for the Eritrean Orthodox community. Wazema Flutter app by Deacon Eskndr Tadesse.*
