import merge from 'three-way-merge';

QUnit.module('three-way-merge tests');

QUnit.test('simple merge', assert => {
  const merged = merge('foo', 'foo', 'bar');
  assert.equal(merged.conflict, false,
               'has no merge conflicts');
  assert.equal(merged.joinedResults(), 'bar',
               "takes right version's changes");
});

QUnit.test('merge conflict', assert => {
  const merged = merge('foo', 'bar', 'baz');
  assert.equal(merged.conflict, true,
               'has a merge conflict');
});

QUnit.test('two different merges', assert => {
  const base =     [1, 2, 3, 4, 5, 6].join("\n");
  const left =     [   2, 3, 4, 5, 6].join("\n");
  const right =    [1, 2, 3, 4, 9, 6].join("\n");
  const expected = [   2, 3, 4, 9, 6].join("\n");

  const merged = merge(left, base, right);
  assert.equal(merged.conflict, false,
               'has no merge conflicts');
  assert.equal(merged.joinedResults(), expected,
               "takes both left and right changes");
});

QUnit.test('reasonable merge performance', assert => {
  const base = "m".repeat(200000).split('').join("\n");
  const left = ['a', 'a', 'a', base].join("\n");
  const right = [base, 'z', 'z'].join("\n");
  const expected = ['a', 'a', 'a', base, 'z', 'z'].join("\n");

  const merged = merge(left, base, right);
  assert.equal(merged.conflict, false,
               'has no merge conflicts');
  assert.equal(merged.joinedResults(), expected,
               "merges reasonably quickly");
});

QUnit.test('merge jsons', assert => {
  const strBase = '{"enabled":false}';
  const strLeft = '{"enabled":true,"other":1}';
  const strRight = '{"enabled":true}';
  const merged = merge(strLeft, strBase, strRight);
  assert.equal(merged.conflict, false,
               'has no merge conflicts');
  
  assert.equal(merged.joinedResults(), strLeft);
});

