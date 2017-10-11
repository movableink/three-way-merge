class Outcome {
  isResolved() {
    return !this.hasConflicts;
  }

  isConflicted() {
    return this.hasConflicts;
  }
}

class Conflicted extends Outcome {
  constructor(opts) {
    super();

    this.hasConflicts = true;
    this.left = opts.left;
    this.base = opts.base;
    this.right = opts.right;
  }

  apply(fun) {
    return new Conflicted({
      left: fun(this.left),
      base: fun(this.base),
      right: fun(this.right)
    });
  }
}

class Resolved extends Outcome {
  constructor(result) {
    super();

    this.hasConflicts = false;
    this.result = result;
    this.combiner = (x, y) => x.concat(y);
  }

  setCombiner(fun) {
    this.combiner = fun;
  }

  combine(other) {
    this.result = this.combiner(this.result, other.result);
  }

  apply(fun) {
    return new Resolved(fun(this.result));
  }
}

export { Resolved, Conflicted }
