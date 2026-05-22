function renderWordList(containerId, words, cssClass, noId) {
  const el = document.getElementById(containerId);
  const noEl = document.getElementById(noId);
  if (words.length === 0) {
    el.innerHTML = '';
    noEl.style.display = '';
    return;
  }
  noEl.style.display = 'none';
  el.innerHTML = words.map((w) => `<li class="${cssClass}">${w}</li>`).join('');
}

function loadStats() {
  const data = Store.getStats();

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-box"><div class="stat-value">${data.total}</div><div class="stat-label">Total Words</div></div>
    <div class="stat-box"><div class="stat-value">${data.mastered}</div><div class="stat-label">Mastered</div></div>
    <div class="stat-box"><div class="stat-value">${data.streak}</div><div class="stat-label">Day Streak</div></div>
  `;

  renderWordList('mastered-list', data.masteredWords, 'mastered', 'no-mastered');
  document.getElementById('mastered-count').textContent = `(${data.masteredWords.length})`;
  renderWordList('learning-list', data.learningWords, '', 'no-learning');
  document.getElementById('learning-count').textContent = `(${data.learningWords.length})`;
  renderWordList('disabled-list', data.disabledWords, 'disabled', 'no-disabled');
  document.getElementById('disabled-count').textContent = `(${data.disabledWords.length})`;

  const daily = data.daily || {};
  const today = new Date();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      correct: (daily[key] || {}).correct || 0,
      incorrect: (daily[key] || {}).incorrect || 0,
    });
  }

  const maxVal = Math.max(1, ...days.map((d) => d.correct + d.incorrect));
  const chartEl = document.getElementById('chart-bars');
  chartEl.innerHTML = days
    .map((d) => {
      const cH = (d.correct / maxVal) * 100;
      const iH = (d.incorrect / maxVal) * 100;
      return `
        <div class="chart-bar-group">
          <div class="chart-bar correct-bar" style="height:${cH}%"></div>
          <div class="chart-bar incorrect-bar" style="height:${iH}%"></div>
          <div class="chart-label">${d.label}</div>
        </div>
      `;
    })
    .join('');
}

document.addEventListener('DOMContentLoaded', loadStats);