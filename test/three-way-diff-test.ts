import hello from 'three-way-diff';

QUnit.module('three-way-diff tests');

QUnit.test('hello', assert => {
  assert.equal(hello(), 'Hello from three-way-diff');
});
