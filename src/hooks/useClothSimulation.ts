/**
 * Verlet-based "ladder" cloth simulation for the toilet paper strip.
 *
 * The paper is modelled as two parallel chains of particles (left and right
 * edges of the paper width) connected by cross-rungs. This gives a lightweight
 * 2-column grid that behaves like a floppy ribbon.
 *
 * Constraints:
 *   - Structural: distance constraints along each chain (left-left, right-right)
 *   - Rungs: distance constraints across each row (left-right)
 *   - Bending: skip-one distance constraints along each chain
 *
 * The first row is pinned to the roll exit point each frame.
 * Rows are spawned/despawned at the roll end as paper unrolls/rewinds.
 */

import {
  CLOTH_SEGMENT_LENGTH,
  CLOTH_MAX_ACTIVE_ROWS,
  CLOTH_GRAVITY,
  CLOTH_DAMPING,
  CLOTH_BENDING_STIFFNESS,
  CLOTH_FLOOR_FRICTION,
  CLOTH_CONSTRAINT_ITERS,
  CLOTH_SUB_STEPS,
  ROLL_WIDTH,
  FLOOR_Y,
} from "@/constants";

// ─── Types ──────────────────────────────────────────────────────────

type Vec3 = { x: number; y: number; z: number };

type Particle = {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
};

export type ClothConfig = {
  segmentLength: number;
  gravity: number;
  damping: number;
  bendingStiffness: number;
  floorFriction: number;
  maxActiveRows: number;
  constraintIterations: number;
  subSteps: number;
  paperWidth: number;
  floorY: number;
};

const DEFAULT_CONFIG: ClothConfig = {
  segmentLength: CLOTH_SEGMENT_LENGTH,
  gravity: CLOTH_GRAVITY,
  damping: CLOTH_DAMPING,
  bendingStiffness: CLOTH_BENDING_STIFFNESS,
  floorFriction: CLOTH_FLOOR_FRICTION,
  maxActiveRows: CLOTH_MAX_ACTIVE_ROWS,
  constraintIterations: CLOTH_CONSTRAINT_ITERS,
  subSteps: CLOTH_SUB_STEPS,
  paperWidth: ROLL_WIDTH,
  floorY: FLOOR_Y,
};

// ─── Simulation class ───────────────────────────────────────────────

export class ClothSimulation {
  /** Left-edge particles (index 0 = closest to roll) */
  private left: Particle[] = [];
  /** Right-edge particles (index 0 = closest to roll) */
  private right: Particle[] = [];

  private config: ClothConfig;

  constructor(config: Partial<ClothConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Public API ───────────────────────────────────────────────

  get rowCount(): number {
    return this.left.length;
  }

  /**
   * Advance the simulation by `dt` seconds.
   * @param dt          Frame delta in seconds (will be capped internally)
   * @param exitLeft    World-space position of the left side of the paper exit
   * @param exitRight   World-space position of the right side of the paper exit
   * @param spinRate    Angular velocity of the roll (rad/s) – used to add
   *                    extra downward pull on freshly-emitted paper
   */
  update(dt: number, exitLeft: Vec3, exitRight: Vec3, spinRate = 0): void {
    if (this.left.length === 0) return;

    dt = Math.min(dt, 1 / 20);
    const { subSteps, constraintIterations } = this.config;
    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      this.pinFirstRow(exitLeft, exitRight);
      this.integrate(subDt);
      this.applySpinPull(subDt, spinRate);

      for (let iter = 0; iter < constraintIterations; iter++) {
        this.solveStructural();
        this.solveRungs();
        this.solveBending();
        this.solveFloor();
      }

      // Final floor clamp to guarantee no particles ended up below after constraints
      this.solveFloor();
    }
  }

  /** Add a new row of particles at the roll end (index 0). */
  spawnRow(exitLeft: Vec3, exitRight: Vec3): void {
    if (this.left.length >= this.config.maxActiveRows) return;

    if (this.left.length === 0) {
      this.left.push(makeParticle(exitLeft));
      this.right.push(makeParticle(exitRight));
      return;
    }

    // Insert at position 0 (closest to roll)
    // Shift existing first row's position slightly to avoid overlap
    const newL = makeParticle(exitLeft);
    const newR = makeParticle(exitRight);
    this.left.unshift(newL);
    this.right.unshift(newR);
  }

