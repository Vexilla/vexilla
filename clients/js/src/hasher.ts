/*
This code is forked from GrowthBook's hashing algorithm in their JS sdk:
https://github.com/growthbook/growthbook/blob/main/packages/sdk-js/src/util.ts

It is modified to handle how we use a floating point number between 0 and 1 for our seeding instead of string based seeding found in the GrowthBook functionality.

----------------------------------------------------------------

Copyright (c) 2023 GrowthBook, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const FNV32_OFFSET_BASIS = 2166136261;

export function hashFnv32a(str: string): number {
  let hval = FNV32_OFFSET_BASIS;
  const l = str.length;

  for (let i = 0; i < l; i++) {
    hval ^= str.charCodeAt(i);
    hval +=
      (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  return hval >>> 0;
}

export function hashString(value: string, seed: number): number {
  return ((hashFnv32a(value) * seed) % 1000) / 1000;
}
