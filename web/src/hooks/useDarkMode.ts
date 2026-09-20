import { Classes } from "@blueprintjs/core";
import { useEffect, useState } from "react";

const KEY = "theme";

function initial(): boolean {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved === "dark";
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Blueprint's dark class on <body> drives both Blueprint and Tailwind's `dark:` variant.
export function useDarkMode() {
  const [dark, setDark] = useState(initial);

  useEffect(() => {
    document.body.classList.toggle(Classes.DARK, dark);
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {}
  }, [dark]);

  return [dark, setDark] as const;
}
