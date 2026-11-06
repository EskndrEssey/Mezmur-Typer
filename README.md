# ዋዜማ · Wazema Hymn Entry Tool

A mobile-first web app for digitizing Orthodox Ge'ez hymns into structured JSON for the Wazema Flutter app.

Built for the Eritrean Orthodox Tewahedo community.

---

## What it does

Contributors use this tool to type out hymns in multiple languages (Tigrinya, Amharic, English, Oromo) and publish them directly to GitHub. The data powers a mobile app where the congregation can read and follow along during liturgy.

- Multi-language hymn entry with chorus, verse, and highlight structure
- Liturgical category and subgroup tagging
- Artist (ዘማሪ) field with autocomplete from all previously entered hymns
- Submits each hymn as its own JSON file to `data/hymns/` — no backend needed
- Loads the full hymn catalog from GitHub on login so clearing your browser never loses published data
- Live preview before submitting
- Duplicate detection before submitting
- Proof-of-work session tracking for contributors

## Data format

Each hymn is stored as a single JSON file at `data/hymns/<slug>.json` with this shape:

```json
{
  "id": "h_...",
  "category": "Mariam",
  "categories": ["Mariam", "st_mary"],
  "subcategories": ["kidane_mehret"],
  "title": { "ti": "...", "ti_ro": "...", "am": "...", "am_ro": "...", "en": "", "om": "" },
  "lyrics": { "ti": "[[chorus]]\n...\n[[/chorus]]\n\nVerse 1...", ... },
  "youtubeUrls": { "ti": "https://...", ... },
  "singer": "ዘማሪ ፍስሀ ዘለቀ",
  "status": "published",
  "metadata": { "contributor_name": "eskndr", "created_at": "...", "updated_at": "..." }
}
```

Lyrics support `[[chorus]]..[[/chorus]]`, `[[highlight]]..[[/highlight]]`, and plain verse paragraphs.

## Stack

- Vanilla HTML/CSS/JS — no framework
- GitHub REST API for read/write storage
- Hosted on GitHub Pages

## Setup

1. Fork or clone this repo
2. Go to `Settings → Pages` and set source to `main` branch
3. Create a GitHub personal access token with `repo` scope
4. Open the app and paste your token at the login screen

## Access

Contributors log in with a GitHub personal access token. The token is the only credential needed.

---

*ስብሓት ለእግዚአብሔር ✝*
