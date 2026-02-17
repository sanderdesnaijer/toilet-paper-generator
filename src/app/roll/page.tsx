"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useSettings } from "@/contexts/SettingsContext";
import { printToiletPaper } from "../actions";
import { ToiletRoll } from "@/components/ToiletRoll";
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

export default function RollPage() {
  const { settings, updateSettings } = useSettings();
  const [lengthCm, setLengthCm] = useState(0);
  const [sheetCount, setSheetCount] = useState(0);
  const [pattern, setPattern] = useState<PatternType>("dots");
  const [messageType, setMessageType] = useState<MessageType>("none");
  const [patternStrength, setPatternStrength] = useState(
    DEFAULT_PATTERN_STRENGTH,
  );
  const [patternDarkness, setPatternDarkness] = useState(
    DEFAULT_PATTERN_DARKNESS,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [isPrinting, startPrinting] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const maxLengthCm = parseFloat(settings.rollLength) || MAX_LENGTH_CM;
  const paperLengthCm =
    parseFloat(settings.paperLength) || DEFAULT_PAPER_LENGTH_CM;

  const handleRollLengthChange = useCallback((newLength: number) => {
    setLengthCm(newLength);
  }, []);

  const handleSheetCountChange = useCallback((count: number) => {
    setSheetCount(count);
  }, []);

  function handlePrint() {
    setResult(null);
    startPrinting(async () => {
      const res = await printToiletPaper(
        lengthCm,
        sheetCount,
        settings,
        pattern,
        patternStrength,
        patternDarkness,
        messageType,
      );
      setResult(res);
    });
  }

  const renderControls = (prefix: string) => (
    <>
      <div>
        <label
          htmlFor={`${prefix}-rollLength`}
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Roll length (cm)
        </label>
        <input
          id={`${prefix}-rollLength`}
          type="text"
          inputMode="decimal"
          value={settings.rollLength}
          onChange={(e) => updateSettings({ rollLength: e.target.value })}
          placeholder={String(MAX_LENGTH_CM)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg font-medium tabular-nums text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Max length of the paper roll
        </p>
      </div>

      <div>
        <label
          htmlFor={`${prefix}-paperLength`}
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Paper length per sheet (cm)
        </label>
        <input
          id={`${prefix}-paperLength`}
          type="text"
          inputMode="decimal"
          value={settings.paperLength}
          onChange={(e) => updateSettings({ paperLength: e.target.value })}
          placeholder={String(DEFAULT_PAPER_LENGTH_CM)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg font-medium tabular-nums text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Scroll the roll to set the number of sheets
        </p>
      </div>

      <div>
        <label
          htmlFor={`${prefix}-pattern`}
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Pattern
        </label>
        <select
          id={`${prefix}-pattern`}
          value={pattern}
          onChange={(e) => setPattern(e.target.value as PatternType)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
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
              htmlFor={`${prefix}-strength`}
              className="mb-1.5 flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span>Density</span>
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                {patternStrength}%
              </span>
            </label>
            <input
              id={`${prefix}-strength`}
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
              htmlFor={`${prefix}-darkness`}
              className="mb-1.5 flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span>Darkness</span>
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                {patternDarkness}%
              </span>
            </label>
            <input
              id={`${prefix}-darkness`}
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
          htmlFor={`${prefix}-messageType`}
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Message
        </label>
        <select
          id={`${prefix}-messageType`}
          value={messageType}
          onChange={(e) => setMessageType(e.target.value as MessageType)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="none">None</option>
          <option value="wipe-counter">Wipe counter</option>
          <option value="inspirational-quote">Inspirational quote</option>
        </select>
      </div>
    </>
  );

  return (
    <>
      <div className="flex h-dvh min-h-dvh flex-col bg-zinc-50 font-sans dark:bg-zinc-950 lg:h-auto lg:min-h-screen lg:items-center lg:p-4">
      {/* Top nav */}
      <nav className="relative z-30 flex w-full items-center justify-between px-4 py-2 lg:mb-4 lg:max-w-5xl">
        <Link
          href="/print"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Classic mode
        </Link>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          3D Toilet Paper Generator
        </h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
      </nav>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mx-4 mb-2 w-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 lg:mx-auto lg:mb-4 lg:w-full lg:max-w-5xl">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Printer Settings
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label
                htmlFor="printerIp"
                className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300"
              >
                Printer IP Address
              </label>
              <input
                id="printerIp"
                type="text"
                value={settings.printerIp}
                onChange={(e) => updateSettings({ printerIp: e.target.value })}
                placeholder={DEFAULT_PRINTER_IP}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
            <div className="w-32">
              <label
                htmlFor="printerPort"
                className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300"
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

      {/* Main content */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:w-full lg:max-w-5xl lg:flex-row lg:items-start lg:gap-6">
        {/* 3D Roll — full screen on mobile, normal on desktop */}
        <div className="min-h-0 flex-1 lg:w-full lg:flex-1">
          <ToiletRoll
            onLengthChange={handleRollLengthChange}
            onSheetCountChange={handleSheetCountChange}
            maxLengthCm={maxLengthCm}
            paperLengthCm={paperLengthCm}
            pattern={pattern}
            patternStrength={patternStrength}
            patternDarkness={patternDarkness}
            messageType={messageType}
            className="h-full lg:aspect-square lg:h-auto lg:rounded-2xl"
          />
        </div>

        {/* Desktop Controls sidebar */}
        <aside className="hidden w-full flex-col gap-5 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900 lg:flex lg:w-80">
          {renderControls("desktop")}

          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={isPrinting || sheetCount <= 0}
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
            ) : sheetCount === 0 ? (
              "Scroll the roll to print"
            ) : (
              `Print ${sheetCount} sheet${sheetCount !== 1 ? "s" : ""}`
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
        </aside>
      </div>

      {/* ─── Mobile-only floating UI ─── */}

      {/* Backdrop when controls are open */}
      {showMobileControls && (
        <div
          className="fixed inset-0 z-40 bg-black/10 lg:hidden"
          onClick={() => setShowMobileControls(false)}
        />
      )}

      {/* Mobile controls panel */}
      {showMobileControls && (
        <div className="fixed bottom-20 right-4 z-50 flex max-h-[70vh] w-72 flex-col gap-4 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 lg:hidden">
          {renderControls("mobile")}
        </div>
      )}

      {/* Mobile controls toggle button — bottom right */}
      <button
        onClick={() => setShowMobileControls(!showMobileControls)}
        className={`fixed bottom-4 right-4 z-50 rounded-full p-3.5 shadow-lg transition-colors lg:hidden ${
          showMobileControls
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-white/90 text-zinc-600 backdrop-blur-sm dark:bg-zinc-800/90 dark:text-zinc-300"
        }`}
        title="Toggle controls"
      >
        {showMobileControls ? (
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
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
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
            <line x1="4" x2="4" y1="21" y2="14" />
            <line x1="4" x2="4" y1="10" y2="3" />
            <line x1="12" x2="12" y1="21" y2="12" />
            <line x1="12" x2="12" y1="8" y2="3" />
            <line x1="20" x2="20" y1="21" y2="16" />
            <line x1="20" x2="20" y1="12" y2="3" />
            <line x1="2" x2="6" y1="14" y2="14" />
            <line x1="10" x2="14" y1="8" y2="8" />
            <line x1="18" x2="22" y1="16" y2="16" />
          </svg>
        )}
      </button>

      {/* Mobile print button — floating bottom center */}
      <button
        onClick={handlePrint}
        disabled={isPrinting || sheetCount <= 0}
        className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 lg:hidden"
      >
        {isPrinting ? (
          <>
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
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
              <rect x="6" y="14" width="12" height="8" rx="1" />
            </svg>
            {sheetCount === 0
              ? "Scroll to print"
              : `Print ${sheetCount} sheet${sheetCount !== 1 ? "s" : ""}`}
          </>
        )}
      </button>

      {/* Mobile result toast */}
      {result && (
        <div
          className={`fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg lg:hidden ${
            result.success ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {result.message}
        </div>
      )}

      </div>

      <section className="mx-4 mt-6 mb-24 w-auto rounded-2xl border border-zinc-200 bg-white/90 p-6 text-zinc-700 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 lg:mx-auto lg:mt-8 lg:mb-4 lg:w-full lg:max-w-5xl">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Three.js Physics Demo with Real ESC/POS Thermal Printer Output
        </h2>
        <p className="mt-3 text-sm leading-6">
          3D Toilet Paper Generator is an experimental Next.js web application
          that combines interactive WebGL simulation with real-world ESC/POS
          thermal printing.
        </p>
        <p className="mt-3 text-sm leading-6">
          Drag a realistic 3D toilet roll, measure the exact unrolled length in
          centimeters, and send that value directly to a network thermal printer
          over TCP.
        </p>
        <p className="mt-3 text-sm leading-6">
          This project demonstrates how browser-based 3D rendering can integrate
          with real hardware through a Node.js backend.
        </p>

        <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          How It Works
        </h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
          <li>Interactive 3D toilet roll built with Three.js and React Three Fiber</li>
          <li>Custom Verlet-based cloth simulation for the hanging paper strip</li>
          <li>Dynamic roll radius calculation based on unrolled distance</li>
          <li>Rapier physics for collisions and movement</li>
          <li>
            Direct ESC/POS byte commands sent over TCP using Node.js
            net.Socket
          </li>
          <li>Automatic feed and cut commands for compatible thermal printers</li>
        </ul>

        <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Tech Stack
        </h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
          <li>Next.js 16 (App Router)</li>
          <li>React 19</li>
          <li>Tailwind CSS v4</li>
          <li>Three.js</li>
          <li>@react-three/fiber</li>
          <li>@react-three/drei</li>
          <li>@react-three/rapier</li>
          <li>Node.js TCP sockets</li>
          <li>ESC/POS thermal printer protocol</li>
        </ul>

        <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Important: Printing Requirements
        </h3>
        <p className="mt-3 text-sm leading-6">
          Thermal printing requires running the project with a Node.js server.
        </p>
        <p className="mt-3 text-sm leading-6">
          Web browsers do not support direct TCP socket communication, which
          means ESC/POS printing cannot work from a static deployment alone.
        </p>
        <p className="mt-3 text-sm leading-6">To enable printing:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
          <li>Run the project locally or on a Node-enabled server</li>
          <li>
            Configure your printer IP address and port (typically 9100)
          </li>
          <li>Ensure the printer supports raw ESC/POS over TCP</li>
        </ul>
        <p className="mt-3 text-sm leading-6">
          The live demo shows the 3D simulation, but printer output requires
          server execution.
        </p>

        <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Why I Built This
        </h3>
        <p className="mt-3 text-sm leading-6">
          What started as a joke became a compact testbed for:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
          <li>WebGL physics rendering</li>
          <li>Custom cloth simulation</li>
          <li>Network-based hardware integration</li>
          <li>Raw ESC/POS command generation</li>
        </ul>
        <p className="mt-3 text-sm leading-6">
          It&apos;s playful on the surface, but technically it demonstrates a
          full browser → server → printer workflow.
        </p>
      </section>
    </>
  );
}
