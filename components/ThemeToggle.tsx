"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Default to Clean White Light Theme unless user explicitly chose dark
    const stored = localStorage.getItem("theme");
    const isDarkMode = stored === "dark";

    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-foreground/80 hover:text-[#6C1C74] hover:bg-[#6C1C74]/10 transition-colors border border-border cursor-pointer shrink-0"
      title={isDark ? "Switch to Clean White Light Theme" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6C1C74]" />}
    </button>
  );
}

export default ThemeToggle;
