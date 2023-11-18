import _React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
// @ts-ignore // pagefind does not export types for us to use
import * as pagefind from "@/pagefind/pagefind";

import { Icon } from "@iconify/react";
import bookOpenTextDuotone from "@iconify/icons-ph/book-open-text-duotone";
import bookDuotone from "@iconify/icons-ph/book-duotone";
import notePencilDuotone from "@iconify/icons-ph/note-pencil-duotone";

import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
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
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setResults([]);
        setOpen((open) => !open);
        setWasOpen(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useLayoutEffect(() => {
    if (!open && wasOpen) {
      searchButtonRef.current?.focus();
      setWasOpen(false);
    }
  }, [open, wasOpen]);

  return (
    <>
      <Button
        ref={searchButtonRef}
        onClick={() => {
          setOpen(true);
          setResults([]);
        }}
        variant="outline"
      >
        <div className="mr-10">Search</div>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(open) => {
          if (open === true) {
          } else {
            setOpen(false);

            // need to kick the focus to next iteration of the event loop
            // similar to a useEffect with open as the dependency
            setTimeout(() => {
              if (searchButtonRef.current) {
                searchButtonRef.current.focus();
              }
            }, 0);
          }
        }}
      >
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
    return bookDuotone;
  }

  if (result.data.url.includes("/blog/")) {
    return notePencilDuotone;
  }

  return bookOpenTextDuotone;
}
