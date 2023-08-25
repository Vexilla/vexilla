import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import { Icon } from "@iconify/react";
import paintRollerBold from "@iconify/icons-solar/paint-roller-bold";
import sun2Bold from "@iconify/icons-solar/sun-2-bold";
import moonBold from "@iconify/icons-solar/moon-bold";

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
    <Button
      title="Toggle light/dark mode"
      className="p-2 rounded-full"
      onClick={() => {
        setTheme(theme === "dark" ? "light" : "dark");
      }}
    >
      <Icon icon={theme === "dark" ? sun2Bold : moonBold} width={24} />
      <span className="sr-only">Toggle light/dark mode</span>
    </Button>
  );
}
