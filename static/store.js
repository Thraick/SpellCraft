const CORRECT_THRESHOLD = 3;
const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const IMPORT_DELAY_MS = 300;

const Store = (() => {
  function loadWords() {
    try {
      return JSON.parse(localStorage.getItem("words") || "[]");
    } catch {
      return [];
    }
  }

  function saveWords(words) {
    localStorage.setItem("words", JSON.stringify(words));
  }

  function findWord(words, word) {
    for (let i = 0; i < words.length; i++) {
      if (words[i].word.toLowerCase() === word.toLowerCase()) return i;
    }
    return -1;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function extractWordsFromText(text) {
    const matches = text.match(/[a-zA-Z]{2,}/g) || [];
    const seen = new Set();
    const unique = [];
    for (const w of matches) {
      const low = w.toLowerCase();
      if (!seen.has(low)) {
        seen.add(low);
        unique.push(low);
      }
    }
    return unique;
  }

  async function lookupWord(word) {
    try {
      const resp = await fetch(DICTIONARY_API + encodeURIComponent(word));
      if (!resp.ok) return null;
      const data = await resp.json();
      const entry = data[0];
      let phonetic = "";
      let audioUrl = "";
      for (const p of entry.phonetics || []) {
        if (p.text && !phonetic) phonetic = p.text;
        if (p.audio && !audioUrl) audioUrl = p.audio;
      }
      let definition = "";
      let example = null;
      for (const meaning of entry.meanings || []) {
        for (const d of meaning.definitions || []) {
          if (d.definition && !definition) definition = d.definition;
          if (d.example && example === null) example = d.example;
        }
      }
      let maskedExample = null;
      if (example) {
        const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        maskedExample = example.replace(new RegExp(esc, "gi"), "***");
      }
      return { phonetic, audioUrl, definition, example: maskedExample };
    } catch {
      return null;
    }
  }

  function getNextWord(sessionIdx) {
    const words = loadWords();
    const enabled = words.filter(
      (w) => w.enabled && (w.correct || 0) < CORRECT_THRESHOLD && w.audioUrl
    );
    if (enabled.length === 0) return null;
    const idx = sessionIdx || 0;
    const w = enabled[idx % enabled.length];
    return {
      word: w.word,
      length: w.word.length,
      phonetic: w.phonetic || "",
      audioUrl: w.audioUrl || "",
      totalEnabled: enabled.length,
      example: w.example || null,
      definition: w.definition || "",
    };
  }

  function checkWord(word, guess) {
    const words = loadWords();
    const idx = findWord(words, word);
    if (idx === -1) return null;
    const today = todayISO();
    const correct = word.toLowerCase() === guess.toLowerCase();
    if (correct) {
      words[idx].correct = (words[idx].correct || 0) + 1;
    } else {
      words[idx].incorrect = (words[idx].incorrect || 0) + 1;
    }
    if (!words[idx].history) words[idx].history = [];
    words[idx].history.push({ date: today, correct });
    saveWords(words);
    return {
      correct,
      word: words[idx].word,
      definition: words[idx].definition || "",
      example: words[idx].example || null,
    };
  }

  function skipWord(word) {
    const words = loadWords();
    const idx = findWord(words, word);
    if (idx === -1) return null;
    const today = todayISO();
    words[idx].incorrect = (words[idx].incorrect || 0) + 1;
    if (!words[idx].history) words[idx].history = [];
    words[idx].history.push({ date: today, correct: false });
    saveWords(words);
    return {
      correct: false,
      word: words[idx].word,
      definition: words[idx].definition || "",
      example: words[idx].example || null,
    };
  }

  function listWords({ q, status, group, limit } = {}) {
    let words = loadWords();
    if (q) words = words.filter((w) => w.word.toLowerCase().includes(q.toLowerCase()));
    if (group) words = words.filter((w) => (w.group || "") === group);
    if (status === "enabled") words = words.filter((w) => w.enabled);
    else if (status === "disabled") words = words.filter((w) => !w.enabled);
    else if (status === "mastered")
      words = words.filter((w) => w.enabled && (w.correct || 0) >= CORRECT_THRESHOLD);
    else if (status === "learning")
      words = words.filter((w) => w.enabled && (w.correct || 0) < CORRECT_THRESHOLD);
    const total = words.length;
    if (limit) {
      const n = parseInt(limit);
      if (!isNaN(n)) words = words.slice(0, n);
    }
    const allWords = loadWords();
    const groups = [
      ...new Set(allWords.filter((w) => w.group).map((w) => w.group)),
    ].sort();
    return { words, total, groups };
  }

  async function importWords(rawWords, group, onProgress) {
    const words = loadWords();
    const existing = new Set(words.map((w) => w.word.toLowerCase()));
    let added = 0;
    let skipped = 0;
    let disabled = 0;
    let noAudio = 0;
    const today = todayISO();
    const total = rawWords.length;
    for (let i = 0; i < rawWords.length; i++) {
      const raw = rawWords[i];
      if (existing.has(raw)) {
        skipped++;
        if (onProgress) onProgress(i + 1, total);
        continue;
      }
      await new Promise((r) => setTimeout(r, IMPORT_DELAY_MS));
      const info = await lookupWord(raw);
      if (info) {
        if (info.audioUrl) {
          words.push({
            word: raw,
            added: today,
            correct: 0,
            incorrect: 0,
            enabled: true,
            group: group || "",
            phonetic: info.phonetic,
            audioUrl: info.audioUrl,
            definition: info.definition,
            example: info.example,
            history: [],
          });
          existing.add(raw);
          added++;
        } else {
          words.push({
            word: raw,
            added: today,
            correct: 0,
            incorrect: 0,
            enabled: false,
            group: group || "",
            phonetic: info.phonetic,
            audioUrl: "",
            definition: info.definition,
            example: info.example,
            history: [],
          });
          existing.add(raw);
          noAudio++;
        }
      } else {
        words.push({
          word: raw,
          added: today,
          correct: 0,
          incorrect: 0,
          enabled: false,
          group: group || "",
          phonetic: "",
          audioUrl: "",
          definition: "",
          example: null,
          history: [],
        });
        existing.add(raw);
        disabled++;
      }
      saveWords(words);
      if (onProgress) onProgress(i + 1, total);
    }
    const pct = total ? Math.round((added / total) * 1000) / 10 : 0;
    return {
      added,
      skipped,
      disabled,
      noAudio,
      totalExtracted: total,
      percentage: pct,
      extractedWords: rawWords,
    };
  }

  async function toggleWord(word, enabled) {
    const words = loadWords();
    const idx = findWord(words, word);
    if (idx === -1) throw new Error("word not found");
    if (enabled && !words[idx].audioUrl) {
      const info = await lookupWord(word);
      if (info && info.audioUrl) {
        words[idx].enabled = true;
        words[idx].phonetic = info.phonetic;
        words[idx].audioUrl = info.audioUrl;
        words[idx].definition = info.definition;
        words[idx].example = info.example;
      } else {
        throw new Error("word has no audio available");
      }
    } else if (enabled && !words[idx].definition) {
      const info = await lookupWord(word);
      if (info && info.audioUrl) {
        words[idx].enabled = true;
        words[idx].phonetic = info.phonetic;
        words[idx].audioUrl = info.audioUrl;
        words[idx].definition = info.definition;
        words[idx].example = info.example;
      } else {
        throw new Error("word has no audio available");
      }
    } else {
      words[idx].enabled = enabled;
    }
    saveWords(words);
    return words[idx];
  }

  function deleteWord(word) {
    const words = loadWords();
    const idx = findWord(words, word);
    if (idx === -1) return false;
    words.splice(idx, 1);
    saveWords(words);
    return true;
  }

  function deleteAll() {
    saveWords([]);
  }

  function deleteFiltered({ q, status, group } = {}) {
    const words = loadWords();
    const before = words.length;
    function keep(w) {
      if (q && !w.word.toLowerCase().includes(q.toLowerCase())) return true;
      if (group && (w.group || "") !== group) return true;
      if (status === "enabled" && !w.enabled) return true;
      if (status === "disabled" && w.enabled) return true;
      if (status === "mastered" && !(w.enabled && (w.correct || 0) >= CORRECT_THRESHOLD))
        return true;
      if (status === "learning" && !(w.enabled && (w.correct || 0) < CORRECT_THRESHOLD))
        return true;
      return false;
    }
    const remaining = words.filter(keep);
    saveWords(remaining);
    return before - remaining.length;
  }

  function deleteGroup(group) {
    if (!group) return 0;
    const words = loadWords();
    const before = words.length;
    const remaining = words.filter((w) => (w.group || "") !== group);
    saveWords(remaining);
    return before - remaining.length;
  }

  function exportWords() {
    const words = loadWords();
    const blob = new Blob([JSON.stringify(words, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "words.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(content) {
    let imported;
    try {
      imported = JSON.parse(content);
    } catch {
      throw new Error("invalid json");
    }
    if (!Array.isArray(imported)) throw new Error("expected a list");
    const words = loadWords();
    let merged = 0;
    let added = 0;
    const today = todayISO();
    for (const item of imported) {
      if (!item.word) continue;
      const w = item.word.toLowerCase();
      const idx = findWord(words, w);
      if (idx >= 0) {
        if ((item.correct || 0) > (words[idx].correct || 0))
          words[idx].correct = item.correct;
        if ((item.incorrect || 0) > (words[idx].incorrect || 0))
          words[idx].incorrect = item.incorrect;
        merged++;
      } else {
        item.word = w;
        if (!item.added) item.added = today;
        if (item.enabled === undefined) item.enabled = !!item.definition;
        if (!item.history) item.history = [];
        words.push(item);
        added++;
      }
    }
    saveWords(words);
    return { added, merged };
  }

  function getStats() {
    const words = loadWords();
    const total = words.length;
    const enabled = words.filter((w) => w.enabled).length;
    const mastered = words.filter(
      (w) => (w.correct || 0) >= CORRECT_THRESHOLD && w.enabled
    ).length;
    const toLearn = words.filter(
      (w) => (w.correct || 0) < CORRECT_THRESHOLD && w.enabled
    ).length;
    const daily = {};
    for (const w of words) {
      for (const h of w.history || []) {
        const d = h.date || "";
        if (!daily[d]) daily[d] = { correct: 0, incorrect: 0 };
        if (h.correct) daily[d].correct++;
        else daily[d].incorrect++;
      }
    }
    let streak = 0;
    const today = new Date();
    const check = new Date(today);
    while (true) {
      const key = check.toISOString().slice(0, 10);
      if (daily[key]) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    const masteredWords = words
      .filter((w) => (w.correct || 0) >= CORRECT_THRESHOLD && w.enabled)
      .map((w) => w.word);
    const learningWords = words
      .filter((w) => (w.correct || 0) < CORRECT_THRESHOLD && w.enabled)
      .map((w) => w.word);
    const disabledWords = words.filter((w) => !w.enabled).map((w) => w.word);
    return {
      total,
      enabled,
      mastered,
      toLearn,
      streak,
      daily,
      masteredWords,
      learningWords,
      disabledWords,
      threshold: CORRECT_THRESHOLD,
    };
  }

  return {
    loadWords,
    saveWords,
    extractWordsFromText,
    lookupWord,
    getNextWord,
    checkWord,
    skipWord,
    listWords,
    importWords,
    toggleWord,
    deleteWord,
    deleteAll,
    deleteFiltered,
    deleteGroup,
    exportWords,
    importJson,
    getStats,
  };
})();