export default class MergeResult {
  constructor(results, joinFunction, options={}) {
    this.results = results;
    this.joinFunction = joinFunction;
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
      let rs = first;
      rest.forEach((r) => rs.combine(r));

      return rs.apply(this.joinFunction).result;
    }
  }
}
