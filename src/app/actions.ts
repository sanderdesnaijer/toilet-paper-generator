"use server";

import * as net from "net";
import { MAX_LENGTH_CM } from "../constants";

export type PrinterSettings = {
  printerIp: string;
  printerPort: string;
};

export type PatternType =
  | "none"
  | "dots"
  | "stripes"
  | "grid"
  | "checkerboard"
  | "diamonds";

export type MessageType = "none" | "wipe-counter" | "inspirational-quote";

// ESC/POS commands
const ESC_INIT = Buffer.from([0x1b, 0x40]); // Initialize printer
const CUT_PAPER = Buffer.from([0x1d, 0x56, 0x42, 0x00]); // Full cut

// Raster image constants
const PRINT_WIDTH_DOTS = 576; // 80mm paper at 203 DPI
const PRINT_WIDTH_BYTES = PRINT_WIDTH_DOTS / 8; // 72 bytes per row
const RASTER_DOTS_PER_CM = 142; // Matches calibrated feed resolution (360 DPI)
const CHUNK_HEIGHT = 256; // max rows per raster command

// 4×4 ordered dithering matrix for darkness control (values 0–15)
const BAYER_4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const INSPIRATIONAL_QUOTES = [
  "Progress happens when you release what you no longer need.",
  "Small consistent efforts lead to big results.",
  "If you can sit through this, you can sit through anything.",
  "Clarity often arrives when you finally pause.",
  "Even the busiest people must stop and reset.",
  "Some of your best ideas are waiting for you to slow down.",
  "No matter how your day started, you can always make a clean finish.",
  "Every shipped feature once started as a messy prototype.",
  "Done is better than perfect. Ship it.",
  "Progress isn't glamorous. It's small fixes, every day.",
  "Nobody sees the bugs you fixed at 2am. But they matter.",
  "If it works, you're allowed to be proud.",
  "Most people never start. You did.",
  "One small improvement today beats endless planning.",
  "PROGRESS OVER PERFECTION.",
  "KEEP GOING, YOU ARE CLOSER THAN YOU THINK.",
  "TODAY IS FULL OF POSSIBILITIES.",
  "SMALL WINS BUILD BIG CHANGES.",
];

// 5x7 bitmap font. Each number is a 5-bit row.
const FONT_5X7: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "'": [4, 4, 2, 0, 0, 0, 0],
  ",": [0, 0, 0, 0, 4, 4, 8],
  "-": [0, 0, 0, 14, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0, 4],
  ":": [0, 4, 0, 0, 4, 0, 0],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 2, 4, 8, 31],
  "3": [30, 1, 1, 6, 1, 1, 30],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 16, 19, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [1, 1, 1, 1, 17, 17, 14],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
};

type TextLayout = {
  lines: string[];
  lineStartXs: number[];
  scale: number;
  charWidth: number;
  charHeight: number;
  charStep: number;
  lineHeight: number;
  startY: number;
};

/**
 * Build ESC/POS feed commands for a given length in centimeters.
 * ESC J n — Print and feed paper by n dots (0-255).
 * Calibrated at 360 DPI feed resolution: 1 cm ≈ 142 dots.
 */
function buildFeedCommands(lengthCm: number): Buffer {
  const DOTS_PER_CM = 142; // 360 DPI / 2.54 cm ≈ 142 (calibrated)
  const totalDots = Math.round(lengthCm * DOTS_PER_CM);

  const fullSteps = Math.floor(totalDots / 255);
  const remainder = totalDots % 255;

  const buffers: Buffer[] = [];

  // Each ESC J n feeds n dots (max 255)
  for (let i = 0; i < fullSteps; i++) {
    buffers.push(Buffer.from([0x1b, 0x4a, 255]));
  }

  if (remainder > 0) {
    buffers.push(Buffer.from([0x1b, 0x4a, remainder]));
  }

  return Buffer.concat(buffers);
}

/**
 * Determine whether a pixel at (x, y) should be black for the given pattern.
 */
function isPatternPixel(
  pattern: PatternType,
  x: number,
  y: number,
  strength: number,
): boolean {
  const s = Math.max(1, Math.min(100, strength));

  switch (pattern) {
    case "dots": {
      const spacing = Math.max(2, Math.round(32 - (s * 28) / 100));
      return x % spacing === 0 && y % spacing === 0;
    }
    case "stripes": {
      const period = Math.max(2, Math.round(24 - (s * 20) / 100));
      const thickness = Math.max(1, Math.round((period * s) / 200));
      return y % period < thickness;
    }
    case "grid": {
      const period = Math.max(2, Math.round(24 - (s * 20) / 100));
      const thickness = Math.max(1, Math.round((period * s) / 200));
      return y % period < thickness || x % period < thickness;
    }
    case "checkerboard": {
      const size = Math.max(2, Math.round(24 - (s * 20) / 100));
      return (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0;
    }
    case "diamonds": {
      const size = Math.max(4, Math.round(32 - (s * 26) / 100));
      const cx = x % size;
      const cy = y % size;
      const half = size / 2;
      return Math.abs(cx - half) + Math.abs(cy - half) <= half;
    }
    default:
      return false;
  }
}

function getMessageForSheet(
  messageType: MessageType,
  sheetIndex: number,
  totalSheets: number,
): string | null {
  if (messageType === "none") {
    return null;
  }
  if (messageType === "wipe-counter") {
    const wipesAlready = sheetIndex + 1;
    const wipesToGo = Math.max(0, totalSheets - wipesAlready);
    if (wipesToGo === 0) {
      return `${wipesAlready} WIPES ALREADY! HAPPY LAST WIPE!`;
    }
    return `${wipesAlready} WIPES ALREADY! ${wipesToGo} WIPES AWAY FROM FINISH.`;
  }
  const quoteIndex = Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length);
  return INSPIRATIONAL_QUOTES[quoteIndex] ?? "YOU'VE GOT THIS.";
}

