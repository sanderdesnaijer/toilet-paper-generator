"use server";

import * as net from "net";

export type PrinterSettings = {
  printerIp: string;
  printerPort: string;
};

// ESC/POS commands
const ESC_INIT = Buffer.from([0x1b, 0x40]); // Initialize printer
const CUT_PAPER = Buffer.from([0x1d, 0x56, 0x42, 0x00]); // Full cut

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
 * Send raw data to the printer over TCP.
 * Uses Node.js net.Socket — works on macOS, Windows, and Linux.
 */
function sendToPrinter(
  data: Buffer,
  ip: string,
  port: number
): Promise<void> {
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
        new Error(`Printer connection error: ${err.message} (${ip}:${port})`)
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
  settings: PrinterSettings
): Promise<{ success: boolean; message: string }> {
  try {
    if (lengthCm <= 0 || amount <= 0) {
      return { success: false, message: "Length and amount must be positive." };
    }

    if (lengthCm > 500) {
      return {
        success: false,
        message: "Maximum length is 500 cm per sheet.",
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
    const feedCommands = buildFeedCommands(lengthCm);
    const buffers: Buffer[] = [];

    for (let i = 0; i < amount; i++) {
      buffers.push(ESC_INIT); // Initialize before each sheet
      buffers.push(feedCommands); // Feed the paper
      buffers.push(CUT_PAPER); // Cut after each sheet
    }

    const payload = Buffer.concat(buffers);

    await sendToPrinter(payload, settings.printerIp, port);

    return {
      success: true,
      message: `Printed ${amount} sheet${amount > 1 ? "s" : ""} of ${lengthCm} cm each.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown printing error.";
    return { success: false, message };
  }
}
