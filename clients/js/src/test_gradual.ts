import Hasher from "./hasher";

let uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";

let workingSeed: number = 0.11;
let nonWorkingSeed: number = 0.22;

console.log("Working Hash:", new Hasher(workingSeed).hashString(uuid));
console.log("WORKING SEED", new Hasher(workingSeed).hashString(uuid) <= 40);

console.log(
  "NON WORKING SEED",
  new Hasher(nonWorkingSeed).hashString(uuid) > 40
);
