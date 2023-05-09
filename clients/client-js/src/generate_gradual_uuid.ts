import { v4 as uuidv4 } from "uuid";
import Hasher from "./hasher";

let uuid = "";

const hasher = new Hasher(0.42);

while (uuid == "") {
  const _uuid = uuidv4();

  const hashValue = hasher.hashString(_uuid);

  if (hashValue < 40) {
    uuid = _uuid;
  }
}

console.log("UUID: ", uuid);
