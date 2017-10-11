import Diff2 from './heckel-diff';

class Diff2Command {
  constructor(r) {
    this.code = r[0];
    this.baseLo = r[1];
    this.baseHi = r[2];
    this.sideLo = r[3];
    this.sideHi = r[4];
  }
}

export default class Diff3 {
  static executeDiff(left, base, right) {
    return new Diff3(left, base, right).getDifferences();
  }

  constructor(left, base, right) {
    this.left = left;
    this.base = base;
    this.right = right;
  }

  getDifferences() {
    const leftDiff = Diff2.diff(this.base, this.left).map((r) => new Diff2Command(r));
    const rightDiff = Diff2.diff(this.base, this.right).map((r) => new Diff2Command(r));
    return this.collapseDifferences(new DiffDoubleQueue(leftDiff, rightDiff));
  }

  collapseDifferences(diffsQueue, differences=[]) {
    if (diffsQueue.isFinished()) {
      return differences;
    } else {
      const resultQueue = new DiffDoubleQueue();
      const initSide = diffsQueue.chooseSide();
      const topDiff = diffsQueue.dequeue();

      resultQueue.enqueue(initSide, topDiff);

      diffsQueue.switchSides();
      this.buildResultQueue(diffsQueue, topDiff.baseHi, resultQueue);

      differences.push(this.determineDifference(resultQueue,
                                                initSide,
                                                diffsQueue.switchSides()));

      return this.collapseDifferences(diffsQueue, differences);
    }
  }

  buildResultQueue(diffsQueue, prevBaseHi, resultQueue) {
    if (this.queueIsFinished(diffsQueue.peek(), prevBaseHi)) {
      return resultQueue;
    } else {
      const topDiff = diffsQueue.dequeue();
      resultQueue.enqueue(diffsQueue.currentSide, topDiff);

      if (prevBaseHi < topDiff.baseHi) {
        diffsQueue.switchSides();
        return this.buildResultQueue(diffsQueue, topDiff.baseHi, resultQueue);
      } else {
        return this.buildResultQueue(diffsQueue, prevBaseHi, resultQueue);
      }
    }
  }

  queueIsFinished(queue, prevBaseHi) {
    return queue.length === 0 || queue[0].baseLo > prevBaseHi + 1;
  }

  determineDifference(diffDiffsQueue, initSide, finalSide) {
    const baseLo = diffDiffsQueue.get(initSide)[0].baseLo;
    const finalQueue = diffDiffsQueue.get(finalSide);
    const baseHi = finalQueue[finalQueue.length - 1].baseHi;

    const [leftLo, leftHi] = this.diffableEndpoints(diffDiffsQueue.get('left'), baseLo, baseHi);
    const [rightLo, rightHi] = this.diffableEndpoints(diffDiffsQueue.get('right'), baseLo, baseHi);

    const leftSubset = this.left.slice(leftLo-1, leftHi);
    const rightSubset = this.right.slice(rightLo-1, rightHi);
    const changeType = this.decideAction(diffDiffsQueue, leftSubset, rightSubset);

    return [changeType, leftLo, leftHi, rightLo, rightHi, baseLo, baseHi];
  }

  diffableEndpoints(command, baseLo, baseHi) {
    if (command.length) { //TODO
      const lo = command[0].sideLo - command[0].baseLo + baseLo;
      const hi = command[command.length - 1].sideHi  - command[command.length - 1].baseHi  + baseHi;

      return [lo, hi];
    } else {
      return [baseLo, baseHi];
    }
  }

  decideAction(diffDiffsQueue, leftSubset, rightSubset) {
    if (diffDiffsQueue.isEmpty('left')) {
      return 'choose_right';
    } else if (diffDiffsQueue.isEmpty('right')) {
      return 'choose_left';
    } else {
      if (leftSubset !== rightSubset) {
        return 'possible_conflict';
      } else {
        return 'no_conflict_found';
      }
    }
  }
}

class DiffDoubleQueue {
  constructor(left=[], right=[]) {
    this.diffs = { left: left, right: right };
  }

  dequeue(side=this.currentSide) {
    return this.diffs[side].shift();
  }

  peek(side=this.currentSide) {
    return this.diffs[side];
  }

  isFinished() {
    return this.isEmpty('left') && this.isEmpty('right');
  }

  enqueue(side=this.currentSide, val) {
    return this.diffs[side].push(val);
  }

  get(side=this.currentSide) {
    return this.diffs[side];
  }

  isEmpty(side=this.currentSide) {
    return this.diffs[side].length === 0;
  }

  switchSides(side=this.currentSide) {
    return this.currentSide = (side === 'left') ? 'right' : 'left';
  }

  chooseSide() {
    if (this.isEmpty('left')) {
      this.currentSide = 'right';
    } else if (this.isEmpty('right')) {
      this.currentSide = 'left';
    } else {
      this.currentSide = (this.get('left')[0].baseLo <= this.get('right')[0].baseLo ? 'left' : 'right');
    }

    return this.currentSide;
  }
}
