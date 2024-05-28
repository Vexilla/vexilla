import { v4 as uuidv4 } from "uuid";
import { hashString } from "../src/hasher";

let uuid = "";

while (uuid == "") {
  const _uuid = uuidv4();

  const hashValue = hashString(_uuid, 0.42);

  if (hashValue < 40) {
    uuid = _uuid;
  }
}

console.log("UUID: ", uuid);
