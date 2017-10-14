import { Outcome, Resolved } from './outcomes';

type MergeResultOptions = {
  conflictHandler?: Function,
  conflict?: boolean
}

export default class MergeResult {
  conflict: boolean;
  conflictHandler: Function | undefined;

  constructor(public results: Outcome[],
              public joinFunction: Function,
              options=<MergeResultOptions>{}) {
    this.conflictHandler = options.conflictHandler;
    this.conflict = options.conflict || false;
  }

  isSuccess() {
    return !this.conflict;
  }

  isConflict() {
    return !!this.conflict;
  }

  joinedResults() {
    if (this.isConflict()) {
      if (this.conflictHandler) {
        return this.conflictHandler(this.results);
      } else {
        return this.results;
      }
    } else {
      const [first, rest] = [this.results[0], this.results.slice(1)];
      let rs = <Resolved>first;
      rest.forEach((r) => rs.combine(<Resolved>r));

      return rs.apply(this.joinFunction).result;
    }
  }
}
