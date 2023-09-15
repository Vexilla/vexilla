import assert from "assert";

export function labelledAssert(value: boolean, message: string) {
  console.log("Asserting:", message);
  console.log("Value:", value);

  assert(value, message);
}