  /** Remove the row closest to the roll (index 0). */
  despawnRow(): void {
    if (this.left.length <= 1) return;
    this.left.shift();
    this.right.shift();
  }

  /**
   * Build a flat Float32Array of vertex positions for a BufferGeometry.
   * Layout: for each row (0..N-1), two vertices: [leftX,leftY,leftZ, rightX,rightY,rightZ]
   * Total: rowCount * 2 * 3 floats.
   */
  getPositions(): Float32Array {
    const n = this.left.length;
    const arr = new Float32Array(n * 2 * 3);
    for (let i = 0; i < n; i++) {
      const l = this.left[i];
      const r = this.right[i];
      const base = i * 6;
      arr[base] = l.x;
      arr[base + 1] = l.y;
      arr[base + 2] = l.z;
      arr[base + 3] = r.x;
      arr[base + 4] = r.y;
      arr[base + 5] = r.z;
    }
    return arr;
  }

  /**
   * Build UVs: u=0 for left, u=1 for right. v = row arc distance / paperWidth.
   */
  getUVs(): Float32Array {
    const n = this.left.length;
    const arr = new Float32Array(n * 2 * 2);
    const { segmentLength, paperWidth } = this.config;
    for (let i = 0; i < n; i++) {
      const v = (i * segmentLength) / paperWidth;
      const base = i * 4;
      arr[base] = 1;
      arr[base + 1] = v;
      arr[base + 2] = 0;
      arr[base + 3] = v;
    }
    return arr;
  }

