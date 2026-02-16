import { useRef, useCallback, useEffect } from "react";

export type RollPhysicsState = {
  /** Current angular velocity in radians/second */
  angularVelocity: number;
  /** Total rotation angle in radians (accumulated) */
  totalRotation: number;
  /** Current unrolled paper length in cm */
  unrolledLength: number;
  /** Whether the user is currently dragging */
  isDragging: boolean;
};

type RollPhysicsConfig = {
  /** Maximum paper length on the roll in cm */
  maxLengthCm: number;
  /** Friction coefficient — higher means faster deceleration (0-1) */
  friction: number;
  /** Sensitivity — how much drag distance converts to angular velocity */
  sensitivity: number;
  /** Paper thickness in cm (affects radius change per rotation) */
  paperThicknessCm: number;
  /** Inner core radius of the roll in cm */
  coreRadiusCm: number;
  /** Outer radius when fully loaded in cm */
  outerRadiusCm: number;
};

const DEFAULT_CONFIG: RollPhysicsConfig = {
  maxLengthCm: 500,
  friction: 0.92,
  sensitivity: 0.008,
  paperThicknessCm: 0.01,
  coreRadiusCm: 2.0,
  outerRadiusCm: 5.5,
};

/**
 * Calculate the current roll radius based on how much paper has been unrolled.
 * Uses the relationship between total paper area and radius.
 */
function calculateRadius(
  unrolledLength: number,
  config: RollPhysicsConfig,
): number {
  const { coreRadiusCm, outerRadiusCm, maxLengthCm } = config;
  // Linear interpolation of area for simplicity
  const fraction = 1 - unrolledLength / maxLengthCm;
  const outerArea = Math.PI * outerRadiusCm * outerRadiusCm;
  const coreArea = Math.PI * coreRadiusCm * coreRadiusCm;
  const currentArea = coreArea + (outerArea - coreArea) * fraction;
  return Math.sqrt(currentArea / Math.PI);
}

/**
 * Custom hook for toilet roll physics simulation.
 *
 * Handles drag interaction, momentum, friction, and converts rotation
 * to unrolled paper length. Works with both mouse and touch events.
 */
export function useRollPhysics(
  onUpdate: (state: RollPhysicsState) => void,
  config: Partial<RollPhysicsConfig> = {},
) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const stateRef = useRef<RollPhysicsState>({
    angularVelocity: 0,
    totalRotation: 0,
    unrolledLength: 0,
    isDragging: false,
  });

  const lastPointerY = useRef<number | null>(null);
  const lastTimestamp = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const cfgRef = useRef(cfg);

  // Keep refs in sync with latest props
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    cfgRef.current = cfg;
  });

  // Start animation loop — runs continuously for momentum simulation
  useEffect(() => {
    const animate = (timestamp: number) => {
      const state = stateRef.current;
      const config = cfgRef.current;

      if (lastTimestamp.current === 0) {
        lastTimestamp.current = timestamp;
      }

      const dt = Math.min((timestamp - lastTimestamp.current) / 1000, 0.05); // cap delta
      lastTimestamp.current = timestamp;

      if (!state.isDragging && Math.abs(state.angularVelocity) > 0.01) {
        // Apply friction when not dragging
        state.angularVelocity *= config.friction;

        // Convert angular velocity to paper length change
        const currentRadius = calculateRadius(state.unrolledLength, config);
        const lengthDelta = state.angularVelocity * currentRadius * dt;

        state.totalRotation += state.angularVelocity * dt;
        state.unrolledLength = Math.max(
          0,
          Math.min(config.maxLengthCm, state.unrolledLength + lengthDelta),
        );

        // Stop if velocity is very small
        if (Math.abs(state.angularVelocity) < 0.01) {
          state.angularVelocity = 0;
        }

        // Clamp at boundaries
        if (
          state.unrolledLength <= 0 ||
          state.unrolledLength >= config.maxLengthCm
        ) {
          state.angularVelocity = 0;
        }
      }

      onUpdateRef.current({ ...state });
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const onPointerDown = useCallback((clientY: number) => {
    stateRef.current.isDragging = true;
    stateRef.current.angularVelocity = 0;
    lastPointerY.current = clientY;
  }, []);

  const onPointerMove = useCallback((clientY: number) => {
    const state = stateRef.current;
    const config = cfgRef.current;

    if (!state.isDragging || lastPointerY.current === null) return;

    const deltaY = clientY - lastPointerY.current;
    lastPointerY.current = clientY;

    // Convert pixel delta to angular change (radians)
    // Positive deltaY (dragging down) = unroll = positive rotation
    const angularDelta = deltaY * config.sensitivity;
    state.angularVelocity = angularDelta * 60; // Scale for momentum on release

    // Arc-length formula: paper unrolled = angle × radius
    const currentRadius = calculateRadius(state.unrolledLength, config);
    const lengthDelta = angularDelta * currentRadius;

    state.totalRotation += angularDelta;
    state.unrolledLength = Math.max(
      0,
      Math.min(config.maxLengthCm, state.unrolledLength + lengthDelta),
    );
  }, []);

  const onPointerUp = useCallback(() => {
    stateRef.current.isDragging = false;
    lastPointerY.current = null;
  }, []);

  /** Directly set the unrolled length (for manual input override) */
  const setUnrolledLength = useCallback((lengthCm: number) => {
    const config = cfgRef.current;
    stateRef.current.unrolledLength = Math.max(
      0,
      Math.min(config.maxLengthCm, lengthCm),
    );
    stateRef.current.angularVelocity = 0;
    onUpdateRef.current({ ...stateRef.current });
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    setUnrolledLength,
    stateRef,
  };
}

export { calculateRadius };
export type { RollPhysicsConfig };
