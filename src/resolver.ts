import { Outcome, Resolved, Conflicted } from './outcomes';

export default function(leftLabel: string,
                        baseLabel: string,
                        rightLabel: string,
                        joinFunction: Function) {
  return function resolveConflicts(results: Outcome[]) {
    return results.map((result: Outcome) => {
      if (result.isResolved()) {
        const joined = <Resolved>result.apply(joinFunction)
        return joined.result;
      } else {
        const joined = <Conflicted>result.apply(joinFunction);
        const { left, right } = joined;

        return [leftLabel,
                left,
                baseLabel,
                right,
                rightLabel].join('\n');
      }
    }).join("\n");
  }
}
