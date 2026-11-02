(function (root) {
  'use strict';
  const VERSION = '1.3.0';
  const RULES = ['color', 'shape', 'number', 'color', 'shape', 'number'];
  const KEYS = Object.freeze(Array.from({ length: 4 }, (_, i) => Object.freeze({ color: i, shape: i, number: i + 1 })));
  function shuffled(items, random) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function makeDeck(random = Math.random) {
    const cards = [];
    for (let color = 0; color < 4; color++) for (let shape = 0; shape < 4; shape++) for (let number = 1; number <= 4; number++) cards.push({ color, shape, number });
    return [...shuffled(cards, random), ...shuffled(cards, random)].map(card => Object.freeze({ ...card }));
  }
  const STUDY_REFERENCE = Object.freeze({
    meanAccuracyPercent: 71.61,
    sdPercentagePoints: 15.31,
    source: 'https://doi.org/10.1037/xge0000661',
    fullText: 'https://www.leorzmigrod.com/_files/ugd/a64c5e_d74504da38e04b428f632aaeb64fcd61.pdf',
    sourcePage: 5,
    population: 'WCST participants in Zmigrod et al. (2020), not the general population or this game’s players'
  });
  function normalCdf(z) {
    const x = Math.abs(z);
    const t = 1 / (1 + 0.2316419 * x);
    const tail = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI) * t *
      (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z >= 0 ? 1 - tail : tail;
  }
  function compareAccuracyToStudy(accuracy) {
    if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) throw new RangeError('Accuracy must be between 0 and 1');
    const accuracyPercent = accuracy * 100;
    const zScore = (accuracyPercent - STUDY_REFERENCE.meanAccuracyPercent) / STUDY_REFERENCE.sdPercentagePoints;
    return {
      name: '研究樣本參考位置（常態近似估計）',
      accuracyPercent,
      zScore,
      normalModelPercentile: 100 * normalCdf(zScore),
      model: 'normal_approximation_from_published_mean_and_sd',
      reference: { ...STUDY_REFERENCE },
      percentileRank: null,
      interpretation: 'Higher values indicate higher task accuracy relative to the study reference; no ideological or personality ranking',
      limitations: 'Model estimate only. Original score distribution has not been verified as normal; accuracy is bounded and this game differs from the original procedure. Not an empirical percentile or a standardized norm.'
    };
  }
  class Session {
    constructor({ random = Math.random } = {}) {
      this.deck = makeDeck(random);
      this.records = [];
      this.category = 0;
      this.streak = 0;
      this.finished = false;
      this.startedAt = new Date().toISOString();
      this.finishedAt = null;
      this.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'wcst-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    }
    get card() { return this.finished ? null : this.deck[this.records.length]; }
    get rule() { return this.finished ? null : RULES[this.category]; }
    answer(choice, responseMs) {
      if (this.finished) return null;
      if (!Number.isInteger(choice) || choice < 0 || choice > 3) throw new RangeError('Invalid card choice');
      if (!Number.isFinite(responseMs) || responseMs < 0) throw new RangeError('Invalid response time');
      const rule = this.rule;
      const card = this.card;
      const correct = card[rule] === KEYS[choice][rule];
      this.streak = correct ? this.streak + 1 : 0;
      const completed = this.streak === 10;
      const record = Object.freeze({ trial: this.records.length + 1, category: this.category + 1, rule, card: { ...card }, choice: choice + 1, correct, responseMs: Math.round(responseMs), streak: this.streak, categoryCompleted: completed });
      this.records.push(record);
      if (completed) { this.category++; this.streak = 0; }
      this.finished = this.category === 6 || this.records.length === 128;
      if (this.finished) this.finishedAt = new Date().toISOString();
      return record;
    }
    summary() {
      const total = this.records.length;
      const correct = this.records.reduce((sum, r) => sum + Number(r.correct), 0);
      return { total, correct, errors: total - correct, accuracy: total ? correct / total : 0, categoriesCompleted: this.category, meanResponseMs: total ? this.records.reduce((sum, r) => sum + r.responseMs, 0) / total : 0, endReason: this.finished ? (this.category === 6 ? 'six_categories' : 'trial_limit') : null };
    }
    researchReference() {
      return this.records.length ? compareAccuracyToStudy(this.summary().accuracy) : null;
    }
    exportData() {
      return { task: 'WCST-inspired educational card sorting', version: VERSION, sessionId: this.id, startedAt: this.startedAt, finishedAt: this.finishedAt, parameters: { ruleOrder: RULES.slice(), consecutiveCorrectToShift: 10, maxTrials: 128, maxCategories: 6, deck: 'Two independently shuffled sets of all 64 color/shape/number combinations', feedbackMs: 800, responseTime: 'Visible active decision time; hidden tabs excluded' }, summary: this.summary(), researchReference: this.researchReference(), records: this.records.slice(), source: 'https://doi.org/10.1037/xge0000661', note: 'Independent educational adaptation, not original Inquisit software or a standardized diagnostic instrument. No political attitude measures.' };
    }
  }
  const api = { VERSION, RULES: Object.freeze(RULES), KEYS, makeDeck, Session, STUDY_REFERENCE, compareAccuracyToStudy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CardSort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
