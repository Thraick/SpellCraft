let currentWord = null;
let currentIndex = 0;
let totalEnabled = 0;
let typedLetters = [];
let lastResult = null;

function renderLetterBoxes() {
  const container = document.getElementById('letter-boxes');
  container.innerHTML = '';
  if (!currentWord) return;
  const word = currentWord.word;
  for (let i = 0; i < word.length; i++) {
    const box = document.createElement('input');
    box.type = 'text';
    box.maxLength = 1;
    box.className = 'letter-box';
    box.autocomplete = 'off';
    box.autocapitalize = 'off';
    box.spellcheck = false;
    box.dataset.index = i;
    box.addEventListener('input', onLetterInput);
    box.addEventListener('keydown', onLetterKeydown);
    box.addEventListener('focus', () => box.select());
    container.appendChild(box);
  }
  const firstBox = container.querySelector('.letter-box');
  if (firstBox) firstBox.focus();
}

function onLetterInput(e) {
  const idx = parseInt(e.target.dataset.index);
  const val = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
  e.target.value = val;
  typedLetters[idx] = val;
  if (val && idx < currentWord.word.length - 1) {
    const boxes = document.querySelectorAll('.letter-box');
    if (boxes[idx + 1]) boxes[idx + 1].focus();
  }
}

function onLetterKeydown(e) {
  const idx = parseInt(e.target.dataset.index);
  if (e.key === 'Enter') {
    e.preventDefault();
    submitGuess();
  } else if (e.key === 'Backspace') {
    if (!e.target.value && idx > 0) {
      const boxes = document.querySelectorAll('.letter-box');
      if (boxes[idx - 1]) {
        boxes[idx - 1].focus();
        typedLetters.splice(idx - 1, 1);
      }
    } else {
      typedLetters[idx] = '';
    }
  } else if (e.key === 'ArrowLeft' && idx > 0) {
    e.preventDefault();
    const boxes = document.querySelectorAll('.letter-box');
    if (boxes[idx - 1]) boxes[idx - 1].focus();
  } else if (e.key === 'ArrowRight' && idx < currentWord.word.length - 1) {
    e.preventDefault();
    const boxes = document.querySelectorAll('.letter-box');
    if (boxes[idx + 1]) boxes[idx + 1].focus();
  }
}

function updateProgress() {
  const fill = document.getElementById('progress-fill');
  if (totalEnabled > 0) {
    fill.style.width = ((currentIndex % totalEnabled + 1) / totalEnabled * 100) + '%';
  }
  document.getElementById('word-counter').textContent = totalEnabled > 0
    ? `${currentIndex % totalEnabled + 1} / ${totalEnabled}`
    : '';
}

function renderFeedback() {
  const feedback = document.getElementById('feedback');
  if (!lastResult) {
    feedback.innerHTML = '';
    return;
  }
  if (lastResult.correct) {
    feedback.innerHTML = `
      <div class="result correct">Correct!</div>
      <div class="correct-word"><strong>${lastResult.word}</strong></div>
    `;
  } else {
    feedback.innerHTML = `
      <div class="result incorrect">Incorrect</div>
      <div class="correct-word">Correct spelling: <strong>${lastResult.word}</strong></div>
      ${lastResult.example ? `<div class="example-sentence">${lastResult.example}</div>` : ''}
    `;
  }
}

function loadWord() {
  typedLetters = [];
  renderFeedback();

  const data = Store.getNextWord(currentIndex);
  if (!data) {
    document.getElementById('empty-state').style.display = '';
    document.getElementById('game-content').style.display = 'none';
    return;
  }
  currentWord = data;
  totalEnabled = data.totalEnabled;
  document.getElementById('definition-display').textContent = data.definition || '';
  document.getElementById('example-display').textContent = data.example || '';
  document.getElementById('example-display').style.display = data.example ? '' : 'none';
  document.getElementById('phonetic').textContent = data.phonetic || '';
  document.getElementById('audio-btn').style.display = data.audioUrl ? '' : 'none';
  renderLetterBoxes();
  updateProgress();
  if (data.audioUrl) {
    const player = document.getElementById('audio-player');
    player.src = data.audioUrl;
    player.load();
    player.play().catch(() => {});
  }
}

function playAudio() {
  if (currentWord && currentWord.audioUrl) {
    const player = document.getElementById('audio-player');
    player.src = currentWord.audioUrl;
    player.play().catch(() => {});
  }
}

function submitGuess() {
  if (!currentWord) return;
  const guess = typedLetters.join('').toLowerCase();
  if (guess.length < currentWord.word.length) {
    const boxes = document.querySelectorAll('.letter-box');
    if (boxes[guess.length]) boxes[guess.length].focus();
    return;
  }

  lastResult = Store.checkWord(currentWord.word, guess);
  currentIndex++;
  loadWord();
}

function skipWord() {
  if (!currentWord) return;
  lastResult = Store.skipWord(currentWord.word);
  currentIndex++;
  loadWord();
}

document.addEventListener('DOMContentLoaded', () => {
  loadWord();
});