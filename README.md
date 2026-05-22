# SpellCraft

A simple web-based spelling practice app. Add words from any text, test yourself, and track your progress. No server required — runs entirely in the browser.

## Features

- **Game page**: Definition and masked example always shown at the top. Type into letter boxes, press Enter or click Submit. One action advances to the next word and shows the result (correct/incorrect + correct spelling). Skip also reveals the correct spelling. Audio pronounces automatically on each new word
- **Audio pronunciation**: Auto-plays from the Free Dictionary API on each new word. Listen button to replay
- **Audio gating**: Words without audio are automatically disabled on import and cannot be enabled. Only words with pronunciation audio appear in the game
- **Config page**: Single button auto-detects text input vs file upload (.txt, .md, .json). Assign a group name when importing. Filter/search word list by group, status, or text. Delete individual words, entire groups, filtered results, or all words. Export/import your word list JSON
- **Stats page**: Daily progress chart, mastered/learning/disabled word lists with counts, streak counter
- **Dark/light mode**: Toggle in the nav bar, persisted in localStorage
- **Mastery threshold**: Words answered correctly N times are removed from the game queue (configurable in `static/store.js`)
- **Groups**: Assign a group name when importing words. Delete an entire group in one click from the word list

## Quick Start

Open `index.html` in your browser. No server or build step needed.

For GitHub Pages deployment, push the repo and enable Pages in Settings.

## Configuration

Edit `CORRECT_THRESHOLD` at the top of `static/store.js`:

```js
const CORRECT_THRESHOLD = 3;
```

Default is 3 — the number of correct answers before a word is mastered and removed from the game.

## How It Works

1. Go to **Config**, paste text or upload a file, optionally assign a group name, and click Extract Words
2. Words are validated against the dictionary API. Words with both a definition and audio are enabled; words missing audio or not found in the dictionary are disabled
3. Go to **Game** — enabled words with audio that haven't reached the mastery threshold appear in the quiz. The pronunciation auto-plays for each word
4. The definition and masked example sentence (word replaced with `***`) are shown at the top
5. Type the word into the letter boxes and press Enter or click Submit. The answer is checked, the next word loads immediately, and the result (correct spelling if wrong) is shown at the bottom
6. After a word reaches the correct threshold, it moves to "Mastered" and won't appear in the game

## Word Extractor

A Python script to scan a folder and extract unique words from source files into a `.txt` you can upload or paste into the Config page.

### Usage

```bash
# Scan a folder (default: .md, .py, .ts files)
python extract_words.py /path/to/folder

# Mix files and folders
python extract_words.py README.md /path/to/src /path/to/notes.md

# Custom extensions and output file
python extract_words.py /path/to/folder --ext .md .py .ts .js --output my_words.txt

# Skip specific directories
python extract_words.py /path/to/folder --exclude .git node_modules dist
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `paths` | required | Files and/or folders to scan (mix freely) |
| `--ext` | `.md .py .ts` | File extensions to read when scanning folders |
| `--output` | `words.txt` | Output file (one word per line) |
| `--exclude` | `.git node_modules __pycache__ .venv venv __init__` | Directories to skip |

The output file contains one unique lowercase word per line. Upload it on the Config page or paste the contents into the text area.

## Tech Stack

- **Frontend**: HTML, CSS, vanilla JavaScript
- **Storage**: localStorage (browser-local; use Export JSON for backup)
- **Dictionary API**: [Free Dictionary API](https://api.dictionaryapi.dev/api/v2/entries/en/)

## Data Backup

Since localStorage is browser-local, use **Export JSON** on the Config page to save a backup. Use **Import JSON** to restore on any browser or device.

## Data Schema

```json
[
  {
    "word": "example",
    "added": "2026-05-22",
    "correct": 3,
    "incorrect": 1,
    "enabled": true,
    "group": "lesson-1",
    "phonetic": "/ɪɡˈzæmpəl/",
    "audioUrl": "https://api.dictionaryapi.dev/media/pronunciations/en/example.mp3",
    "definition": "a thing characteristic of its kind",
    "example": "it's a good *** of how to do it",
    "history": [
      { "date": "2026-05-22", "correct": true }
    ]
  }
]
```

- `example`: Pre-masked with `***` where the word appears — always visible as a hint
- `enabled`: Only enabled words with `audioUrl` appear in the game. Words missing audio or not found in the dictionary are automatically disabled on import and cannot be re-enabled
- `group`: Optional group name assigned at import time. Used to delete batches of words
- `history`: Per-attempt log used for daily stats and streak calculation