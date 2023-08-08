export default class HeckelDiff {
  static executeDiff(oldTextArray: string[], newTextArray: string[]) {
    if (!oldTextArray.push) {
      throw(new Error('Argument is not an array'));
    }

    const diffResult = HeckelDiff.diff(oldTextArray, newTextArray);

    return new HeckelDiffWrapper(oldTextArray, newTextArray, diffResult).convertToTypedOutput();
  }

  static diff(left: string[], right: string[]) {
    const differ = new HeckelDiff(left, right);
    return differ.performDiff();
  }

  constructor(public left: string[], public right: string[]) {}

  performDiff() {
    let uniquePositions = this.identifyUniquePositions();
    uniquePositions.sort((a, b) => b[0] - a[0]);

    const [leftChangePos, rightChangePos] = this.findNextChange();
    let initChanges = new ChangeData(leftChangePos, rightChangePos, []);
    uniquePositions.forEach((pos) => {
      initChanges = this.getDifferences(initChanges, pos);
    });

    return initChanges.changeRanges;
  }

  getDifferences(changeData: ChangeData, uniquePositions: UniquePositions) {
    const [leftPos, rightPos] = [changeData.leftChangePos,
                                 changeData.rightChangePos];
    const [leftUniqPos, rightUniqPos] = uniquePositions;

    if (leftUniqPos < leftPos || rightUniqPos < rightPos) {
      return changeData;
    } else {
      const [leftLo, leftHi,
             rightLo, rightHi] = this.findPrevChange(leftPos,
                                                     rightPos,
                                                     leftUniqPos-1,
                                                     rightUniqPos-1);
      const [nextLeftPos,
             nextRightPos] = this.findNextChange(leftUniqPos+1,
                                                 rightUniqPos+1);
      const updatedRanges = this.appendChangeRange(changeData.changeRanges,
                                                   leftLo, leftHi,
                                                   rightLo, rightHi);
      return new ChangeData(nextLeftPos, nextRightPos, updatedRanges);
    }
  }

  findNextChange(leftStartPos=0, rightStartPos=0) {
    const lArr = this.left.slice(leftStartPos) || [];
    const rArr = this.right.slice(rightStartPos) || [];
    const offset = this.mismatchOffset(lArr, rArr);

    return [leftStartPos + offset, rightStartPos + offset];
  }

  findPrevChange(leftLo: number, rightLo: number,
                 leftHi: number, rightHi: number) {
    if (leftLo > leftHi || rightLo > rightHi) {
      return [leftLo, leftHi, rightLo, rightHi];
    } else {
      const lArr = this.left.slice(leftLo, leftHi + 1).reverse() || [];
      const rArr = this.right.slice(rightLo, rightHi + 1).reverse() || [];

      const offset = this.mismatchOffset(lArr, rArr);
      return [leftLo, leftHi - offset, rightLo, rightHi - offset];
    }
  }

  mismatchOffset(lArr: string[], rArr: string[]) {
    const max = Math.max(lArr.length, rArr.length);
    for (let i = 0; i < max; i++) {
      if (lArr[i] !== rArr[i]) {
        return i;
      }
    }

    return Math.min(lArr.length, rArr.length);
  }

  identifyUniquePositions() : Array<UniquePositions> {
    const leftUniques = this.findUnique(this.left);
    const rightUniques = this.findUnique(this.right);
    const leftKeys = new Set(leftUniques.keys());
    const rightKeys = new Set(rightUniques.keys());
    const sharedKeys = new Set([...leftKeys].filter(k => rightKeys.has(k)));

    const uniqRanges = [...sharedKeys].map((k) => {
      return <UniquePositions>[leftUniques.get(k),
                               rightUniques.get(k)];
    });
    uniqRanges.unshift([this.left.length, this.right.length]);
    return uniqRanges;
  }

  findUnique(array: string[]) {
    const flaggedUniques: Map<string, UniqueItem> = new Map<string, UniqueItem>();

    array.forEach((item, pos) => {
      flaggedUniques.set(item, new UniqueItem(pos, !flaggedUniques.has(item)));
    });

    const uniques : Map<string, number> = new Map<string, number>();
    for(let [key, value] of flaggedUniques.entries()) {
      if (value.unique) {
        uniques.set(key, value.pos);
      }
    }

    return uniques;
  }

  // given the calculated bounds of the 2 way diff, create the proper
  // change type and add it to the queue.
  appendChangeRange(changesRanges: ChangeRange[],
                    leftLo: number,
                    leftHi: number,
                    rightLo: number,
                    rightHi: number) {
    if (leftLo <= leftHi && rightLo <= rightHi) {
      // for this change, the bounds are both 'normal'. the beginning
      // of the change is before the end.
      changesRanges.push(new ChangeRange(Action.change,
                                         leftLo + 1, leftHi + 1,
                                         rightLo + 1, rightHi + 1));
    } else if (leftLo <= leftHi) {
      changesRanges.push(new ChangeRange(Action.remove,
                                         leftLo + 1, leftHi + 1,
                                         rightLo + 1, rightLo));
    } else if (rightLo <= rightHi) {
      changesRanges.push(new ChangeRange(Action.add,
                                         leftLo + 1, leftLo,
                                         rightLo + 1, rightHi + 1));
    }

    return changesRanges;
  }
}

