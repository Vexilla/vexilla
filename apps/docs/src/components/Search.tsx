import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import * as pagefind from "@/_pagefind/pagefind";

import { Icon } from "@iconify/react";
import documentTextBold from "@iconify/icons-solar/document-text-bold";
import book2Bold from "@iconify/icons-solar/book-2-bold";
import documentAddBold from "@iconify/icons-solar/document-add-bold";

// const pagefind =

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Command,
} from "@/components/ui/command";

interface SearchResult {
  meta: SearchResultMeta;
  data: SearchResultData;
}

interface SearchResultMeta {
  data: () => Promise<SearchResultData>;
  excerpt_range: number[];
  id: string;
  score: number;
  words: number[];
}

interface SearchResultData {
  content: string;
  excerpt: string;
  filters: Object;
  meta: Record<string, string>;
  raw_content: string;
  raw_url: string;
  url: string;
  word_count: number;
}

export function Search() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setResults([]);
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
          setResults([]);
        }}
      >
        <div className="mr-10">Search</div>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type a command or search..."
            onInput={async (event) => {
              setLoading(true);

              try {
                const search = await pagefind.debouncedSearch(
                  event.currentTarget.value
                );

                if (search) {
                  const newResults = await Promise.all(
                    search.results.map(async (result: any) => ({
                      data: await result.data(),
                      meta: result,
                    }))
                  );

                  setResults(newResults);

                  console.log({ newResults });
                }
              } catch (e) {
                console.log("Error searching:", e);
              } finally {
                setLoading(false);
              }
            }}
          />
          <CommandList>
            {!loading && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {!loading &&
              results.map((result) => (
                <CommandItem key={result.meta.id}>
                  <div className="px-4">
                    <Icon
                      className="!w-8 !h-8"
                      icon={getResultIcon(result)}
                      width={84}
                    />
                  </div>
                  <a href={result.data.url.replace("/src", "")}>
                    <div className="font-bold">{result.data.meta.title}</div>
                    <div
                      dangerouslySetInnerHTML={{ __html: result.data.excerpt }}
                    />
                  </a>
                </CommandItem>
              ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

function getResultIcon(result: SearchResult) {
  if (result.data.url.includes("/documentation/")) {
    return book2Bold;
  }

  if (result.data.url.includes("/blog/")) {
    return documentAddBold;
  }

  return documentTextBold;
}
