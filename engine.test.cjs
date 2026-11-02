const test = require('node:test');
const assert = require('node:assert/strict');
const { Session, KEYS, makeDeck, RULES } = require('./engine.js');
const correctChoice = s => KEYS.findIndex(k => k[s.rule] === s.card[s.rule]);
test('two balanced independent 64-card decks', () => {
  const deck = makeDeck(() => 0.42);
  assert.equal(deck.length, 128);
  for (const half of [deck.slice(0, 64), deck.slice(64)]) {
    assert.equal(new Set(half.map(c => JSON.stringify(c))).size, 64);
    for (let i = 0; i < 4; i++) assert.equal(half.filter(c => c.color === i).length, 16);
  }
});
test('rule changes only after ten consecutive correct; error resets streak', () => {
  const s = new Session({ random: () => 0.2 });
  for (let i = 0; i < 9; i++) s.answer(correctChoice(s), 125);
  assert.equal(s.category, 0);
  s.answer((correctChoice(s) + 1) % 4, 100);
  assert.equal(s.streak, 0);
  for (let i = 0; i < 9; i++) s.answer(correctChoice(s), 100);
  assert.equal(s.rule, 'color');
  const record = s.answer(correctChoice(s), 100);
  assert.equal(record.category, 1);
  assert.equal(record.rule, 'color');
  assert.equal(record.categoryCompleted, true);
  assert.equal(s.rule, 'shape');
  assert.equal(s.streak, 0);
});
test('60 correct responses finish all six categories, no further answers accepted', () => {
  const s = new Session();
  for (let i = 0; i < 60; i++) {
    assert.equal(s.rule, RULES[Math.floor(i / 10)]);
    assert.equal(s.answer(correctChoice(s), 123.4).correct, true);
  }
  assert.equal(s.finished, true);
  assert.equal(s.card, null);
  assert.equal(s.answer(0, 100), null);
  assert.equal(s.records.length, 60);
  assert.deepEqual(s.summary(), { total: 60, correct: 60, errors: 0, accuracy: 1, categoriesCompleted: 6, meanResponseMs: 123, endReason: 'six_categories' });
  assert.ok(s.finishedAt);
});
test('128 wrong responses hit hard limit with zero categories', () => {
  const s = new Session();
  for (let i = 0; i < 128; i++) s.answer((correctChoice(s) + 1) % 4, 500);
  assert.equal(s.finished, true);
  assert.equal(s.summary().total, 128);
  assert.equal(s.summary().accuracy, 0);
  assert.equal(s.summary().endReason, 'trial_limit');
  assert.equal(s.category, 0);
});
test('sixth category completed exactly on 128th trial counts as completed', () => {
  const s = new Session();
  for (let i = 0; i < 68; i++) s.answer((correctChoice(s) + 1) % 4, 0);
  for (let i = 0; i < 60; i++) s.answer(correctChoice(s), 0);
  assert.equal(s.summary().endReason, 'six_categories');
  assert.equal(s.category, 6);
  assert.equal(s.records.length, 128);
});
test('matching any other dimension cannot make an incorrect response correct', () => {
  for (const rule of ['color', 'shape', 'number']) for (const card of makeDeck().slice(0,64)) {
    const s = new Session();
    s.category = RULES.indexOf(rule);
    s.deck[0] = card;
    for (let choice = 0; choice < 4; choice++) {
      const other = new Session();
      other.category = s.category;
      other.deck[0] = card;
      assert.equal(other.answer(choice, 100).correct, card[rule] === KEYS[choice][rule]);
    }
  }
});
test('reject invalid inputs without changing data; export preserves provenance and final rule', () => {
  const s = new Session();
  for (const choice of [-1, 4, NaN, 0.1]) assert.throws(() => s.answer(choice, 0), RangeError);
  for (const time of [-1, NaN, Infinity]) assert.throws(() => s.answer(0, time), RangeError);
  assert.equal(s.records.length, 0);
  s.answer(correctChoice(s), 1234);
  const data = s.exportData();
  assert.equal(data.records[0].responseMs, 1234);
  assert.equal(data.records[0].choice >= 1 && data.records[0].choice <= 4, true);
  assert.equal(data.summary.accuracy, 1);
  assert.equal(data.parameters.maxTrials, 128);
  assert.equal(data.source, 'https://doi.org/10.1037/xge0000661');
  data.records.pop();
  assert.equal(s.records.length, 1);
});
test('study comparison matches independently calculated standard normal estimates', () => {
  const { compareAccuracyToStudy } = require('./engine.js');
  for (const [accuracy, percentile] of [[0.6, 22.412], [0.7, 45.813], [0.8, 70.816], [0.9, 88.516]]) {
    const result = compareAccuracyToStudy(accuracy);
    assert.ok(Math.abs(result.normalModelPercentile - percentile) < 0.02);
    assert.equal(result.percentileRank, null);
    assert.equal(result.model, 'normal_approximation_from_published_mean_and_sd');
  }
  const middle = compareAccuracyToStudy(0.7161);
  assert.ok(Math.abs(middle.zScore) < 1e-12);
  assert.ok(Math.abs(middle.normalModelPercentile - 50) < 1e-5);
  assert.throws(() => compareAccuracyToStudy(NaN), RangeError);
  assert.throws(() => compareAccuracyToStudy(-0.01), RangeError);
  assert.throws(() => compareAccuracyToStudy(1.01), RangeError);
});
test('early completion compares actual accuracy rather than correct count over 128', () => {
  const s = new Session();
  assert.equal(s.researchReference(), null);
  s.answer((correctChoice(s) + 1) % 4, 100);
  for (let i = 0; i < 60; i++) s.answer(correctChoice(s), 100);
  const reference = s.researchReference();
  assert.equal(s.summary().total, 61);
  assert.equal(reference.accuracyPercent, 100 * 60 / 61);
  assert.equal(reference.percentileRank, null);
  assert.deepEqual(s.exportData().researchReference, reference);
  assert.equal(s.exportData().parameters.maxTrials, 128);
});
test('model estimates are finite, bounded, and monotonic across the full accuracy range', () => {
  const { compareAccuracyToStudy } = require('./engine.js');
  let last = -1;
  for (let i = 0; i <= 1000; i++) {
    const percentile = compareAccuracyToStudy(i / 1000).normalModelPercentile;
    assert.ok(Number.isFinite(percentile) && percentile >= 0 && percentile <= 100);
    assert.ok(percentile > last);
    last = percentile;
  }
});
