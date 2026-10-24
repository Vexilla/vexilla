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
import { isWellFormedUnicode } from "@vexilla/types";
import { VexillaError } from "./errors";

export function hashFnv32a(str: string): number {
  if (!isWellFormedUnicode(str)) {
    throw new VexillaError("instance", "Instance ID must contain Unicode scalar values");
  }
  let hval = FNV32_OFFSET_BASIS;
  for (const byte of new TextEncoder().encode(str)) {
    hval = Math.imul(hval ^ byte, 16777619);
  }
  return hval >>> 0;
}

export function hashString(value: string, seed: number): number {
  return ((hashFnv32a(value) * seed) % 1000) / 1000;
}
