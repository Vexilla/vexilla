import { v4 as uuidv4 } from "uuid";

import { hashString } from "./hasher";
const xxHash = require("xxhashjs");

let getRandomBytes = (
  typeof self !== "undefined" &&
    (self as any) &&
    (self.crypto || self["msCrypto"])
    ? function () {
        // Browsers
        var crypto = self.crypto || self["msCrypto"],
          QUOTA = 65536;
        return function (n) {
          var a = new Uint8Array(n);
          for (var i = 0; i < n; i += QUOTA) {
            crypto.getRandomValues(a.subarray(i, i + Math.min(n - i, QUOTA)));
          }
          return a;
        };
      }
    : function () {
        // Node
        return require("crypto").randomBytes;
      }
)();

const ranges = [
  {
    min: 0,
    max: 20,
    value: 0,
  },

  {
    min: 20,
    max: 40,
    value: 0,
  },

  {
    min: 40,
    max: 60,
    value: 0,
  },

  {
    min: 60,
    max: 80,
    value: 0,
  },

  {
    min: 80,
    max: 100,
    value: 0,
  },
];

const iterationCount = 100000;

for (let i = 0; i < iterationCount; i++) {
  const randomSeed = getRandomBytes(16);

  // console.log({ randomSeed });
  // const id = uuidv4({
  //   random: randomSeed,
  // });

  const hash = hashString(xxHash.h32(i + "", 0.43).toString(16), randomSeed);

  ranges.map((range) => {
    if (hash >= range.min && hash < range.max) {
      range.value += 1;
    }
  });
}

ranges.map((range) => {
  let bar = "";
  const percentage = Math.floor((range.value / iterationCount) * 100);
  for (let i = 0; i < percentage; i++) {
    bar += "▇";
  }

  console.log(`Range ${range.min}-${range.max} ${bar} ${range.value}`);
});

// function reset() {

// }
