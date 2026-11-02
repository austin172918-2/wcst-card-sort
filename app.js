(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const names = { colors: ['紅色', '綠色', '黃色', '藍色'], shapes: ['三角形', '星形', '十字形', '圓形'] };
  const colors = ['#ce4a39', '#4d785c', '#c59d2c', '#477eaa'];
  const paths = ['<path d="M40 7 75 68H5Z"/>', '<path d="m40 4 10 24 26 2-20 18 6 26-22-14-22 14 6-26L4 30l26-2Z"/>', '<path d="M26 5h28v21h21v28H54v21H26V54H5V26h21Z"/>', '<circle cx="40" cy="40" r="34"/>'];
  let session = null;
  let screen = 'intro';
  let phase = 'idle';
  let decisionStarted = null;
  let decisionElapsed = 0;
  let feedbackTimer = null;
  let feedbackStarted = null;
  let feedbackRemaining = 800;
  const targets = $('targets');
  function describe(card) { return card.number + ' 個' + names.colors[card.color] + names.shapes[card.shape]; }
  function symbols(card) {
    const svg = '<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false" fill="' + colors[card.color] + '">' + paths[card.shape] + '</svg>';
    return '<div class="symbols count-' + card.number + '" aria-hidden="true">' + svg.repeat(card.number) + '</div>';
  }
  CardSort.KEYS.forEach((card, index) => {
    const button = document.createElement('button');
    button.className = 'target';
    button.setAttribute('aria-label', '選擇卡片 ' + (index + 1) + '：' + describe(card));
    button.innerHTML = symbols(card);
    button.addEventListener('click', () => choose(index));
    targets.appendChild(button);
  });
  const targetButtons = [...targets.children];
  function canRun() { return screen === 'game' && !document.hidden; }
  function freeze() {
    const now = performance.now();
    if (decisionStarted !== null) { decisionElapsed += now - decisionStarted; decisionStarted = null; }
    if (feedbackTimer !== null) {
      clearTimeout(feedbackTimer);
      feedbackTimer = null;
      feedbackRemaining = Math.max(0, feedbackRemaining - (now - feedbackStarted));
      feedbackStarted = null;
    }
  }
  function thaw() {
    if (!canRun()) return;
    if (phase === 'choice' && decisionStarted === null) decisionStarted = performance.now();
    if (phase === 'feedback' && feedbackTimer === null) {
      feedbackStarted = performance.now();
      feedbackTimer = setTimeout(() => {
        feedbackTimer = null;
        feedbackStarted = null;
        if (session.finished) finish(); else deal();
      }, feedbackRemaining);
    }
  }
  function showScreen(next) {
    freeze();
    screen = next;
    ['intro', 'game', 'results'].forEach(id => { $(id).hidden = id !== next; });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function start() {
    freeze();
    session = new CardSort.Session();
    showScreen('game');
    updateCounter();
    deal();
    $('game-heading').focus({ preventScroll: true });
  }
  function updateCounter() {
    $('correct-counter').textContent = '答對題數：' + session.summary().correct + ' / 128';
  }
  function deal() {
    phase = 'choice';
    decisionElapsed = 0;
    decisionStarted = null;
    const response = $('response-card');
    response.innerHTML = symbols(session.card);
    response.setAttribute('aria-label', '新的卡片：' + describe(session.card));
    targetButtons.forEach(button => { button.disabled = false; button.classList.remove('chosen', 'incorrect'); });
    $('feedback').textContent = '';
    thaw();
  }
  function choose(index) {
    if (phase !== 'choice' || !canRun()) return;
    freeze();
    const record = session.answer(index, decisionElapsed);
    updateCounter();
    phase = 'feedback';
    targetButtons.forEach(button => { button.disabled = true; });
    targetButtons[index].classList.add('chosen');
    if (!record.correct) targetButtons[index].classList.add('incorrect');
    $('feedback').textContent = record.correct ? '答對' : '答錯';
    feedbackRemaining = 800;
    thaw();
  }
  function finish() {
    phase = 'finished';
    showScreen('results');
    const summary = session.summary();
    const reference = session.researchReference();
    $('metric-correct').textContent = summary.correct + ' / 128';
    $('metric-trials').textContent = summary.total;
    $('metric-accuracy').textContent = (summary.accuracy * 100).toFixed(1) + '%';
    $('metric-categories').textContent = summary.categoriesCompleted + ' / 6';
    const z = Math.abs(reference.zScore) < 0.005 ? 0 : reference.zScore;
    $('metric-z').textContent = (z > 0 ? '+' : '') + z.toFixed(2);
    const percentile = reference.normalModelPercentile;
    $('metric-percentile').textContent = percentile < 1 ? '低於第 1 百分位' : percentile > 99 ? '高於第 99 百分位' : '約第 ' + Math.round(percentile) + ' 百分位';
    $('results-heading').focus({ preventScroll: true });
  }
  $('start-button').addEventListener('click', start);
  document.addEventListener('visibilitychange', () => { if (document.hidden) freeze(); else thaw(); });
  document.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (screen === 'game' && /^[1-4]$/.test(event.key)) { event.preventDefault(); choose(Number(event.key) - 1); }
  });
  window.addEventListener('beforeunload', event => { if (screen === 'game' && session && session.records.length > 0) { event.preventDefault(); event.returnValue = ''; } });
})();
