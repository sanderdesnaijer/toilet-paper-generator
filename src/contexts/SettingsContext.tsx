"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

export type PrinterSettings = {
  printerIp: string;
  printerPort: string;
};

type SettingsContextType = {
  settings: PrinterSettings;
  updateSettings: (settings: Partial<PrinterSettings>) => void;
};

const STORAGE_KEY = "toilet-paper-printer-settings";

const DEFAULT_SETTINGS: PrinterSettings = {
  printerIp: "192.168.1.56",
  printerPort: "9100",
};

function loadSettings(): PrinterSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PrinterSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Ignore parse errors, use defaults
  }
  return DEFAULT_SETTINGS;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PrinterSettings>(loadSettings);
  const isInitialRender = useRef(true);

  // Persist to localStorage on change (skip the initial render)
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<PrinterSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
