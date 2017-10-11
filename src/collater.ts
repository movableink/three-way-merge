import { Resolved, Conflicted } from './outcomes';
import MergeResult from './merge-result';

export default class Collater {
  static collateMerge(mergeResult, joinFunction, conflictHandler) {
    if (!mergeResult.length) {
      return new MergeResult([new Resolved([])], joinFunction);
    } else {
      mergeResult = Collater.combineNonConflicts(mergeResult);
      if (mergeResult.length === 1 && mergeResult[0].isResolved()) {
        return new MergeResult(mergeResult, joinFunction);
      } else {
        return new MergeResult(mergeResult, joinFunction, {
          conflict: true, conflictHandler: conflictHandler
        });
      }
    }
  }

  static combineNonConflicts(results) {
    let rs = [];

    results.forEach((r) => {
      if (rs.length && rs[rs.length - 1].isResolved() && r.isResolved()) {
        rs[rs.length - 1].combine(r);
      } else {
        rs.push(r);
      }
    });

    return rs;
  }
}
