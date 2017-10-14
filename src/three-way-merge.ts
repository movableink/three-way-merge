import Merger from './merger';
import MergeResult from './merge-result';
import Collater, {JoinFunction, ConflictFunction} from './collater';
import resolver from './resolver';

const defaultJoinFunction = (a: string[]) => a.join('');
const defaultSplitFunction = (s: string) => s.split(/\b/);
const defaultConflictFunction = resolver('<<<<<<< YOUR CHANGES',
                                         '=======',
                                         '>>>>>>> APP AUTHORS CHANGES',
                                         defaultJoinFunction);

const defaultOptions = {
  splitFunction: defaultSplitFunction,
  joinFunction: defaultJoinFunction,
  conflictFunction: defaultConflictFunction
};

export interface DiffOptions {
  splitFunction: (s: string) => string[],
  joinFunction: JoinFunction,
  conflictFunction: ConflictFunction
}

export default function merge(left: string,
                              base: string,
                              right: string,
                              options=<DiffOptions>{}) : MergeResult {
  options = Object.assign({}, defaultOptions, options);

  const [splitLeft, splitBase, splitRight] = [left, base, right].map((t) => {
    return options.splitFunction.call(options, t);
  });

  const mergeResult = Merger.merge(splitLeft, splitBase, splitRight);
  const collatedMergeResults = Collater.collateMerge(mergeResult, options.joinFunction, options.conflictFunction);

  return collatedMergeResults;
}
