import assert from "assert";

export function labelledAssert(value: boolean, message: string) {
  if (!value) {
    console.log("Asserting:", message);
    console.log("Value:", value);
  }

  assert(value, message);
}
