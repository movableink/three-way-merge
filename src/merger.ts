import { Resolved, Conflicted } from './outcomes';
import Diff3 from './diff3';
import Diff2 from './heckel-diff';

export default class Merger {
  static merge(left, base, right) {
    const merger = new Merger(left, base, right);
    merger.executeThreeWayMerge();

    return merger.result;
  }

  constructor(left, base, right) {
    this.result = [];
    this.text3 = new Text3(left, right, base);
  }

  executeThreeWayMerge() {
    const d3 = Diff3.executeDiff(this.text3.left, this.text3.base, this.text3.right);
    const chunkDescs = d3.map((desc) => new ChunkDesc(desc));
    let index = 1;

    chunkDescs.forEach((chunkDesc) => {
      let initialText = [];

      for(let lineno = index; lineno < chunkDesc.baseLo; lineno++) {
        initialText.push(this.text3.base[lineno - 1]);
      }

      if (initialText.length) {
        this.result.push(new Resolved(initialText));
      }

      this.interpretChunk(chunkDesc);
      index = chunkDesc.baseHi + 1;
    });


    const endingText = this.accumulateLines(index,
                                            this.text3.base.length,
                                            this.text3.base);
    if (endingText.length) {
      this.result.push(new Resolved(endingText));
    }
  }

  setConflict(chunkDesc) {
    const conflict = new Conflicted({
      left: this.accumulateLines(chunkDesc.leftLo,
                                 chunkDesc.leftHi,
                                 this.text3.left),
      base: this.accumulateLines(chunkDesc.baseLo,
                                 chunkDesc.baseHi,
                                 this.text3.base),
      right: this.accumulateLines(chunkDesc.rightLo,
                                  chunkDesc.rightHi,
                                  this.text3.right)
    });
    this.result.push(conflict);
  }

  determineConflict(d, left, right) {
    let ia = 1;
    d.forEach((rawChunkDesc) => {
      const chunkDesc = new ChunkDesc(rawChunkDesc);
      for(let lineno = ia; lineno < chunkDesc; lineno++) {
        this.result.push(new Resolved(this.accumulateLines(ia, lineno, right)));
      }

      const outcome = this.determineOutcome(chunkDesc, left, right);
      ia = chunkDesc.rightHi + 1;
      if (outcome) {
        this.result.push(outcome);
      }
    });

    let finalText = this.accumulateLines(ia, right.length + 1, right);
    if (finalText.length) {
      this.result.push(new Resolved(finalText));
    }
  }

  determineOutcome(chunkDesc, left, right) {
    if (chunkDesc.action === 'change') {
      return new Conflicted({
        left: this.accumulateLines(chunkDesc.rightLo, chunkDesc.rightHi, left),
        right: this.accumulateLines(chunkDesc.leftLo, chunkDesc.leftHi, right),
        base: []
      });
    } else if (chunkDesc.action === 'add') {
      return new Resolved(this.accumulateLines(chunkDesc.rightLo,
                                               chunkDesc.rightHi,
                                               left));
    }
  }

  setText(origText, lo, hi) {
    let text = [];
    for(let i = lo; i <= hi; i++) {
      text.push(origText[i - 1]);
    }

    return text;
  }

  _conflictRange(chunkDesc) {
    const right = this.setText(this.text3.right,
                               chunkDesc.rightLo,
                               chunkDesc.rightHi);
    const left = this.setText(this.text3.left,
                              chunkDesc.leftLo,
                              chunkDesc.leftHi);
    const d = Diff2.diff(right, left);
    if ((this._assocRange(d, 'change') || this._assocRange(d, 'delete')) &&
        chunkDesc.baseLo <= chunkDesc.baseHi) {
      this.setConflict(chunkDesc);
    } else {
      this.determineConflict(d, left, right);
    }
  }

  interpretChunk(chunkDesc) {
    if (chunkDesc.action == 'choose_left') {
      const tempText = this.accumulateLines(chunkDesc.leftLo, chunkDesc.leftHi, this.text3.left);
      if (tempText.length) {
        this.result.push(new Resolved(tempText));
      }
    } else if (chunkDesc.action !== 'possible_conflict') {
      const tempText = this.accumulateLines(chunkDesc.rightLo, chunkDesc.rightHi, this.text3.right);
      if (tempText.length) {
        this.result.push(new Resolved(tempText));
      }
    } else {
      this._conflictRange(chunkDesc);
    }
  }

  _assocRange(diff, diffType) {
    for(let i = 0; i < diff.length; i++) {
      let d = diff[i];
      if (d[0] === diffType) {
        return d;
      }
    }

    return null;
  }

  accumulateLines(lo, hi, text) {
    let lines = [];
    for(let lineno = lo; lineno <= hi; lineno++) {
      if (text[lineno-1]) {
        lines.push(text[lineno-1]);
      }
    }
    return lines;
  }
}

class Text3 {
  constructor(left, right, base) {
    this.left = left;
    this.right = right;
    this.base = base;
  }
}

class ChunkDesc {
  constructor(rawChunk) {
    this.action  = rawChunk[0];
    this.leftLo  = rawChunk[1];
    this.leftHi  = rawChunk[2];
    this.rightLo = rawChunk[3];
    this.rightHi = rawChunk[4];
    this.baseLo  = rawChunk[5];
    this.baseHi  = rawChunk[6];
  }
}
