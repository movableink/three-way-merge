import Diff2, { ChangeRange, Action } from './heckel-diff';

export class Diff2Command {
  static fromChangeRange(changeRange: ChangeRange) {
    return new Diff2Command(changeRange.action,
                            changeRange.leftLo,
                            changeRange.leftHi,
                            changeRange.rightLo,
                            changeRange.rightHi);
  }

  constructor(public code: Action,
              public baseLo: number,
              public baseHi: number,
              public sideLo: number,
              public sideHi: number) {}
}

export default class Diff3 {
  static executeDiff(left: string[], base: string[], right: string[]) {
    return new Diff3(left, base, right).getDifferences();
  }

  constructor(public left: string[],
              public base: string[],
              public right: string[]) {}

  getDifferences() {
    const leftDiff = Diff2.diff(this.base, this.left).map((d) => {
      return Diff2Command.fromChangeRange(d)
    });
    const rightDiff = Diff2.diff(this.base, this.right).map((d) => {
      return Diff2Command.fromChangeRange(d);
    });
    return this.collapseDifferences(new DiffDoubleQueue(leftDiff, rightDiff));
  }

  collapseDifferences(diffsQueue: DiffDoubleQueue, differences=<Difference[]>[]) : Difference[] {
    if (diffsQueue.isFinished()) {
      return differences;
    } else {
      const resultQueue = new DiffDoubleQueue();
      const initSide = diffsQueue.chooseSide();
      const topDiff = <Diff2Command>diffsQueue.dequeue();

      resultQueue.enqueue(initSide, topDiff);

      diffsQueue.switchSides();
      this.buildResultQueue(diffsQueue, topDiff.baseHi, resultQueue);

      differences.push(this.determineDifference(resultQueue,
                                                initSide,
                                                diffsQueue.switchSides()));

      return this.collapseDifferences(diffsQueue, differences);
    }
  }

  buildResultQueue(diffsQueue: DiffDoubleQueue,
                   prevBaseHi: number,
                   resultQueue: DiffDoubleQueue) : DiffDoubleQueue {
    if (this.queueIsFinished(diffsQueue.peek(), prevBaseHi)) {
      return resultQueue;
    } else {
      const topDiff = <Diff2Command>diffsQueue.dequeue();
      resultQueue.enqueue(diffsQueue.currentSide, topDiff);

      if (prevBaseHi < topDiff.baseHi) {
        diffsQueue.switchSides();
        return this.buildResultQueue(diffsQueue, topDiff.baseHi, resultQueue);
      } else {
        return this.buildResultQueue(diffsQueue, prevBaseHi, resultQueue);
      }
    }
  }

  queueIsFinished(queue: Diff2Command[], prevBaseHi: number) {
    return queue.length === 0 || queue[0].baseLo > prevBaseHi + 1;
  }

  determineDifference(diffDiffsQueue: DiffDoubleQueue, initSide: Side, finalSide: Side) : Difference {
    const baseLo = diffDiffsQueue.get(initSide)[0].baseLo;
    const finalQueue = diffDiffsQueue.get(finalSide);
    const baseHi = finalQueue[finalQueue.length - 1].baseHi;

    const [leftLo, leftHi] = this.diffableEndpoints(diffDiffsQueue.get(Side.left), baseLo, baseHi);
    const [rightLo, rightHi] = this.diffableEndpoints(diffDiffsQueue.get(Side.right), baseLo, baseHi);

    const leftSubset = this.left.slice(leftLo-1, leftHi);
    const rightSubset = this.right.slice(rightLo-1, rightHi);
    const changeType = this.decideAction(diffDiffsQueue, leftSubset, rightSubset);

    return new Difference(changeType, leftLo, leftHi, rightLo, rightHi, baseLo, baseHi);
  }

  diffableEndpoints(commands: Diff2Command[], baseLo: number, baseHi: number) {
    if (commands.length) { //TODO
      const firstCommand = commands[0];
      const lastCommand = commands[commands.length - 1];
      const lo = firstCommand.sideLo - firstCommand.baseLo + baseLo;
      const hi = lastCommand.sideHi  - lastCommand.baseHi  + baseHi;

      return [lo, hi];
    } else {
      return [baseLo, baseHi];
    }
  }

  decideAction(diffDiffsQueue: DiffDoubleQueue,
               leftSubset: string[],
               rightSubset: string[]) {
    if (diffDiffsQueue.isEmpty(Side.left)) {
      return ChangeType.chooseRight;
    } else if (diffDiffsQueue.isEmpty(Side.right)) {
      return ChangeType.chooseLeft;
    } else {
      // leftSubset deepEquals rightSubset
      if (!leftSubset.every((x, i) => rightSubset[i] === x)) {
        return ChangeType.possibleConflict;
      } else {
        return ChangeType.noConflictFound;
      }
    }
  }
}

export class Difference {
  constructor(public changeType: ChangeType,
              public leftLo: number,
              public leftHi: number,
              public rightLo: number,
              public rightHi: number,
              public baseLo: number,
              public baseHi: number) {}
}

export enum ChangeType {
  chooseRight = 'choose_right',
  chooseLeft = 'choose_left',
  possibleConflict = 'possible_conflict',
  noConflictFound = 'no_conflict_found'
}

export enum Side {
  left = "left",
  right = "right"
}

export class DiffDoubleQueue {
  currentSide: Side;
  diffs: { [index:string] : Diff2Command[] };

  constructor(left=<Diff2Command[]>[], right=<Diff2Command[]>[]) {
    this.diffs = { left: left, right: right };
  }

  dequeue(side=this.currentSide) {
    return this.diffs[side].shift();
  }

  peek(side=this.currentSide) {
    return this.diffs[side];
  }

  isFinished() {
    return this.isEmpty(Side.left) && this.isEmpty(Side.right);
  }

  enqueue(side=this.currentSide, val: Diff2Command) {
    return this.diffs[side].push(val);
  }

  get(side=this.currentSide) {
    return this.diffs[side];
  }

  isEmpty(side=this.currentSide) {
    return this.diffs[side].length === 0;
  }

  switchSides(side=this.currentSide) {
    return this.currentSide = (side === Side.left) ? Side.right : Side.left;
  }

  chooseSide() {
    if (this.isEmpty(Side.left)) {
      this.currentSide = Side.right;
    } else if (this.isEmpty(Side.right)) {
      this.currentSide = Side.left;
    } else {
      this.currentSide = (this.get(Side.left)[0].baseLo <= this.get(Side.right)[0].baseLo ? Side.left : Side.right);
    }

    return this.currentSide;
  }
}
