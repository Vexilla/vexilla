import assert from "assert";
import { hashString } from "./hasher";

let uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";

let workingSeed: number = 0.11;
let nonWorkingSeed: number = 0.22;

console.log("WORKING SEED", hashString(uuid, workingSeed));
assert.ok(hashString(uuid, workingSeed) <= 0.4);

console.log("NON WORKING SEED", hashString(uuid, nonWorkingSeed));
assert.ok(hashString(uuid, workingSeed) > 0.4);
