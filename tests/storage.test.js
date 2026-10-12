const test = require('node:test');
const assert = require('node:assert/strict');

test('localStorage 없거나 throw해도 동작 (Review4)', () => {
  global.window = { localStorage: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } } };
  delete require.cache[require.resolve('../storage.js')];
  const Store = require('../storage.js');
  Store.set('x', { a: 1 });
  assert.deepEqual(Store.get('x', null), { a: 1 });
  assert.equal(Store.ok, false);
});

test('정상 localStorage 왕복', () => {
  const mem = {};
  global.window = { localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } } };
  delete require.cache[require.resolve('../storage.js')];
  const Store = require('../storage.js');
  Store.set('y', [1, 2]);
  assert.deepEqual(Store.get('y', []), [1, 2]);
  assert.ok(Object.keys(mem).every((k) => k.startsWith('jejutrip:v1:')));
});
