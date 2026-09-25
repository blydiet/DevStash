"use client";

import { Toaster } from "sonner";
import { useTheme } from "./ThemeContext";

export function AppToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} richColors />;
}
