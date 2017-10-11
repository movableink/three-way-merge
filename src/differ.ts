import Merger from './merger';
import Collater from './collater';

const identity = (x) => x;

const defaultOptions = {
  splitFunction: (s) => s.split(/\b/),
  joinFunction: (a) => a.join(''),
  conflictFunction: resolveConflicts,
  useClassProcessors: true
};

function resolveConflicts(results) {
  console.log('resolve');
  return results.map((result) => {
    if (result.isResolved()) {
      return result.apply(defaultOptions.joinFunction).result;
    } else {
      const joined = result.apply(defaultOptions.joinFunction);
      const { left, right } = joined;

      return ['<<<<<<< YOUR CHANGES',
              left,
              '=======',
              right,
              '>>>>>>> APP AUTHORS CHANGES'].join('\n');
    }
  }).join("\n");
}

export default function merge(left, base, right, options={}) {
  options = Object.assign({}, defaultOptions, options);

  const [splitLeft, splitBase, splitRight] = [left, base, right].map((t) => {
    return options.splitFunction.call(this, t);
  });

  const mergeResult = Merger.merge(splitLeft, splitBase, splitRight);
  const collatedMergeResults = Collater.collateMerge(mergeResult, options.joinFunction, options.conflictFunction);

  return collatedMergeResults;
}

// not implemented: two_way_diff, split_on_new_line, etc...
