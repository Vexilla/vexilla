export default class Hasher {
  private seed;

  constructor(seed: number) {
    this.seed = seed;
  }
  hashString(stringToHash: string) {
    const hashValue: number = (stringToHash.split("") as any[]).reduce(
      (previous, current): number => {
        return previous + current.charCodeAt(0);
      },
      0
    );

    return Math.floor(hashValue * this.seed * 42) % 100;
  }
}
