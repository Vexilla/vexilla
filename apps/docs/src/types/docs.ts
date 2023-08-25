export type tomlKey = "typescript" | "rust" | "go";

export const tomlKeys: tomlKey[] = ["typescript", "rust", "go"];

export type CodeSnippetContent = Record<tomlKey, string>;
