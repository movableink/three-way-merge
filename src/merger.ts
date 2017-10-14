import { Resolved, Conflicted, Outcome } from './outcomes';
import Diff3, { Difference, ChangeType } from './diff3';
import Diff2, { ChangeRange, Action } from './heckel-diff';

export default class Merger {
  static merge(left: string[], base: string[], right: string[]) {
    const merger = new Merger(left, base, right);
    merger.executeThreeWayMerge();

    return merger.result;
  }

  result: Outcome[];
  text3: Text3;

  constructor(left: string[], base: string[], right: string[]) {
    this.result = [];
    this.text3 = new Text3(left, right, base);
  }

  executeThreeWayMerge() {
    const differences = Diff3.executeDiff(this.text3.left,
                                          this.text3.base,
                                          this.text3.right);
    let index = 1;

    differences.forEach((difference) => {
      let initialText = [];

      for(let lineno = index; lineno < difference.baseLo; lineno++) {
        initialText.push(this.text3.base[lineno - 1]);
      }

      if (initialText.length) {
        this.result.push(new Resolved(initialText));
      }

      this.interpretChunk(difference);
      index = difference.baseHi + 1;
    });


    const endingText = this.accumulateLines(index,
                                            this.text3.base.length,
                                            this.text3.base);
    if (endingText.length) {
      this.result.push(new Resolved(endingText));
    }
  }

  setConflict(difference: Difference) {
    const conflict = Conflicted.create({
      left: this.accumulateLines(difference.leftLo,
                                 difference.leftHi,
                                 this.text3.left),
      base: this.accumulateLines(difference.baseLo,
                                 difference.baseHi,
                                 this.text3.base),
      right: this.accumulateLines(difference.rightLo,
                                  difference.rightHi,
                                  this.text3.right)
    });
    this.result.push(conflict);
  }

  determineConflict(d: ChangeRange[], left: string[], right: string[]) {
    let ia = 1;
    d.forEach((changeRange) => {
      for(let lineno = ia; lineno <= changeRange.leftLo; lineno++) {
        this.result.push(new Resolved(this.accumulateLines(ia, lineno, right)));
      }

      const outcome = this.determineOutcome(changeRange, left, right);
      ia = changeRange.rightHi + 1;
      if (outcome) {
        this.result.push(outcome);
      }
    });

    let finalText = this.accumulateLines(ia, right.length + 1, right);
    if (finalText.length) {
      this.result.push(new Resolved(finalText));
    }
  }

  determineOutcome(changeRange: ChangeRange, left: string[], right: string[]) : Outcome | null {
    if (changeRange.action === Action.change) {
      return Conflicted.create({
        left: this.accumulateLines(changeRange.rightLo, changeRange.rightHi, left),
        right: this.accumulateLines(changeRange.leftLo, changeRange.leftHi, right),
        base: []
      });
    } else if (changeRange.action === Action.add) {
      return new Resolved(this.accumulateLines(changeRange.rightLo,
                                               changeRange.rightHi,
                                               left));
    } else {
      return null;
    }
  }

  setText(origText: string[], lo: number, hi: number) {
    let text = [];
    for(let i = lo; i <= hi; i++) {
      text.push(origText[i - 1]);
    }

    return text;
  }

  _conflictRange(difference: Difference) {
    const right = this.setText(this.text3.right,
                               difference.rightLo,
                               difference.rightHi);
    const left = this.setText(this.text3.left,
                              difference.leftLo,
                              difference.leftHi);
    const d = Diff2.diff(right, left);
    if ((this._assocRange(d, Action.change) || this._assocRange(d, Action.remove)) &&
        difference.baseLo <= difference.baseHi) {
      this.setConflict(difference);
    } else {
      this.determineConflict(d, left, right);
    }
  }

  interpretChunk(difference: Difference) {
    if (difference.changeType == ChangeType.chooseLeft) {
      const tempText = this.accumulateLines(difference.leftLo,
                                            difference.leftHi,
                                            this.text3.left);
      if (tempText.length) {
        this.result.push(new Resolved(tempText));
      }
    } else if (difference.changeType !== ChangeType.possibleConflict) {
      const tempText = this.accumulateLines(difference.rightLo,
                                            difference.rightHi,
                                            this.text3.right);
      if (tempText.length) {
        this.result.push(new Resolved(tempText));
      }
    } else {
      this._conflictRange(difference);
    }
  }

  _assocRange(diff: ChangeRange[], action: Action) {
    for(let i = 0; i < diff.length; i++) {
      let d = diff[i];
      if (d.action === action) {
        return d;
      }
    }

    return null;
  }

  accumulateLines(lo: number, hi: number, text: string[]) {
    let lines = [];
    for(let lineno = lo; lineno <= hi; lineno++) {
      if (text[lineno-1]) {
        lines.push(text[lineno-1]);
      }
    }
    return lines;
  }
}

export class Text3 {
  constructor(public left: string[],
              public right: string[],
              public base: string[]) {
  }
}
