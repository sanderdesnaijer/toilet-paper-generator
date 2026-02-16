/** Maximum paper length on the roll in cm */
export const MAX_LENGTH_CM = 100;

/** Minimum paper length in cm */
export const MIN_LENGTH_CM = 1;

// ─── Roll geometry ──────────────────────────────────────────────────
export const CORE_RADIUS = 2.0;
export const OUTER_RADIUS = 5.5;
export const ROLL_WIDTH = 4.0;

// ─── Cloth simulation (Verlet ladder) ───────────────────────────────
export const CLOTH_SEGMENT_LENGTH = 1.0;
export const CLOTH_MAX_ACTIVE_ROWS = 150;
export const CLOTH_GRAVITY = -400;
export const CLOTH_DAMPING = 0.92;
export const CLOTH_BENDING_STIFFNESS = 0.4;
export const CLOTH_FLOOR_FRICTION = 0.7;
export const CLOTH_CONSTRAINT_ITERS = 12;
export const CLOTH_SUB_STEPS = 8;