function wrapWords(message: string, maxCharsPerLine: number): string[] {
  const words = message.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxCharsPerLine) {
      if (current) {
        lines.push(current);
        current = "";
      }
      let chunk = word;
      while (chunk.length > maxCharsPerLine) {
        lines.push(chunk.slice(0, maxCharsPerLine));
        chunk = chunk.slice(maxCharsPerLine);
      }
      current = chunk;
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function layoutCenteredText(
  message: string,
  totalRows: number,
): TextLayout | null {
  const normalized = message.toUpperCase().replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const scales = [3, 2, 1];
  const maxHeight = Math.max(0, totalRows - 4);

  for (const scale of scales) {
    const charWidth = 5 * scale;
    const charHeight = 7 * scale;
    const charSpacing = scale;
    const lineSpacing = scale * 2;
    const charStep = charWidth + charSpacing;
    const lineHeight = charHeight + lineSpacing;
    const maxCharsPerLine = Math.max(
      1,
      Math.floor((PRINT_WIDTH_DOTS + charSpacing) / charStep),
    );

    const lines = wrapWords(normalized, maxCharsPerLine);
    const textHeight = lines.length * lineHeight - lineSpacing;

    if (lines.length > 0 && textHeight <= maxHeight) {
      const startY = Math.floor((totalRows - textHeight) / 2);
      const lineStartXs = lines.map((line) => {
        const lineWidth =
          line.length * charWidth + Math.max(0, line.length - 1) * charSpacing;
        return Math.floor((PRINT_WIDTH_DOTS - lineWidth) / 2);
      });

      return {
        lines,
        lineStartXs,
        scale,
        charWidth,
        charHeight,
        charStep,
        lineHeight,
        startY,
      };
    }
  }

  // Always return something for very small labels.
  const fallbackLine = normalized.slice(0, 20);
  const charWidth = 5;
  const charHeight = 7;
  const charSpacing = 1;
  const lineSpacing = 2;
  const lineWidth =
    fallbackLine.length * charWidth +
    Math.max(0, fallbackLine.length - 1) * charSpacing;

  return {
    lines: [fallbackLine],
    lineStartXs: [Math.floor((PRINT_WIDTH_DOTS - lineWidth) / 2)],
    scale: 1,
    charWidth,
    charHeight,
    charStep: charWidth + charSpacing,
    lineHeight: charHeight + lineSpacing,
    startY: Math.floor((totalRows - charHeight) / 2),
  };
}

function isTextPixel(x: number, y: number, layout: TextLayout | null): boolean {
  if (!layout) {
    return false;
  }
  if (y < layout.startY) {
    return false;
  }

  const relativeY = y - layout.startY;
  const lineIndex = Math.floor(relativeY / layout.lineHeight);
  if (lineIndex < 0 || lineIndex >= layout.lines.length) {
    return false;
  }

  const yInLine = relativeY % layout.lineHeight;
  if (yInLine >= layout.charHeight) {
    return false;
  }

  const line = layout.lines[lineIndex] ?? "";
  const startX = layout.lineStartXs[lineIndex] ?? 0;
  if (x < startX) {
    return false;
  }

  const relativeX = x - startX;
  const charIndex = Math.floor(relativeX / layout.charStep);
  if (charIndex < 0 || charIndex >= line.length) {
    return false;
  }

  const xInCell = relativeX % layout.charStep;
  if (xInCell >= layout.charWidth) {
    return false;
  }

  const char = line[charIndex] ?? " ";
  const glyph = FONT_5X7[char] ?? FONT_5X7["?"];
  if (!glyph) {
    return false;
  }

  const glyphCol = Math.floor(xInCell / layout.scale);
  const glyphRow = Math.floor(yInLine / layout.scale);
  const rowBits = glyph[glyphRow] ?? 0;

  return (rowBits & (1 << (4 - glyphCol))) !== 0;
}

/**
 * Build a GS v 0 raster image chunk for a range of rows.
 */
function buildPatternChunk(
  pattern: PatternType,
  strength: number,
  darkness: number,
  startRow: number,
  numRows: number,
  textLayout: TextLayout | null,
): Buffer {
  const header = Buffer.from([
    0x1d,
    0x76,
    0x30,
    0x00, // GS v 0, mode 0
    PRINT_WIDTH_BYTES & 0xff,
    (PRINT_WIDTH_BYTES >> 8) & 0xff,
    numRows & 0xff,
    (numRows >> 8) & 0xff,
  ]);

  // Darkness threshold: 0 = nothing printed, 100 = all pattern pixels printed
  const darknessThreshold = Math.round((darkness / 100) * 16);
  const data = Buffer.alloc(numRows * PRINT_WIDTH_BYTES);

  for (let row = 0; row < numRows; row++) {
    for (let byteIdx = 0; byteIdx < PRINT_WIDTH_BYTES; byteIdx++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = byteIdx * 8 + bit;
        const y = startRow + row;
        const textBlack = isTextPixel(x, y, textLayout);
        let patternBlack = false;
        if (isPatternPixel(pattern, x, y, strength)) {
          // Apply ordered dithering for darkness
          const bayerValue = BAYER_4x4[y % 4][x % 4];
          patternBlack = bayerValue < darknessThreshold;
        }
        if (textBlack || patternBlack) {
          byte |= 0x80 >> bit;
        }
      }
      data[row * PRINT_WIDTH_BYTES + byteIdx] = byte;
    }
  }

  return Buffer.concat([header, data]);
}

