import data from "./compatibility.json";

// These rules follow the publisher's pinned Unicode/ICU data, so aliases and
// accepted timezone labels do not change with a consumer's host runtime.
const asciiLower = (text: string) =>
  text.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
const zones = new Set(data.timezone.identifiers.map(asciiLower));
const offset = new RegExp(data.timezone.offsetPattern);
export function isCompatibleTimezone(text: string): boolean {
  const match = offset.exec(text);
  return (
    zones.has(asciiLower(text)) || (!!match && match[0].length === text.length)
  );
}
function inRanges(code: number, ranges: number[][]): boolean {
  let first = 0,
    last = ranges.length - 1;
  while (first <= last) {
    const mid = (first + last) >>> 1;
    if (code < ranges[mid][0]) {
      last = mid - 1;
    } else if (code > ranges[mid][1]) {
      first = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}
const lower = data.unicode.lower as Record<string, string>;
function lowerName(text: string): string {
  const chars = [...text];
  return chars
    .map((c, i) => {
      if (c !== "Σ") {
        return lower[c] ?? c;
      }
      let before = i - 1,
        after = i + 1;
      while (
        before >= 0 &&
        inRanges(chars[before].codePointAt(0)!, data.unicode.ignorableRanges)
      ) {
        before--;
      }
      while (
        after < chars.length &&
        inRanges(chars[after].codePointAt(0)!, data.unicode.ignorableRanges)
      ) {
        after++;
      }
      return before >= 0 &&
        inRanges(chars[before].codePointAt(0)!, data.unicode.casedRanges) &&
        (after === chars.length ||
          !inRanges(chars[after].codePointAt(0)!, data.unicode.casedRanges))
        ? "ς"
        : "σ";
    })
    .join("");
}
const upper = (n: number) =>
  (n >= 65 && n <= 90) || (n >= 192 && n <= 214) || (n >= 216 && n <= 222);
const baseLower = (n: number) =>
  (n >= 97 && n <= 122) || (n >= 223 && n <= 246) || (n >= 248 && n <= 255);
const symbol = (n: number) =>
  (n >= 32 && n <= 38) ||
  (n >= 40 && n <= 47) ||
  (n >= 58 && n <= 64) ||
  (n >= 91 && n <= 96) ||
  (n >= 123 && n <= 126) ||
  (n >= 160 && n <= 191) ||
  n === 215 ||
  n === 247;
export function normalizeName(text: string): string {
  let chars = [...text];
  const hasLower = chars.some((c) => baseLower(c.codePointAt(0)!));
  const hasRoom = chars.some((c) => symbol(c.codePointAt(0)!));
  if (chars.length && !hasLower) {
    chars = [...lowerName(text)];
  }
  if (!hasRoom) {
    const out: string[] = [];
    for (let i = 0; i < chars.length; ) {
      let j = i + 1;
      while (j < chars.length && upper(chars[j].codePointAt(0)!)) {
        j++;
      }
      out.push(chars[i]);
      if (!upper(chars[i].codePointAt(0)!) && j > i + 1) {
        out.push(" ");
        if (j > i + 2) {
          out.push(chars.slice(i + 1, j - 1).join(""), " ");
        }
        out.push(chars[j - 1]);
        i = j;
      } else {
        i++;
      }
    }
    text = out.join("");
  } else {
    text = chars.join("");
  }
  chars = [...lowerName(text)];
  const out: string[] = [];
  for (let i = 0; i < chars.length; ) {
    if (symbol(chars[i].codePointAt(0)!)) {
      while (i < chars.length && symbol(chars[i].codePointAt(0)!)) {
        i++;
      }
      if (i < chars.length) {
        out.push("-", chars[i++]);
      }
    } else {
      out.push(chars[i++]);
    }
  }
  return out.join("").replace(/'/g, "");
}