export type UniquePositions = [number, number];

class UniqueItem {
  constructor(public pos: number, public unique: boolean) {}
}

export class TextNode {
  constructor(public text: string, public low: number) {}
}

class HeckelDiffWrapper {
  oldText: Array<TextNode|string>;
  newText: Array<TextNode|string>;

  constructor(public oldTextArray: string[],
              public newTextArray: string[],
              public chunks: ChangeRange[]) {
    this.oldText = [];
    this.newText = [];
  }

  convertToTypedOutput() {
    let finalIndexes = new IndexTracker(0, 0);
    this.chunks.forEach((chunk) => {
      const [oldIteration, newIteration] = this.setTextNodeIndexes(chunk, finalIndexes.oldIndex, finalIndexes.newIndex);
      const [oldIndex, newIndex] = this.appendChanges(chunk, finalIndexes.oldIndex + oldIteration, finalIndexes.newIndex + newIteration);
      finalIndexes.oldIndex = oldIndex;
      finalIndexes.newIndex = newIndex;
    });

    this.setTheRemainingTextNodeIndexes(finalIndexes.oldIndex,
                                        finalIndexes.newIndex);

    return {
      oldText: this.oldText,
      newText: this.newText
    };
  }

  setTextNodeIndexes(chunk: ChangeRange, oldIndex: number, newIndex: number) {
    let oldIteration = 0;
    while (oldIndex + oldIteration < chunk.leftLo - 1) { // chunk indexes from 1
      this.oldText.push(new TextNode(this.oldTextArray[oldIndex + oldIteration],
                                     newIndex + oldIteration));
      oldIteration += 1;
    }

    let newIteration = 0;
    while (newIndex + newIteration < chunk.rightLo - 1) {
      this.newText.push(new TextNode(this.newTextArray[newIndex + newIteration],
                                     oldIndex + newIteration));
      newIteration += 1;
    }

    return [oldIteration, newIteration];
  }

  appendChanges(chunk: ChangeRange, oldIndex: number, newIndex: number) {
    while (oldIndex <= chunk.leftHi - 1) {
      this.oldText.push(this.oldTextArray[oldIndex]);
      oldIndex += 1;
    }

    while (newIndex <= chunk.rightHi - 1) {
      this.newText.push(this.newTextArray[newIndex]);
      newIndex += 1;
    }
    return [oldIndex, newIndex];
  }

  setTheRemainingTextNodeIndexes(oldIndex: number, newIndex: number) {
    let iteration = 0;
    while (oldIndex + iteration < this.oldTextArray.length) {
      this.oldText.push(new TextNode(this.oldTextArray[oldIndex + iteration],
                                     newIndex + iteration));
      iteration += 1;
    }

    while (newIndex + iteration < this.newTextArray.length) {
      this.newText.push(new TextNode(this.newTextArray[newIndex + iteration],
                                     oldIndex + iteration));
      iteration += 1;
    }
  }
}

class IndexTracker {
  constructor(public oldIndex: number, public newIndex: number) {
  }
}

export enum Action {
  change = "change",
  add = "add",
  remove = "remove"
}

export class ChangeRange {
  constructor(public action: Action,
              public leftLo: number, public leftHi: number,
              public rightLo: number, public rightHi: number) {}
}

export class ChangeData {
  constructor(public leftChangePos: number,
              public rightChangePos: number,
              public changeRanges: ChangeRange[]) {
  }
}