/**
 * Build raster image commands for the full sheet length with a pattern.
 */
function buildPatternCommands(
  pattern: PatternType,
  strength: number,
  darkness: number,
  lengthCm: number,
  message: string | null,
): Buffer {
  const totalRows = Math.round(lengthCm * RASTER_DOTS_PER_CM);
  const buffers: Buffer[] = [];
  const textLayout = message ? layoutCenteredText(message, totalRows) : null;

  let rowsPrinted = 0;
  while (rowsPrinted < totalRows) {
    const remaining = totalRows - rowsPrinted;
    const chunkRows = Math.min(CHUNK_HEIGHT, remaining);
    buffers.push(
      buildPatternChunk(
        pattern,
        strength,
        darkness,
        rowsPrinted,
        chunkRows,
        textLayout,
      ),
    );
    rowsPrinted += chunkRows;
  }

  return Buffer.concat(buffers);
}

/**
 * Send raw data to the printer over TCP.
 * Uses Node.js net.Socket — works on macOS, Windows, and Linux.
 */
function sendToPrinter(data: Buffer, ip: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 10_000; // 10 second timeout

    socket.setTimeout(timeout);

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`Connection to printer timed out (${ip}:${port})`));
    });

    socket.on("error", (err) => {
      socket.destroy();
      reject(
        new Error(`Printer connection error: ${err.message} (${ip}:${port})`),
      );
    });

    socket.connect(port, ip, () => {
      socket.write(data, (err) => {
        if (err) {
          socket.destroy();
          reject(new Error(`Failed to write to printer: ${err.message}`));
          return;
        }

        // Give the printer a moment to process before closing
        setTimeout(() => {
          socket.end();
          resolve();
        }, 500);
      });
    });

    socket.on("close", () => {
      resolve();
    });
  });
}

/**
 * Print blank toilet paper sheets.
 * @param lengthCm — length of each sheet in centimeters
 * @param amount — number of sheets to print
 * @param settings — printer IP and port
 */
export async function printToiletPaper(
  lengthCm: number,
  amount: number,
  settings: PrinterSettings,
  pattern: PatternType = "none",
  patternStrength: number = 50,
  patternDarkness: number = 100,
  messageType: MessageType = "none",
): Promise<{ success: boolean; message: string }> {
  try {
    if (lengthCm <= 0 || amount <= 0) {
      return { success: false, message: "Length and amount must be positive." };
    }

    if (lengthCm > MAX_LENGTH_CM) {
      return {
        success: false,
        message: `Maximum length is ${MAX_LENGTH_CM} cm per sheet.`,
      };
    }

    if (amount > 100) {
      return { success: false, message: "Maximum 100 sheets per print job." };
    }

    const port = parseInt(settings.printerPort, 10);
    if (isNaN(port)) {
      return { success: false, message: "Invalid printer port." };
    }

    // Build the full ESC/POS payload for all sheets
    const buffers: Buffer[] = [];

    for (let i = 0; i < amount; i++) {
      buffers.push(ESC_INIT); // Initialize before each sheet

      const sheetMessage = getMessageForSheet(messageType, i, amount);

      if (pattern === "none" && !sheetMessage) {
        buffers.push(buildFeedCommands(lengthCm)); // Blank feed
      } else {
        buffers.push(
          buildPatternCommands(
            pattern,
            patternStrength,
            patternDarkness,
            lengthCm,
            sheetMessage,
          ),
        );
      }

      buffers.push(CUT_PAPER); // Cut after each sheet
    }

    const payload = Buffer.concat(buffers);

    await sendToPrinter(payload, settings.printerIp, port);

    return {
      success: true,
      message: `Printed ${amount} sheet${amount > 1 ? "s" : ""} of ${lengthCm} cm each${pattern !== "none" ? ` with ${pattern} pattern` : ""}${messageType !== "none" ? " and message overlay" : ""}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown printing error.";
    return { success: false, message };
  }
}
