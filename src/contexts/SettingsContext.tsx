"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_PRINTER_IP,
  DEFAULT_PRINTER_PORT,
  MAX_LENGTH_CM,
  DEFAULT_PAPER_LENGTH_CM,
} from "@/constants";

export type PrinterSettings = {
  printerIp: string;
  printerPort: string;
  rollLength: string;
  paperLength: string;
};

type SettingsContextType = {
  settings: PrinterSettings;
  updateSettings: (settings: Partial<PrinterSettings>) => void;
};

const STORAGE_KEY = "toilet-paper-printer-settings";

const DEFAULT_SETTINGS: PrinterSettings = {
  printerIp: DEFAULT_PRINTER_IP,
  printerPort: DEFAULT_PRINTER_PORT,
  rollLength: String(MAX_LENGTH_CM),
  paperLength: String(DEFAULT_PAPER_LENGTH_CM),
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

const settingsListeners = new Set<() => void>();
let settingsSnapshot: PrinterSettings = DEFAULT_SETTINGS;
let hasLoadedClientSnapshot = false;

function ensureClientSnapshotLoaded() {
  if (typeof window === "undefined" || hasLoadedClientSnapshot) {
    return;
  }
  settingsSnapshot = loadSettings();
  hasLoadedClientSnapshot = true;
}

function emitSettingsChange() {
  for (const listener of settingsListeners) {
    listener();
  }
}

function subscribeSettings(listener: () => void) {
  settingsListeners.add(listener);

  if (typeof window === "undefined") {
    return () => settingsListeners.delete(listener);
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    settingsSnapshot = loadSettings();
    hasLoadedClientSnapshot = true;
    emitSettingsChange();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    settingsListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSettingsSnapshot() {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  ensureClientSnapshotLoaded();
  return settingsSnapshot;
}

function getServerSettingsSnapshot() {
  return DEFAULT_SETTINGS;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getServerSettingsSnapshot,
  );

  const updateSettings = useCallback((partial: Partial<PrinterSettings>) => {
    ensureClientSnapshotLoaded();
    settingsSnapshot = { ...settingsSnapshot, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsSnapshot));
    } catch {
      // Ignore storage write errors and keep in-memory settings.
    }
    emitSettingsChange();
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
