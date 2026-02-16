"use client";

import { useMemo } from "react";
import {
  INSPIRATIONAL_QUOTES,
  type PatternType,
  type MessageType,
} from "@/constants";

type PrintPreviewProps = {
  lengthCm: number;
  amount: number;
  pattern: PatternType;
  patternStrength: number;
  patternDarkness: number;
  messageType: MessageType;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getPreviewMessage(
  messageType: MessageType,
  amount: number,
  quoteIndex: number,
): string {
  if (messageType === "none") {
    return "";
  }
  if (messageType === "wipe-counter") {
    const wipesAlready = 1;
    const wipesToGo = Math.max(0, amount - wipesAlready);
    if (wipesToGo === 0) {
      return `${wipesAlready} WIPE ALREADY! HAPPY LAST WIPE!`;
    }
    return `${wipesAlready} WIPES ALREADY! ${wipesToGo} WIPES AWAY FROM FINISH.`;
  }
  return (
    INSPIRATIONAL_QUOTES[quoteIndex % INSPIRATIONAL_QUOTES.length] ??
    "YOU ARE DOING GREAT."
  );
}

function wrapMessage(message: string, maxCharsPerLine: number): string[] {
  const words = message.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function renderPattern(
  pattern: PatternType,
  strength: number,
  darkness: number,
): { def: React.ReactNode; fill: string } {
  if (pattern === "none") {
    return { def: null, fill: "#fff" };
  }

  const alpha = clamp(darkness / 100, 0.05, 1);

  if (pattern === "dots") {
    const spacing = clamp(Math.round(20 - (strength * 16) / 100), 4, 20);
    const r = clamp(Math.round(1 + (strength * 2) / 100), 1, 3);
    return {
      def: (
        <pattern
          id="preview-pattern"
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={spacing / 2}
            cy={spacing / 2}
            r={r}
            fill={`rgba(0,0,0,${alpha})`}
          />
        </pattern>
      ),
      fill: "url(#preview-pattern)",
    };
  }

  if (pattern === "stripes") {
    const period = clamp(Math.round(18 - (strength * 14) / 100), 4, 18);
    const thickness = clamp(Math.round(1 + (strength * 2) / 100), 1, 4);
    return {
      def: (
        <pattern
          id="preview-pattern"
          width={period}
          height={period}
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={period}
            height={thickness}
            fill={`rgba(0,0,0,${alpha})`}
          />
        </pattern>
      ),
      fill: "url(#preview-pattern)",
    };
  }

  if (pattern === "grid") {
    const period = clamp(Math.round(18 - (strength * 14) / 100), 4, 18);
    const thickness = clamp(Math.round(1 + (strength * 2) / 100), 1, 4);
    return {
      def: (
        <pattern
          id="preview-pattern"
          width={period}
          height={period}
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={period}
            height={thickness}
            fill={`rgba(0,0,0,${alpha})`}
          />
          <rect
            width={thickness}
            height={period}
            fill={`rgba(0,0,0,${alpha})`}
          />
        </pattern>
      ),
      fill: "url(#preview-pattern)",
    };
  }

  if (pattern === "checkerboard") {
    const size = clamp(Math.round(16 - (strength * 12) / 100), 4, 16);
    return {
      def: (
        <pattern
          id="preview-pattern"
          width={size * 2}
          height={size * 2}
          patternUnits="userSpaceOnUse"
        >
          <rect width={size} height={size} fill={`rgba(0,0,0,${alpha})`} />
          <rect
            x={size}
            y={size}
            width={size}
            height={size}
            fill={`rgba(0,0,0,${alpha})`}
          />
        </pattern>
      ),
      fill: "url(#preview-pattern)",
    };
  }

  const size = clamp(Math.round(24 - (strength * 18) / 100), 8, 24);
  const half = size / 2;
  return {
    def: (
      <pattern
        id="preview-pattern"
        width={size}
        height={size}
        patternUnits="userSpaceOnUse"
      >
        <polygon
          points={`${half},0 ${size},${half} ${half},${size} 0,${half}`}
          fill={`rgba(0,0,0,${alpha})`}
        />
      </pattern>
    ),
    fill: "url(#preview-pattern)",
  };
}

export function PrintPreview({
  lengthCm,
  amount,
  pattern,
  patternStrength,
  patternDarkness,
  messageType,
}: PrintPreviewProps) {
  const safeLength = Number.isFinite(lengthCm) && lengthCm > 0 ? lengthCm : 5;
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
  const previewHeight = clamp(Math.round(safeLength * 14), 180, 420);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const quoteIndex = useMemo(
    () => Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length),
    [messageType],
  );
  const message = getPreviewMessage(messageType, safeAmount, quoteIndex);
  const messageLines = wrapMessage(message, 22);

  const fontSize =
    messageLines.length <= 2 ? 20 : messageLines.length === 3 ? 16 : 14;
  const lineHeight = fontSize + 6;
  const textBlockHeight =
    messageLines.length > 0 ? messageLines.length * lineHeight - 6 : 0;
  const firstLineY = (previewHeight - textBlockHeight) / 2 + fontSize * 0.8;

  const patternRender = renderPattern(
    pattern,
    patternStrength,
    patternDarkness,
  );

  return (
    <aside className="w-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 lg:w-[22rem]">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Print Preview
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        First sheet preview based on current settings.
      </p>

      <div className="mt-4 rounded-xl border border-zinc-300 bg-zinc-100 p-3 dark:border-zinc-600 dark:bg-zinc-800">
        <svg
          viewBox={`0 0 288 ${previewHeight}`}
          className="h-auto w-full rounded-md bg-white"
          role="img"
          aria-label="Toilet paper print preview"
        >
          <defs>{patternRender.def}</defs>
          <rect
            x="0"
            y="0"
            width="288"
            height={previewHeight}
            fill={patternRender.fill}
          />
          {messageLines.length > 0 && (
            <text
              x="144"
              y={firstLineY}
              textAnchor="middle"
              fill="#000"
              fontSize={fontSize}
              fontWeight="700"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {messageLines.map((line, index) => (
                <tspan
                  key={`${line}-${index}`}
                  x="144"
                  dy={index === 0 ? 0 : lineHeight}
                >
                  {line}
                </tspan>
              ))}
            </text>
          )}
        </svg>
      </div>
    </aside>
  );
}
