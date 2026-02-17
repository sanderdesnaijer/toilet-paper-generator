// ─── Shared types ────────────────────────────────────────────────────

export type PatternType =
  | "none"
  | "dots"
  | "stripes"
  | "grid"
  | "checkerboard"
  | "diamonds";

export type MessageType = "none" | "wipe-counter" | "inspirational-quote";

// ─── Roll length ─────────────────────────────────────────────────────

/** Maximum roll length in cm */
export const MAX_LENGTH_CM = 100;

/** Minimum roll length in cm */
export const MIN_LENGTH_CM = 1;

/** Default paper (sheet) length in cm – every paperLength of unrolled paper = 1 sheet */
export const DEFAULT_PAPER_LENGTH_CM = 5;

// ─── Pattern defaults ────────────────────────────────────────────────

export const DEFAULT_PATTERN_STRENGTH = 29;
export const DEFAULT_PATTERN_DARKNESS = 35;
export const PATTERN_MIN = 1;
export const PATTERN_MAX = 100;

// ─── Printer defaults ───────────────────────────────────────────────

export const DEFAULT_PRINTER_IP =
  process.env.NEXT_PUBLIC_DEFAULT_PRINTER_IP ?? "192.168.1.76";
export const DEFAULT_PRINTER_PORT =
  process.env.NEXT_PUBLIC_DEFAULT_PRINTER_PORT ?? "9100";

// ─── Printer / ESC-POS constants ─────────────────────────────────────

/** 80 mm paper at 203 DPI */
export const PRINT_WIDTH_DOTS = 576;
export const PRINT_WIDTH_BYTES = PRINT_WIDTH_DOTS / 8; // 72
/** Feed resolution: 360 DPI / 2.54 cm ≈ 142 dots per cm (calibrated) */
export const DOTS_PER_CM = 142;
/** Max rows per raster command */
export const CHUNK_HEIGHT = 256;

// ─── Roll geometry ──────────────────────────────────────────────────

export const CORE_RADIUS = 2.0;
export const OUTER_RADIUS = 5.5;
export const ROLL_WIDTH = 4.0;

// ─── Visual constants ───────────────────────────────────────────────

export const PAPER_COLOR = "#f5f0e8";
export const CORE_COLOR = "#8b7355";
export const FLOOR_Y = -3.5;

// ─── Inspirational quotes ────────────────────────────────────────────

export const INSPIRATIONAL_QUOTES = [
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

// ─── Cloth simulation (Verlet ladder) ───────────────────────────────

export const CLOTH_SEGMENT_LENGTH = 1.0;
export const CLOTH_MAX_ACTIVE_ROWS = 150;
export const CLOTH_GRAVITY = -400;
export const CLOTH_DAMPING = 0.92;
export const CLOTH_BENDING_STIFFNESS = 0.4;
export const CLOTH_FLOOR_FRICTION = 0.7;
export const CLOTH_CONSTRAINT_ITERS = 12;
export const CLOTH_SUB_STEPS = 8;
