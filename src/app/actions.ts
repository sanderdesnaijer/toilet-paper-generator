/**
 * Stub for static export (FTP / static hosting).
 * Printing to a network printer requires a Node server. For the real implementation
 * (when running `npm run start`), switch to actions.server.ts — see README.
 */

import type { PatternType, MessageType } from "@/constants";

export type { PatternType, MessageType };

export type PrinterSettings = {
  printerIp: string;
  printerPort: string;
};

export async function printToiletPaper(
  _lengthCm: number,
  _amount: number,
  _settings: PrinterSettings,
  _pattern: PatternType = "none",
  _patternStrength: number = 50,
  _patternDarkness: number = 100,
  _messageType: MessageType = "none",
): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message:
      "Printing is only available when running with a server (npm run build && npm run start). This static build is for FTP/static hosting.",
  };
}
