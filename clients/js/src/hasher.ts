export function hashString(stringToHash: string, seed: number) {
  const hashValue: number = (stringToHash.split("") as any[]).reduce(
    (previous, current): number => {
      return previous + current.charCodeAt(0);
    },
    0
  );

  return (Math.floor(hashValue * seed * 42) % 100) / 100;
}
