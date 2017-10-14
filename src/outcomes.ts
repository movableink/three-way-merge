export abstract class Outcome {
  hasConflicts: boolean;

  isResolved() {
    return !this.hasConflicts;
  }

  isConflicted() {
    return this.hasConflicts;
  }

  abstract apply(fun: Function): Outcome
}

export type ConflictedOpts = {
  left: string[],
  right: string[],
  base: string[]
}

export class Conflicted extends Outcome {
  // Special constructor because left/base/right positional params
  // are confusing
  static create(opts: ConflictedOpts) {
    return new Conflicted(opts.left, opts.base, opts.right);
  }

  constructor(public left: string[],
              public base: string[],
              public right: string[]) {
    super();

    this.hasConflicts = true;
  }

  apply(fun: Function) {
    return Conflicted.create({
      left: fun(this.left),
      base: fun(this.base),
      right: fun(this.right)
    });
  }
}

export class Resolved extends Outcome {
  combiner: Function;
  result: string[];

  constructor(result: string[]) {
    super();

    this.hasConflicts = false;
    this.result = result;
  }

  combine(other: Resolved) {
    this.result = this.result.concat(other.result);
  }

  apply(fun: Function) {
    return new Resolved(fun(this.result));
  }
}
