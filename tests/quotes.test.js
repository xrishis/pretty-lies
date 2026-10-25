import test from 'node:test';
import assert from 'node:assert/strict';
import { QuoteCollection, quotes } from '../src/quotes.js';

function memoryStorage(initial) {
  let value = initial;
  return { getItem: () => value, setItem: (_key, next) => { value = next; } };
}

test('categories return only matching feelings, and cycling wraps both ways', () => {
  const collection = new QuoteCollection(memoryStorage(null));
  collection.filter('healing');
  assert.equal(collection.items.length, 3);
  assert.ok(collection.items.every(quote => quote.category === 'healing'));
  collection.move(-1);
  assert.equal(collection.index, 2);
  collection.move(1);
  assert.equal(collection.index, 0);
});

test('saved quotes persist and removing the last saved quote gives a valid empty state', () => {
  const storage = memoryStorage(null);
  const collection = new QuoteCollection(storage);
  const original = collection.current.id;
  collection.toggleSaved();
  const reloaded = new QuoteCollection(storage);
  reloaded.filter('saved');
  assert.equal(reloaded.current.id, original);
  reloaded.toggleSaved();
  assert.equal(reloaded.current, null);
  reloaded.move(1);
  assert.equal(reloaded.index, 0);
});

test('corrupt, invalid, and unavailable browser storage do not break quote discovery', () => {
  for (const input of ['{broken', 'null', '{}', '[999,"bad"]']) {
    const collection = new QuoteCollection(memoryStorage(input));
    assert.equal(collection.saved.size, 0);
    assert.equal(collection.current.id, quotes[0].id);
  }
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  const collection = new QuoteCollection(denied);
  collection.toggleSaved();
  assert.equal(collection.saved.size, 1);
});

test('all original quotes mention pretty lies and unknown filters recover safely', () => {
  assert.equal(quotes.length, 9);
  assert.ok(quotes.every(quote => /pretty lies/i.test(quote.text)));
  const collection = new QuoteCollection(memoryStorage(null));
  collection.filter('unknown');
  assert.equal(collection.items.length, 9);
});
