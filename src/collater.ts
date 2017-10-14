import { Resolved, Outcome } from './outcomes';
import MergeResult from './merge-result';

export type JoinFunction = (a: string[]) => string;
export type ConflictFunction = (a: Outcome[]) => any;

export default class Collater {
  static collateMerge(mergeResult: Outcome[],
                      joinFunction: JoinFunction,
                      conflictHandler: ConflictFunction) {
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

  static combineNonConflicts(results: Outcome[]) {
    let rs = <Outcome[]>[];

    results.forEach((r) => {
      if (rs.length && rs[rs.length - 1].isResolved() && r.isResolved()) {
        const last = <Resolved>rs[rs.length - 1];
        last.combine(<Resolved>r);
      } else {
        rs.push(r);
      }
    });

    return rs;
  }
}
