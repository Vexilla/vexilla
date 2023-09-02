import type { CodeSnippetContent, tomlKey } from "@/types/docs";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "../ui/button";

import { Icon } from "@iconify/react";
import copyOutline from "@iconify/icons-solar/copy-outline";

interface CodeSnippetProps {
  title: string;
  rawSnippet: CodeSnippetContent;
  contents: CodeSnippetContent;
}

const SELECTED_LANGUAGE_KEY = "programming-language";
const DEFAULT_LANGUAGE = "typescript";

const customStorageEvent = "languageChange";

export function CodeSnippet({
  contents,
  title = "",
  rawSnippet,
}: CodeSnippetProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(
    DEFAULT_LANGUAGE as tomlKey
  );

  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedLanguage(
      (localStorage.getItem(SELECTED_LANGUAGE_KEY) ||
        DEFAULT_LANGUAGE) as tomlKey
    );
  }, []);

  useEffect(() => {
    localStorage.setItem(SELECTED_LANGUAGE_KEY, selectedLanguage);
    window.dispatchEvent(
      new CustomEvent(customStorageEvent, {
        detail: { selectedLanguage },
      })
    );
  }, [selectedLanguage]);

  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  }, [copied]);

  useEffect(() => {
    setLoaded(true);

    function storageListener(
      event: CustomEvent<{ selectedLanguage: tomlKey }>
    ) {
      if (event.detail.selectedLanguage !== selectedLanguage) {
        setSelectedLanguage(event.detail.selectedLanguage);
      }
    }

    window.addEventListener(customStorageEvent as any, storageListener);

    return function () {
      window.removeEventListener(customStorageEvent as any, storageListener);
    };
  }, [selectedLanguage]);

  return (
    <div className="bg-[#24292e] rounded-lg not-prose">
      <div className="flex flex-row items-center justify-between p-2 px-4 bg-slate-600 rounded-t-md">
        <div className="text-white flex flex-row items-center">
          <label className="mr-2 text-slate-200">Language: </label>
          <Select
            value={selectedLanguage}
            onValueChange={(newLang) => {
              setSelectedLanguage(newLang as tomlKey);
            }}
          >
            <SelectTrigger className="bg-white text-slate-700 dark:bg-slate-800 dark:text-white w-[120px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(contents).map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-row items-center">
          <Button
            title="Copy code"
            onClick={() => {
              navigator.clipboard.writeText(
                rawSnippet[selectedLanguage as tomlKey]
              );
              setCopied(true);
            }}
          >
            {!copied && <Icon icon={copyOutline} />}
            {copied && "Copied!"}
          </Button>
        </div>
      </div>
      {!loaded && (
        <div
          key={DEFAULT_LANGUAGE}
          className={clsx("px-4 py-4 overflow-x-auto")}
          dangerouslySetInnerHTML={{
            __html: contents[DEFAULT_LANGUAGE],
          }}
        />
      )}
      {!!loaded &&
        Object.entries(contents).map(([lang, snippet]) => {
          return (
            <div className="relative" key={lang}>
              <div
                key={lang}
                className={clsx("px-4 py-4 overflow-x-auto", {
                  hidden: selectedLanguage !== lang,
                })}
                dangerouslySetInnerHTML={{
                  __html: snippet,
                }}
              />
            </div>
          );
        })}
    </div>
  );
}
