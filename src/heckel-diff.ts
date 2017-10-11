export default class HeckelDiff {
  static executeDiff(oldTextArray, newTextArray) {
    if (!oldTextArray.push) {
      throw(new Error('Argument is not an array'));
    }

    const diffResult = HeckelDiff.diff(oldTextArray, newTextArray);

    return new HeckelDiffWrapper(oldTextArray, newTextArray, diffResult).convertToTypedOutput();
  }

  static diff(left, right) {
    const differ = new HeckelDiff(left, right);
    return differ.performDiff();
  }

  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  performDiff() {
    let uniquePositions = this.identifyUniquePositions();
    uniquePositions.sort(function(a, b) {
      if (a[0] > b[0]) {
        return 1;
      } else {
        return -1;
      }
    });
    const [leftChangePos, rightChangePos] = this.findNextChange();
    let initChanges = new ChangeData(leftChangePos, rightChangePos, []);
    uniquePositions.forEach((pos) => {
      initChanges = this.getDifferences(initChanges, pos);
    });

    return initChanges.changeRanges;
  }

  getDifferences(changeData, uniquePositions) {
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

  findPrevChange(leftLo, rightLo, leftHi, rightHi) {
    if (leftLo > leftHi || rightLo > rightHi) {
      return [leftLo, leftHi, rightLo, rightHi];
    } else {
      const lArr = this.left.slice(leftLo, leftHi + 1).reverse() || [];
      const rArr = this.right.slice(rightLo, rightHi + 1).reverse() || [];

      const offset = this.mismatchOffset(lArr, rArr);
      return [leftLo, leftHi - offset, rightLo, rightHi - offset];
    }
  }

  mismatchOffset(lArr, rArr) {
    const max = Math.max(lArr.length, rArr.length);
    for (let i = 0; i < max; i++) {
      if (lArr[i] !== rArr[i]) {
        return i;
      }
    }

    return Math.min(lArr.length, rArr.length);
  }

  identifyUniquePositions() {
    const leftUniques = this.findUnique(this.left);
    const rightUniques = this.findUnique(this.right);
    const leftKeys = Object.keys(leftUniques);
    const rightKeys = Object.keys(rightUniques);
    const sharedKeys = leftKeys.filter((k) => rightKeys.indexOf(k) >= 0);
    let uniqRanges = sharedKeys.map((k) => [leftUniques[k], rightUniques[k]]);
    uniqRanges.unshift([this.left.length, this.right.length]);
    return uniqRanges;
  }

  findUnique(array) {
    let flaggedUniques = {};

    array.forEach((item, pos) => {
      flaggedUniques[item] = { pos, unique: !flaggedUniques[item] };
    });

    let uniques = {};
    Object.keys(flaggedUniques).filter((key) => {
      return flaggedUniques[key].unique;
    }).map((key) => {
      uniques[key] = flaggedUniques[key].pos;
    });

    return uniques;
  }

  // given the calculated bounds of the 2 way diff, create the proper
  // change type and add it to the queue.
  appendChangeRange(changesRanges, leftLo, leftHi, rightLo, rightHi) {
    if (leftLo <= leftHi && rightLo <= rightHi) {
      // for this change, the bounds are both 'normal'. the beginning
      // of the change is before the end.
      changesRanges.push(['change',
                          leftLo + 1, leftHi + 1,
                          rightLo + 1, rightHi + 1]);
    } else if (leftLo <= leftHi) {
      changesRanges.push(['delete',
                          leftLo + 1, leftHi + 1,
                          rightLo + 1, rightLo]);
    } else if (rightLo <= rightHi) {
      changesRanges.push(['add',
                          leftLo + 1, leftLo,
                          rightLo + 1, rightHi + 1]);
    }

    return changesRanges;
  }
}

class TextNode {
  constructor(text, low) {
    this.text = text;
    this.low = low;
  }
}

class TwoWayChunk {
  constructor(rawChunk) {
    this.action = rawChunk[0];
    this.leftLo = rawChunk[1];
    this.leftHi = rawChunk[2];
    this.rightLo = rawChunk[3];
    this.rightHi = rawChunk[4];
  }
}

class HeckelDiffWrapper {
  constructor(oldTextArray, newTextArray, heckelDiff) {
    this.chunks = heckelDiff.map((block) => new TwoWayChunk(block));
    this.oldTextArray = oldTextArray;
    this.newTextArray = newTextArray;
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

  setTextNodeIndexes(chunk, oldIndex, newIndex) {
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

  appendChanges(chunk, oldIndex, newIndex) {
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

  setTheRemainingTextNodeIndexes(oldIndex, newIndex) {
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
  constructor(oldIndex, newIndex) {
    this.oldIndex = oldIndex;
    this.newIndex = newIndex;
  }
}

class ChangeData {
  constructor(leftChangePos, rightChangePos, changeRanges) {
    this.leftChangePos = leftChangePos;
    this.rightChangePos = rightChangePos;
    this.changeRanges = changeRanges;
  }
}
