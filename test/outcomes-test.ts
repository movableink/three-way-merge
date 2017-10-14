import { Resolved, Conflicted } from '../src/outcomes';

QUnit.module('outcomes tests');

QUnit.test('resolved outcome has no conflicts', assert => {
  const subject = new Resolved(['a', 'b']);
  assert.equal(subject.isResolved(), true,
               'is resolved');
  assert.equal(subject.isConflicted(), false,
               'has no conflicts');
});

QUnit.test('resolved combines with another resolved', assert => {
  const subject = new Resolved(['a', 'b']);
  const other = new Resolved(['c', 'd']);
  subject.combine(other);

  assert.deepEqual(subject.result, ['a', 'b', 'c', 'd'],
                   'has no conflicts');
});

QUnit.test('conflicted outcome has conflicts', assert => {
  const subject = new Conflicted(['a', 'b'],
                                 ['c', 'd'],
                                 ['e', 'f']);
  assert.equal(subject.isResolved(), false,
               'is not resolved');
  assert.equal(subject.isConflicted(), true,
               'has conflicts');
});

QUnit.test('conflicted outcome applies a function', assert => {
  const subject = new Conflicted(['a', 'b'],
                                 ['c', 'd'],
                                 ['e', 'f']);
  const applied = subject.apply((a: string[]) => a.join(' '));
  assert.deepEqual(applied.left, 'a b',
                   'runs the function on the left branch');
  assert.deepEqual(applied.base, 'c d',
                   'runs the function on the base branch');
  assert.deepEqual(applied.right, 'e f',
                   'runs the function on the right branch');
});
