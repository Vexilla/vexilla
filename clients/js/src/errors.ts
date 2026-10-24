export class VexillaError extends Error {
  constructor(
    public readonly kind:
      | "validation"
      | "lookup"
      | "kind"
      | "instance"
      | "fetch",
    message: string
  ) {
    super(message);
    this.name = "VexillaError";
  }
}
