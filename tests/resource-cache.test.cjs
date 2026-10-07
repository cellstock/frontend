const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('lib/client/resource-cache.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, AbortController, Error, Date, Promise, Set, Map };
vm.runInNewContext(code, context);
const { ResourceCache } = context.exports;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('deduplicates concurrent requests and immediately reuses fresh data', async () => {
  const cache = new ResourceCache(); const wait = deferred(); let calls = 0;
  const loader = () => { calls++; return wait.promise; };
  const first = cache.fetch('orders', loader); const second = cache.fetch('orders', loader);
  await Promise.resolve(); assert.equal(calls, 1);
  wait.resolve({ total: 7 }); await Promise.all([first, second]);
  await cache.fetch('orders', loader); assert.equal(calls, 1);
  assert.equal(cache.get('orders').data.total, 7);
});
test('refresh retains data and an old response cannot overwrite the new response', async () => {
  const cache = new ResourceCache(); await cache.fetch('order:1', async () => 'initial');
  const old = deferred(); let signal;
  const oldRequest = cache.fetch('order:1', s => { signal = s; return old.promise; }, true);
  await Promise.resolve(); assert.equal(cache.get('order:1').data, 'initial');
  await cache.fetch('order:1', async () => 'latest', true);
  assert.equal(signal.aborted, true); old.resolve('outdated'); await oldRequest;
  assert.equal(cache.get('order:1').data, 'latest');
});
test('transient failure preserves records, but forbidden or missing records are removed', async () => {
  const cache = new ResourceCache(); await cache.fetch('order:1', async () => 'saved');
  await cache.fetch('order:1', async () => { throw new Error('offline'); }, true);
  assert.equal(cache.get('order:1').data, 'saved');
  assert.equal(cache.get('order:1').error.message, 'offline');
  await cache.fetch('order:1', async () => { throw Object.assign(new Error('forbidden'), { status: 403 }); }, true);
  assert.equal(cache.get('order:1').data, undefined);
});
test('mutations revalidate active consumers and mark inactive pages stale', async () => {
  const cache = new ResourceCache(); let calls = 0;
  const loader = async () => ++calls;
  await cache.fetch('marketplaces', loader); await cache.fetch('dashboard', async () => 'old');
  const unsubscribe = cache.subscribe('marketplaces', () => {});
  cache.invalidate(); await cache.fetch('marketplaces', loader);
  assert.equal(cache.get('marketplaces').data, 2);
  assert.equal(cache.get('dashboard').updatedAt, 0);
  assert.equal(cache.get('dashboard').data, 'old'); unsubscribe();
});
test('clearing a session aborts pending work and prevents late private data from returning', async () => {
  const cache = new ResourceCache(); const wait = deferred();
  const request = cache.fetch('orders', () => wait.promise);
  cache.clear(); wait.resolve('private'); await request;
  assert.equal(cache.get('orders').data, undefined);
  const otherUserCache = new ResourceCache();
  assert.equal(otherUserCache.get('orders').data, undefined);
});
test('different query keys and detail IDs never share records', async () => {
  const cache = new ResourceCache();
  await cache.fetch('orders?status=PAID', async () => ['paid']);
  await cache.fetch('order:1', async () => ({ id: 1 }));
  assert.equal(cache.get('orders?status=PENDING').data, undefined);
  assert.equal(cache.get('order:2').data, undefined);
});
test('stale pages revalidate on focus while retaining data', async () => {
  const cache = new ResourceCache(); let calls = 0;
  const loader = async () => ++calls;
  await cache.fetch('dashboard', loader);
  cache.get('dashboard').updatedAt = Date.now() - 31_000;
  const unsubscribe = cache.subscribe('dashboard', () => {});
  cache.revalidateActive(); assert.equal(cache.get('dashboard').data, 1);
  await cache.fetch('dashboard', loader); assert.equal(cache.get('dashboard').data, 2);
  unsubscribe();
});
