import Diff2 from '../src/heckel-diff';

QUnit.module('heckel-diff tests');

QUnit.test('computes the difference between two strings', assert => {
  const left =     [3, 4, 5, 6].map(i => i + '');
  const right =    [3, 4, 9, 6].map(i => i + '');

  const subject = Diff2.executeDiff(left, right);
  assert.equal(JSON.stringify(subject.oldText),
               JSON.stringify([{ "text": "3", "low": 0 },
                               { "text": "4", "low": 1 },
                               "5",
                               { "text": "6", "low": 3 }]),
               'segments the left text in relation to the right');
  assert.equal(JSON.stringify(subject.newText),
               JSON.stringify([{ "text": "3", "low": 0 },
                               { "text": "4", "low": 1 },
                               "9"]),
               'segments the right text in relation to the left');

});
