import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import { Icon } from "@iconify/react";
import paintRollerBold from "@iconify/icons-solar/paint-roller-bold";
import sun2Bold from "@iconify/icons-solar/sun-2-bold";
import moonBold from "@iconify/icons-solar/moon-bold";
import clsx from "clsx";

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
    <div className="py-1 p-2 rounded-full bg-slate-300 gap-2 flex flex-row">
      <Button
        title="Set Light Mode"
        variant="ghost"
        className={clsx("rounded-full", {
          "bg-yellow-400": theme === "light",
        })}
        size="icon"
        onClick={() => {
          setTheme("light");
        }}
      >
        <Icon icon={sun2Bold} width={24} />
        <span className="sr-only">Set Light Mode</span>
      </Button>

      <Button
        title="Set Dark Mode"
        variant="ghost"
        size="icon"
        className={clsx("rounded-full", {
          "bg-slate-700": theme === "dark",
        })}
        onClick={() => {
          setTheme("dark");
        }}
      >
        <Icon icon={moonBold} width={24} />
        <span className="sr-only">Set Dark Mode</span>
      </Button>
    </div>
  );
}
