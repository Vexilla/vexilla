const utf8EncodeText = new TextEncoder();

const FNV32_OFFSET_BASIS = 2166136261;
const FNV32_PRIME = 16777619;

export function hashString(stringToHash: string, seed: number) {
  const byteArray = utf8EncodeText.encode(stringToHash);

  let total = FNV32_OFFSET_BASIS;
  const length = byteArray.length;

  for (let i = 0; i < length; i++) {
    const byte = byteArray[i];
    total = total ^ byte;
    total = total * FNV32_PRIME;
  }

  const result = ((total * seed) % 100) / 100;
  return Math.abs(result);
}
