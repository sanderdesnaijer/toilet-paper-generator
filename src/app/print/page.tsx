"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSettings } from "@/contexts/SettingsContext";
import { printToiletPaper } from "../actions";
import { PrintPreview } from "@/components/PrintPreview";
import {
  type PatternType,
  type MessageType,
  DEFAULT_PATTERN_STRENGTH,
  DEFAULT_PATTERN_DARKNESS,
  MAX_LENGTH_CM,
  DEFAULT_PAPER_LENGTH_CM,
  DEFAULT_PRINTER_IP,
  DEFAULT_PRINTER_PORT,
  PATTERN_MIN,
  PATTERN_MAX,
} from "@/constants";

export default function PrintPage() {
  const { settings, updateSettings } = useSettings();
  const [amount, setAmount] = useState("1");
  const [pattern, setPattern] = useState<PatternType>("dots");
  const [messageType, setMessageType] = useState<MessageType>("none");
  const [patternStrength, setPatternStrength] = useState(
    DEFAULT_PATTERN_STRENGTH,
  );
  const [patternDarkness, setPatternDarkness] = useState(
    DEFAULT_PATTERN_DARKNESS,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isPrinting, startPrinting] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const maxLengthCm = parseFloat(settings.rollLength) || MAX_LENGTH_CM;
  const paperLengthCm =
    parseFloat(settings.paperLength) || DEFAULT_PAPER_LENGTH_CM;
  const parsedAmount = parseInt(amount, 10);

  function handlePrint() {
    setResult(null);
    startPrinting(async () => {
      const res = await printToiletPaper(
        paperLengthCm,
        parsedAmount,
        settings,
        pattern,
        patternStrength,
        patternDarkness,
        messageType,
      );
      setResult(res);
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 font-sans dark:bg-zinc-950">
      <div className="flex w-full max-w-6xl flex-col gap-6 lg:flex-row lg:items-start lg:justify-center">
        <main className="flex w-full max-w-md flex-col gap-8 rounded-2xl bg-white p-8 shadow-lg dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Toilet Paper Generator
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Print blank sheets to your thermal printer
              </p>
              <Link
                href="/"
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              >
                Try 3D Roll Mode
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              title="Printer settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Printer Settings
              </h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="printerIp"
                    className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    Printer IP Address
                  </label>
                  <input
                    id="printerIp"
                    type="text"
                    value={settings.printerIp}
                    onChange={(e) =>
                      updateSettings({ printerIp: e.target.value })
                    }
                    placeholder={DEFAULT_PRINTER_IP}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="printerPort"
                    className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    Port
                  </label>
                  <input
                    id="printerPort"
                    type="text"
                    value={settings.printerPort}
                    onChange={(e) =>
                      updateSettings({ printerPort: e.target.value })
                    }
                    placeholder={DEFAULT_PRINTER_PORT}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Inputs */}
          <div className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="rollLength"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Roll length (cm)
              </label>
              <input
                id="rollLength"
                type="text"
                inputMode="decimal"
                value={settings.rollLength}
                onChange={(e) => updateSettings({ rollLength: e.target.value })}
                placeholder={String(MAX_LENGTH_CM)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg font-medium text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Max length of the paper roll
              </p>
            </div>

            <div>
              <label
                htmlFor="paperLength"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Paper length per sheet (cm)
              </label>
              <input
                id="paperLength"
                type="text"
                inputMode="decimal"
                value={settings.paperLength}
                onChange={(e) =>
                  updateSettings({ paperLength: e.target.value })
                }
                placeholder={String(DEFAULT_PAPER_LENGTH_CM)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg font-medium text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              <p className="mt-1 text-xs text-zinc-400">
                {`Length of each sheet (default ${DEFAULT_PAPER_LENGTH_CM} cm)`}
              </p>
            </div>

            <div>
              <label
                htmlFor="amount"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Number of sheets
              </label>
              <input
                id="amount"
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg font-medium text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Or use 3D Roll Mode to scroll
              </p>
            </div>

            <div>
              <label
                htmlFor="pattern"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Pattern
              </label>
              <select
                id="pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value as PatternType)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg font-medium text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="none">None (blank)</option>
                <option value="dots">Dots</option>
                <option value="stripes">Stripes</option>
                <option value="grid">Grid</option>
                <option value="checkerboard">Checkerboard</option>
                <option value="diamonds">Diamonds</option>
              </select>
            </div>

            {pattern !== "none" && (
              <>
                <div>
                  <label
                    htmlFor="strength"
                    className="mb-1.5 flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    <span>Density</span>
                    <span className="text-xs font-normal text-zinc-400">
                      {patternStrength}%
                    </span>
                  </label>
                  <input
                    id="strength"
                    type="range"
                    min={PATTERN_MIN}
                    max={PATTERN_MAX}
                    value={patternStrength}
                    onChange={(e) => setPatternStrength(Number(e.target.value))}
                    className="w-full accent-zinc-900 dark:accent-zinc-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="darkness"
                    className="mb-1.5 flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    <span>Darkness</span>
                    <span className="text-xs font-normal text-zinc-400">
                      {patternDarkness}%
                    </span>
                  </label>
                  <input
                    id="darkness"
                    type="range"
                    min={PATTERN_MIN}
                    max={PATTERN_MAX}
                    value={patternDarkness}
                    onChange={(e) => setPatternDarkness(Number(e.target.value))}
                    className="w-full accent-zinc-900 dark:accent-zinc-100"
                  />
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="messageType"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Message
              </label>
              <select
                id="messageType"
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as MessageType)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg font-medium text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="none">None</option>
                <option value="wipe-counter">
                  Counter: x wipes already! x wipes away from finish.
                </option>
                <option value="inspirational-quote">
                  Random inspirational quote
                </option>
              </select>
              <p className="mt-1 text-xs text-zinc-400">
                Printed centered in full black, combined with your pattern.
              </p>
            </div>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={isPrinting || !(maxLengthCm > 0) || !(parsedAmount > 0)}
            className="w-full rounded-xl bg-zinc-900 px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isPrinting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Printing...
              </span>
            ) : (
              `Print ${parsedAmount || 0} sheet${parsedAmount !== 1 ? "s" : ""}`
            )}
          </button>

          {/* Result Message */}
          {result && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                result.success
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {result.message}
            </div>
          )}
        </main>

        <PrintPreview
          lengthCm={paperLengthCm}
          amount={parsedAmount}
          pattern={pattern}
          patternStrength={patternStrength}
          patternDarkness={patternDarkness}
          messageType={messageType}
        />
      </div>
    </div>
  );
}
