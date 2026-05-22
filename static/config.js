document.getElementById('file-input').addEventListener('change', function () {
  document.getElementById('file-name').textContent = this.files[0]
    ? this.files[0].name
    : '';
});

function showResult(elId, message, type) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.className = 'import-result ' + type;
  setTimeout(() => {
    el.className = 'import-result';
  }, 5000);
}

function showExtracted(data) {
  const container = document.getElementById('import-extracted');
  const summary = document.getElementById('import-extracted-summary');
  const wordList = document.getElementById('import-extracted-words');
  if (!data.extractedWords || data.extractedWords.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';
  let parts = [`${data.added} added`];
  if (data.noAudio) parts.push(`${data.noAudio} no audio`);
  if (data.disabled) parts.push(`${data.disabled} not in dictionary`);
  if (data.skipped) parts.push(`${data.skipped} skipped`);
  summary.textContent =
    parts.join(', ') +
    ` / ${data.totalExtracted} extracted (${data.percentage}%)`;
  wordList.innerHTML = data.extractedWords
    .map((w) => `<span class="extracted-word">${w}</span>`)
    .join('');
}

async function extractWords() {
  const file = document.getElementById('file-input').files[0];
  const text = document.getElementById('text-input').value.trim();
  const group = document.getElementById('import-group').value.trim();
  if (!file && !text) {
    showResult('import-result', 'Please enter text or choose a file.', 'error');
    return;
  }
  try {
    let rawWords;
    if (file) {
      const rawText = await file.text();
      const filename = file.name.toLowerCase();
      if (filename.endsWith('.json')) {
        try {
          const imported = JSON.parse(rawText);
          if (Array.isArray(imported)) {
            rawWords = imported
              .filter((w) => w.word)
              .map((w) => w.word.toLowerCase());
          } else {
            rawWords = Store.extractWordsFromText(rawText);
          }
        } catch {
          rawWords = Store.extractWordsFromText(rawText);
        }
      } else {
        rawWords = Store.extractWordsFromText(rawText);
      }
    } else {
      rawWords = Store.extractWordsFromText(text);
    }
    if (!Array.isArray(rawWords)) rawWords = Store.extractWordsFromText(text);
    const data = await Store.importWords(rawWords, group);
    let msg = `Added: ${data.added}`;
    if (data.noAudio) msg += `, No audio: ${data.noAudio}`;
    if (data.disabled) msg += `, Not in dictionary: ${data.disabled}`;
    if (data.skipped) msg += `, Skipped: ${data.skipped}`;
    showResult('import-result', msg, 'success');
    showExtracted(data);
    document.getElementById('text-input').value = '';
    document.getElementById('file-input').value = '';
    document.getElementById('file-name').textContent = '';
    document.getElementById('import-group').value = '';
    loadWords();
  } catch (e) {
    showResult('import-result', 'Error extracting words: ' + e.message, 'error');
  }
}

function importJson() {
  const file = document.getElementById('json-import').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = Store.importJson(e.target.result);
      showResult(
        'json-result',
        `Added: ${data.added}, Merged: ${data.merged}`,
        'success'
      );
      loadWords();
    } catch (err) {
      showResult('json-result', 'Error importing JSON: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

function exportWords() {
  Store.exportWords();
}

function deleteAll() {
  if (!confirm('Delete ALL words? This cannot be undone.')) return;
  Store.deleteAll();
  loadWords();
}

function deleteFiltered() {
  const search = document.getElementById('word-search').value;
  const status = document.getElementById('word-status-filter').value;
  const group = document.getElementById('word-group-filter').value;
  if (
    !confirm('Delete all words matching the current filters? This cannot be undone.')
  )
    return;
  const removed = Store.deleteFiltered({ q: search, status, group });
  alert(`Deleted ${removed} words.`);
  loadWords();
}

function deleteGroup(group) {
  if (!confirm(`Delete all words in group "${group}"?`)) return;
  Store.deleteGroup(group);
  loadWords();
}

async function toggleWord(word, enabled) {
  try {
    await Store.toggleWord(word, enabled);
  } catch (e) {
    alert(e.message || 'Cannot enable this word.');
  }
  loadWords();
}

function deleteWord(word) {
  if (!confirm(`Delete "${word}"?`)) return;
  Store.deleteWord(word);
  loadWords();
}

function loadWords() {
  const search = document.getElementById('word-search').value;
  const status = document.getElementById('word-status-filter').value;
  const group = document.getElementById('word-group-filter').value;
  const limit = document.getElementById('word-limit-select').value;
  const result = Store.listWords({
    q: search,
    status,
    group,
    limit,
  });
  const words = result.words;
  const total = result.total;
  const groups = result.groups || [];
  const groupFilter = document.getElementById('word-group-filter');
  const currentGroupVal = groupFilter.value;
  groupFilter.innerHTML =
    '<option value="">All groups</option>' +
    groups
      .map(
        (g) =>
          `<option value="${g}" ${g === currentGroupVal ? 'selected' : ''}>${g}</option>`
      )
      .join('');

  const tbody = document.getElementById('word-tbody');
  const noWords = document.getElementById('no-words');
  const wrapper = document.getElementById('word-table-wrapper');
  const countInfo = document.getElementById('word-count-info');
  const deleteFilteredBtn = document.getElementById('delete-filtered-btn');
  const hasFilter = search || status || group;
  deleteFilteredBtn.style.display = hasFilter ? '' : 'none';
  if (words.length === 0) {
    noWords.style.display = '';
    wrapper.style.display = 'none';
    countInfo.textContent = '';
    return;
  }
  noWords.style.display = 'none';
  wrapper.style.display = '';
  countInfo.textContent =
    total !== words.length
      ? `Showing ${words.length} of ${total} words`
      : `${total} words`;
  tbody.innerHTML = words
    .map(
      (w) => `
    <tr>
      <td><strong>${w.word}</strong></td>
      <td class="group-cell">${w.group || '<span style="color:var(--text-secondary)">\u2014</span>'}${w.group ? ` <button class="btn btn-danger btn-small" onclick="deleteGroup('${w.group.replace(/'/g, "\\'")}')" title="Delete group">&times;</button>` : ''}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${w.enabled ? 'checked' : ''} onchange="toggleWord('${w.word}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>${w.correct || 0}</td>
      <td>${w.incorrect || 0}</td>
      <td><button class="btn btn-danger btn-small" onclick="deleteWord('${w.word}')">Delete</button></td>
    </tr>
  `
    )
    .join('');
}

document.addEventListener('DOMContentLoaded', loadWords);