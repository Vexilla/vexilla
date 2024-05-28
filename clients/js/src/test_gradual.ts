import assert from "assert";
import { hashString } from "./hasher";

const uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";

const workingSeed: number = 0.32;
const nonWorkingSeed: number = 0.22;

console.log("WORKING SEED", hashString(uuid, workingSeed));
assert.ok(hashString(uuid, workingSeed) <= 0.4);

console.log("NON WORKING SEED", hashString(uuid, nonWorkingSeed));
assert.ok(hashString(uuid, nonWorkingSeed) > 0.4);

console.log("NUMBER", hashString(`42`, 0.11));
assert.ok(hashString(`42`, 0.11) > 0.4);

// │ WORKING SEED 0.19072000002861023
// │ NON WORKING SEED 0.9436200000047684
// │ NUMBER 0.8512100000083447
