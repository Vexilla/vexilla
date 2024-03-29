import _React, { useEffect, useState } from "react";
import clsx from "clsx";

import { Button } from "@/components/ui/button";

import { Icon } from "@iconify/react";
import sunDuotone from "@iconify/icons-ph/sun-duotone";
import moonDuotone from "@iconify/icons-ph/moon-duotone";

const THEME_KEY = "theme";

const systemPreference = matchMedia("(prefers-color-scheme: light)").matches
  ? "light"
  : matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";

export function ThemeSelector() {
  const [theme, setTheme] = useState(
    window.localStorage.getItem(THEME_KEY) || systemPreference
  );

  useEffect(() => {
    window.document.documentElement.classList.remove("dark", "light");
    window.document.documentElement.classList.add(theme);
    if (theme === systemPreference) {
      window.localStorage.removeItem(THEME_KEY);
    } else {
      window.localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  return (
    <div className="py-1 p-2 rounded-full bg-slate-300 gap-1 flex flex-row w-18 h-8">
      <Button
        title="Set Light Mode"
        variant="ghost"
        className={clsx("flex rounded-full h-6 w-6 min-w-[1.5rem]", {
          "bg-slate-700": theme === "light",
          "text-white": theme === "light",
          "text-black": theme === "dark",
        })}
        aria-pressed={theme === "light"}
        size="icon"
        onClick={() => {
          setTheme("light");
        }}
      >
        <Icon icon={sunDuotone} width={16} />
        <span className="sr-only">Set Light Mode</span>
      </Button>

      <Button
        title="Set Dark Mode"
        variant="ghost"
        size="icon"
        aria-pressed={theme === "dark"}
        className={clsx("flex rounded-full h-6 w-6 min-w-[1.5rem]", {
          "bg-slate-700": theme === "dark",
          "text-black": theme === "light",
        })}
        onClick={() => {
          setTheme("dark");
        }}
      >
        <Icon icon={moonDuotone} width={16} />
        <span className="sr-only">Set Dark Mode</span>
      </Button>
    </div>
  );
}
