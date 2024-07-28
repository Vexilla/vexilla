export type tomlKey = "typescript" | "rust" | "go" | "elixir";

export const tomlKeys: tomlKey[] = ["typescript", "rust", "go", "elixir"];

export type CodeSnippetContent = Record<tomlKey, string>;

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}
