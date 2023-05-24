import { customAlphabet } from "nanoid";

export const nanoid = customAlphabet(
  [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
    "1234567890",
    "-_",
  ].join("")
);
