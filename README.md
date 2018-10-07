# three-way-merge

A javascript library for performing three-way diffs and merges on text. Based closely on [dyph](https://github.com/GoBoundless/dyph) in ruby. An implementation of Paul Heckel's two-way diff algorithm.

This library works similar to `git merge`: imagine you have a text document, and you share it with a friend, then make some changes. Your friend also makes some changes, now you need to resolve the differences and merge the two changed documents together. If you just compare your changed document to your friend's changed document, it will be impossible to tell whether each of you made additions or deletions. But if you compare both changed documents to your original document, you can compute a diff for each and combine the diffs together.

## Installation

```
npm install --save three-way-merge
```

## Usage

```javascript
import merge from 'three-way-merge';

const base =     [1, 2, 3, 4, 5, 6].join("\n");
const left =     [   2, 3, 4, 5, 6].join("\n");
const right =    [1, 2, 3, 4, 9, 6].join("\n");

const merged = merge(left, base, right);

console.log(merged.conflict);      => false
console.log(merged.joinedResults()) => (merged string)
```

## License (The MIT License)

Copyright 2017 Movable, Inc
Portions Copyright 2016 Boundless

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the “Software”), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
