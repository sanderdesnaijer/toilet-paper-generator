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

/* eslint-disable @typescript-eslint/no-unused-vars -- stub for static export; signature must match actions.server.ts */
export async function printToiletPaper(
  _lengthCm: number,
  _amount: number,
  _settings: PrinterSettings,
  _pattern?: PatternType,
  _patternStrength?: number,
  _patternDarkness?: number,
  _messageType?: MessageType,
): Promise<{ success: boolean; message: string }> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return {
    success: false,
    message:
      "Printing is only available when running with a server (npm run build && npm run start)",
  };
}