  /** Build index array for triangle strip. */
  getIndices(): Uint16Array {
    const n = this.left.length;
    if (n < 2) return new Uint16Array(0);
    const indices: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const tl = i * 2;
      const tr = i * 2 + 1;
      const bl = (i + 1) * 2;
      const br = (i + 1) * 2 + 1;
      indices.push(tl, tr, bl);
      indices.push(tr, br, bl);
    }
    return new Uint16Array(indices);
  }

  /** Discard all particles. */
  reset(): void {
    this.left = [];
    this.right = [];
  }

  // ─── Pin first row ────────────────────────────────────────────

  private pinFirstRow(exitLeft: Vec3, exitRight: Vec3): void {
    if (this.left.length === 0) return;
    const l = this.left[0];
    const r = this.right[0];
    l.x = exitLeft.x;
    l.y = exitLeft.y;
    l.z = exitLeft.z;
    l.px = exitLeft.x;
    l.py = exitLeft.y;
    l.pz = exitLeft.z;
    r.x = exitRight.x;
    r.y = exitRight.y;
    r.z = exitRight.z;
    r.px = exitRight.x;
    r.py = exitRight.y;
    r.pz = exitRight.z;
  }

  // ─── Verlet integration ───────────────────────────────────────

  private integrate(dt: number): void {
    const { gravity, damping } = this.config;
    const gravDt2 = gravity * dt * dt;

    for (let i = 1; i < this.left.length; i++) {
      integrateParticle(this.left[i], damping, gravDt2);
      integrateParticle(this.right[i], damping, gravDt2);
    }
  }

  // ─── Spin-pull: extra downward force from roll momentum ────────

  /**
   * When the roll is spinning fast the paper should be flung downward
   * rather than floating. We add a velocity impulse that pushes
   * particles toward the floor, strongest near the roll and fading
   * out along the strip.
   */
  private applySpinPull(dt: number, spinRate: number): void {
    const absSpeed = Math.abs(spinRate);
    if (absSpeed < 0.5) return; // negligible spin

    const n = this.left.length;
    // Scale: at high spin the extra downward acceleration can reach
    // several multiples of base gravity.  The factor is tuned so that
    // a moderate flick already keeps the paper taut.
    const pullStrength = 120; // extra accel per rad/s of spin
    const maxAccel = pullStrength * absSpeed;

    for (let i = 1; i < n; i++) {
      // Fade from full strength at the roll (i=1) to 0 at the tip
      const t = 1 - (i - 1) / (n - 1);
      const accel = maxAccel * t * dt * dt;
      this.left[i].y -= accel;
      this.right[i].y -= accel;
    }
  }

  // ─── Structural constraints (along each chain) ────────────────

  private solveStructural(): void {
    const { segmentLength } = this.config;
    solveChainDistances(this.left, segmentLength);
    solveChainDistances(this.right, segmentLength);
  }

  // ─── Rung constraints (left-right across each row) ────────────

  private solveRungs(): void {
    const { paperWidth } = this.config;
    for (let i = 0; i < this.left.length; i++) {
      solveDistanceConstraint(this.left[i], this.right[i], paperWidth, i === 0);
    }
  }

  // ─── Bending constraints (skip-one along chains) ──────────────

  private solveBending(): void {
    const { bendingStiffness, segmentLength } = this.config;
    if (bendingStiffness <= 0) return;
    const restLength = segmentLength * 2;
    solveChainBending(this.left, restLength, bendingStiffness);
    solveChainBending(this.right, restLength, bendingStiffness);
  }

  // ─── Floor collision ──────────────────────────────────────────

  private solveFloor(): void {
    const { floorY, floorFriction } = this.config;
    for (let i = 1; i < this.left.length; i++) {
      clampToFloor(this.left[i], floorY, floorFriction);
      clampToFloor(this.right[i], floorY, floorFriction);
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function makeParticle(pos: Vec3): Particle {
  return { x: pos.x, y: pos.y, z: pos.z, px: pos.x, py: pos.y, pz: pos.z };
}

function integrateParticle(
  p: Particle,
  damping: number,
  gravDt2: number,
): void {
  if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) {
    p.x = p.px;
    p.y = p.py;
    p.z = p.pz;
    return;
  }

  const vx = (p.x - p.px) * damping;
  const vy = (p.y - p.py) * damping;
  const vz = (p.z - p.pz) * damping;
  p.px = p.x;
  p.py = p.y;
  p.pz = p.z;
  p.x += vx;
  p.y += vy + gravDt2;
  p.z += vz;
}

function solveDistanceConstraint(
  a: Particle,
  b: Particle,
  restLength: number,
  pinA: boolean,
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 1e-6) return;

  const correction = (dist - restLength) / dist;
  const cx = dx * correction * 0.5;
  const cy = dy * correction * 0.5;
  const cz = dz * correction * 0.5;

  if (pinA) {
    b.x -= cx * 2;
    b.y -= cy * 2;
    b.z -= cz * 2;
  } else {
    a.x += cx;
    a.y += cy;
    a.z += cz;
    b.x -= cx;
    b.y -= cy;
    b.z -= cz;
  }
}

function solveChainDistances(chain: Particle[], restLength: number): void {
  for (let i = 0; i < chain.length - 1; i++) {
    solveDistanceConstraint(chain[i], chain[i + 1], restLength, i === 0);
  }
}

function solveChainBending(
  chain: Particle[],
  restLength: number,
  stiffness: number,
): void {
  for (let i = 0; i < chain.length - 2; i++) {
    const a = chain[i];
    const c = chain[i + 2];

    const dx = c.x - a.x;
    const dy = c.y - a.y;
    const dz = c.z - a.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 1e-6) return;

    const correction = ((dist - restLength) / dist) * stiffness * 0.5;
    const cx = dx * correction;
    const cy = dy * correction;
    const cz = dz * correction;

    if (i === 0) {
      c.x -= cx * 2;
      c.y -= cy * 2;
      c.z -= cz * 2;
    } else {
      a.x += cx;
      a.y += cy;
      a.z += cz;
      c.x -= cx;
      c.y -= cy;
      c.z -= cz;
    }
  }
}

function clampToFloor(p: Particle, floorY: number, friction: number): void {
  if (p.y < floorY) {
    p.y = floorY;
    p.py = floorY;
    // Apply friction to horizontal velocity
    const vx = p.x - p.px;
    const vz = p.z - p.pz;
    p.px = p.x - vx * friction;
    p.pz = p.z - vz * friction;
  }
}
