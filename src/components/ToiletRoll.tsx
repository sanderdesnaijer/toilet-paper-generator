"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import {
  useRollPhysics,
  calculateRadius,
  type RollPhysicsState,
  type RollPhysicsConfig,
} from "@/hooks/useRollPhysics";
import { MAX_LENGTH_CM } from "@/constants";

// ───────────────────────────── Types ─────────────────────────────

type PatternType =
  | "none"
  | "dots"
  | "stripes"
  | "grid"
  | "checkerboard"
  | "diamonds";

// ───────────────────────────── Constants ─────────────────────────────

const CORE_RADIUS = 2.0;
const OUTER_RADIUS = 5.5;
const ROLL_WIDTH = 4.0;
// MAX_LENGTH_CM is imported from @/constants
const PAPER_COLOR = "#f5f0e8";
const CORE_COLOR = "#8b7355";
const TEXTURE_SIZE = 512;
// Perforation every ~11cm (standard sheet length)

// ───────────────── Pattern Texture Generator ─────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createPatternTexture(
  pattern: PatternType,
  strength: number,
  darkness: number,
): THREE.CanvasTexture | null {
  if (pattern === "none") return null;

  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Paper background
  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const alpha = clamp(darkness / 100, 0.05, 1);
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;

  const scale = TEXTURE_SIZE / 288; // Scale relative to the SVG preview size

  if (pattern === "dots") {
    const spacing =
      clamp(Math.round(20 - (strength * 16) / 100), 4, 20) * scale;
    const r = clamp(Math.round(1 + (strength * 2) / 100), 1, 3) * scale;
    for (let x = spacing / 2; x < TEXTURE_SIZE; x += spacing) {
      for (let y = spacing / 2; y < TEXTURE_SIZE; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === "stripes") {
    const period = clamp(Math.round(18 - (strength * 14) / 100), 4, 18) * scale;
    const thickness = clamp(Math.round(1 + (strength * 2) / 100), 1, 4) * scale;
    for (let y = 0; y < TEXTURE_SIZE; y += period) {
      ctx.fillRect(0, y, TEXTURE_SIZE, thickness);
    }
  } else if (pattern === "grid") {
    const period = clamp(Math.round(18 - (strength * 14) / 100), 4, 18) * scale;
    const thickness = clamp(Math.round(1 + (strength * 2) / 100), 1, 4) * scale;
    for (let y = 0; y < TEXTURE_SIZE; y += period) {
      ctx.fillRect(0, y, TEXTURE_SIZE, thickness);
    }
    for (let x = 0; x < TEXTURE_SIZE; x += period) {
      ctx.fillRect(x, 0, thickness, TEXTURE_SIZE);
    }
  } else if (pattern === "checkerboard") {
    const size = clamp(Math.round(16 - (strength * 12) / 100), 4, 16) * scale;
    for (let x = 0; x < TEXTURE_SIZE; x += size * 2) {
      for (let y = 0; y < TEXTURE_SIZE; y += size * 2) {
        ctx.fillRect(x, y, size, size);
        ctx.fillRect(x + size, y + size, size, size);
      }
    }
  } else if (pattern === "diamonds") {
    const size = clamp(Math.round(24 - (strength * 18) / 100), 8, 24) * scale;
    const half = size / 2;
    for (let x = 0; x < TEXTURE_SIZE; x += size) {
      for (let y = 0; y < TEXTURE_SIZE; y += size) {
        ctx.beginPath();
        ctx.moveTo(x + half, y);
        ctx.lineTo(x + size, y + half);
        ctx.lineTo(x + half, y + size);
        ctx.lineTo(x, y + half);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

// ────────────────────────── Paper Trail Mesh ──────────────────────────

function buildTrailGeometry(trailLength: number): THREE.BufferGeometry {
  // Cap segment count for performance — trail is mostly straight so
  // high density is only needed in the curve zone near the roll
  const segments = Math.min(80, Math.max(20, Math.ceil(trailLength * 0.5)));
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Gentle curve only in a small section near the roll exit
  const curveZone = Math.min(3, trailLength * 0.3);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = -t * trailLength;

    const distFromTop = t * trailLength;
    const z =
      distFromTop < curveZone
        ? Math.sin((distFromTop / curveZone) * Math.PI * 0.5) * 0.5
        : 0.5;

    // UV anchored to the leading edge (bottom) so the pattern
    // scrolls with the paper as it unrolls from the roll
    const v = (trailLength - distFromTop) / ROLL_WIDTH;

    vertices.push(-ROLL_WIDTH / 2, y, z);
    normals.push(0, 0, -1);
    uvs.push(0, v);

    vertices.push(ROLL_WIDTH / 2, y, z);
    normals.push(0, 0, -1);
    uvs.push(1, v);

    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function PaperTrail({
  stateRef,
  pattern,
  patternStrength,
  patternDarkness,
}: {
  stateRef: React.RefObject<RollPhysicsState>;
  pattern: PatternType;
  patternStrength: number;
  patternDarkness: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  // Own texture for the trail
  const trailTexture = useMemo(() => {
    return createPatternTexture(pattern, patternStrength, patternDarkness);
  }, [pattern, patternStrength, patternDarkness]);

  useEffect(() => {
    return () => {
      trailTexture?.dispose();
    };
  }, [trailTexture]);

  // Imperatively update geometry + material every frame
  // Reads directly from stateRef for real-time updates during inertia
  useFrame(() => {
    if (!meshRef.current) return;

    const state = stateRef.current;
    if (!state) return;

    // 1:1 scale — trail length in cm matches scene units so
    // paper exit speed equals roll surface speed
    const trailLength = state.unrolledLength;

    const visible = trailLength >= 0.5;
    meshRef.current.visible = visible;

    if (visible) {
      const old = meshRef.current.geometry;
      meshRef.current.geometry = buildTrailGeometry(trailLength);
      old.dispose();
    }

    if (matRef.current) {
      if (trailTexture) {
        if (matRef.current.map !== trailTexture) {
          matRef.current.map = trailTexture;
          matRef.current.color.set("#ffffff");
          // Repeat is (1,1) — tiling is handled by absolute UVs in geometry
          trailTexture.repeat.set(1, 1);
          matRef.current.needsUpdate = true;
        }
      } else {
        if (matRef.current.map !== null) {
          matRef.current.map = null;
          matRef.current.color.set(PAPER_COLOR);
          matRef.current.needsUpdate = true;
        }
      }
    }
  });

  return (
    <mesh ref={meshRef} visible={false}>
      <bufferGeometry />
      <meshStandardMaterial
        ref={matRef}
        color={PAPER_COLOR}
        side={THREE.DoubleSide}
        roughness={0.9}
        metalness={0}
        envMapIntensity={0}
      />
    </mesh>
  );
}

// ───────────────── Perforation Lines on the Paper Strip ──────────────

function PerforationLines({ unrolledLength }: { unrolledLength: number }) {
  // 1:1 scale — unrolledLength is in cm, scene units are cm
  const trailLength = unrolledLength;
  if (trailLength < 5) return null;

  const sheetLength = 11; // 11 cm per sheet
  const curveZone = Math.min(3, trailLength * 0.3);
  const lines: number[] = [];

  let pos = sheetLength;
  while (pos < trailLength) {
    lines.push(pos);
    pos += sheetLength;
  }

  return (
    <group>
      {lines.map((y, i) => {
        const distFromTop = y;
        const z =
          distFromTop < curveZone
            ? Math.sin((distFromTop / curveZone) * Math.PI * 0.5) * 0.5 + 0.01
            : 0.51;
        return (
          <mesh key={i} position={[0, -y, z]}>
            <planeGeometry args={[ROLL_WIDTH * 0.95, 0.04]} />
            <meshBasicMaterial
              color="#ccc"
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ────────────────────── Roll 3D Component ─────────────────────────

function Roll3D({
  stateRef,
  fullConfig,
  onRadiusChange,
  pattern,
  patternStrength,
  patternDarkness,
}: {
  stateRef: React.RefObject<RollPhysicsState>;
  fullConfig: RollPhysicsConfig & Partial<RollPhysicsConfig>;
  onRadiusChange?: (radius: number) => void;
  pattern: PatternType;
  patternStrength: number;
  patternDarkness: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shellMeshRef = useRef<THREE.Mesh>(null);
  const shellMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const capRightRef = useRef<THREE.Mesh>(null);
  const capLeftRef = useRef<THREE.Mesh>(null);
  const lastRadiusRef = useRef<number>(-1);

  // Own texture for the roll outer shell
  const rollTexture = useMemo(() => {
    return createPatternTexture(pattern, patternStrength, patternDarkness);
  }, [pattern, patternStrength, patternDarkness]);

  useEffect(() => {
    return () => {
      rollTexture?.dispose();
    };
  }, [rollTexture]);

  // Imperatively update geometry, material, and caps every frame
  // Reads directly from stateRef so updates happen every animation frame,
  // not just on React re-renders
  useFrame(() => {
    const state = stateRef.current;
    if (!state) return;

    const currentRadius = calculateRadius(state.unrolledLength, fullConfig);

    if (groupRef.current) {
      groupRef.current.rotation.x = -state.totalRotation;
    }
    onRadiusChange?.(currentRadius);

    const hasPaper = currentRadius > CORE_RADIUS + 0.05;
    const radiusChanged = lastRadiusRef.current !== currentRadius;
    if (radiusChanged) {
      lastRadiusRef.current = currentRadius;
    }

    // Update outer shell geometry (only when radius changes)
    if (shellMeshRef.current) {
      shellMeshRef.current.visible = hasPaper;
      if (hasPaper && radiusChanged) {
        const old = shellMeshRef.current.geometry;
        const geo = new THREE.CylinderGeometry(
          currentRadius,
          currentRadius,
          ROLL_WIDTH,
          64,
          1,
          true,
        );
        shellMeshRef.current.geometry = geo;
        old.dispose();
      }
    }

    // Update material texture + repeat
    if (shellMatRef.current) {
      if (rollTexture) {
        if (shellMatRef.current.map !== rollTexture) {
          shellMatRef.current.map = rollTexture;
          shellMatRef.current.color.set("#ffffff");
          shellMatRef.current.needsUpdate = true;
        }
        if (radiusChanged) {
          const circumference = 2 * Math.PI * currentRadius;
          const repeatU = Math.max(1, Math.round(circumference / ROLL_WIDTH));
          rollTexture.repeat.set(repeatU, 1);
        }
      } else {
        if (shellMatRef.current.map !== null) {
          shellMatRef.current.map = null;
          shellMatRef.current.color.set(PAPER_COLOR);
          shellMatRef.current.needsUpdate = true;
        }
      }
    }

    // Update end cap geometries (only when radius changes)
    if (capRightRef.current) {
      capRightRef.current.visible = hasPaper;
      if (hasPaper && radiusChanged) {
        const old = capRightRef.current.geometry;
        capRightRef.current.geometry = new THREE.RingGeometry(
          CORE_RADIUS,
          currentRadius,
          64,
        );
        old.dispose();
      }
    }
    if (capLeftRef.current) {
      capLeftRef.current.visible = hasPaper;
      if (hasPaper && radiusChanged) {
        const old = capLeftRef.current.geometry;
        capLeftRef.current.geometry = new THREE.RingGeometry(
          CORE_RADIUS,
          currentRadius,
          64,
        );
        old.dispose();
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Inner cardboard core */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[CORE_RADIUS, CORE_RADIUS, ROLL_WIDTH, 32]} />
        <meshStandardMaterial color={CORE_COLOR} roughness={0.8} />
      </mesh>

      {/* Paper layers (outer shell) — pattern is shown here */}
      <mesh ref={shellMeshRef} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry
          args={[OUTER_RADIUS, OUTER_RADIUS, ROLL_WIDTH, 64, 1, true]}
        />
        <meshStandardMaterial
          ref={shellMatRef}
          color={PAPER_COLOR}
          roughness={0.95}
          metalness={0}
          envMapIntensity={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* End caps */}
      <mesh
        ref={capRightRef}
        position={[ROLL_WIDTH / 2, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <ringGeometry args={[CORE_RADIUS, OUTER_RADIUS, 64]} />
        <meshStandardMaterial
          color={PAPER_COLOR}
          roughness={0.9}
          envMapIntensity={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        ref={capLeftRef}
        position={[-ROLL_WIDTH / 2, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <ringGeometry args={[CORE_RADIUS, OUTER_RADIUS, 64]} />
        <meshStandardMaterial
          color={PAPER_COLOR}
          roughness={0.9}
          envMapIntensity={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ──────────────── Manual Camera Controller ───────────────────────
//
// Reads from a shared cameraRef (spherical coords) set by the
// wrapper div's pointer handlers. No OrbitControls needed.

type CameraState = {
  theta: number; // horizontal angle (radians)
  phi: number; // vertical angle (radians)
  radius: number; // distance from target
  panX: number; // horizontal pan offset
  panY: number; // vertical pan offset
};

// Spherical coords derived from default position [-25.8, 2.4, -20.7] with lookAt (0, 2, 0)
const INITIAL_CAMERA: CameraState = {
  theta: Math.atan2(-25.8, -20.7),
  phi: Math.acos(0.4 / Math.hypot(25.8, 0.4, 20.7)),
  radius: Math.hypot(25.8, 0.4, 20.7),
  panX: 0,
  panY: 2, // look at roll center
};

function CameraController({
  cameraRef,
}: {
  cameraRef: React.RefObject<CameraState>;
}) {
  const { camera } = useThree();
  const lastLog = useRef("");

  useFrame(() => {
    const s = cameraRef.current;
    if (!s) return;

    // Spherical to cartesian
    const x = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
    const y = s.radius * Math.cos(s.phi);
    const z = s.radius * Math.sin(s.phi) * Math.cos(s.theta);

    camera.position.set(x + s.panX, y + s.panY, z);
    camera.lookAt(s.panX, s.panY, 0);

    // Log position changes
    const pos = `[${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}]`;
    if (pos !== lastLog.current) {
      lastLog.current = pos;
      console.log("Camera position:", pos);
    }
  });

  return null;
}

// ───────────────────────────── Scene ──────────────────────────────

function Scene({
  state,
  stateRef,
  config,
  cameraRef,
  pattern = "none",
  patternStrength = 50,
  patternDarkness = 100,
}: {
  state: RollPhysicsState;
  stateRef: React.RefObject<RollPhysicsState>;
  config: Partial<RollPhysicsConfig>;
  cameraRef: React.RefObject<CameraState>;
  pattern?: PatternType;
  patternStrength?: number;
  patternDarkness?: number;
}) {
  const trailGroupRef = useRef<THREE.Group>(null);
  const radiusRef = useRef(OUTER_RADIUS);

  const fullConfig = useMemo(
    () => ({
      maxLengthCm: MAX_LENGTH_CM,
      friction: 0.92,
      sensitivity: 0.008,
      paperThicknessCm: 0.01,
      coreRadiusCm: CORE_RADIUS,
      outerRadiusCm: OUTER_RADIUS,
      ...config,
    }),
    [config],
  );

  const handleRadiusChange = useCallback((r: number) => {
    radiusRef.current = r;
  }, []);

  useFrame(() => {
    if (trailGroupRef.current) {
      trailGroupRef.current.position.set(0, 2, -radiusRef.current);
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} />

      <group position={[0, 2, 0]}>
        <Roll3D
          stateRef={stateRef}
          fullConfig={fullConfig}
          onRadiusChange={handleRadiusChange}
          pattern={pattern}
          patternStrength={patternStrength}
          patternDarkness={patternDarkness}
        />
      </group>

      {/* Paper trail dropping from the back of the roll (270°) */}
      <group ref={trailGroupRef} position={[0, 2, -OUTER_RADIUS]}>
        <PaperTrail
          stateRef={stateRef}
          pattern={pattern}
          patternStrength={patternStrength}
          patternDarkness={patternDarkness}
        />
        <PerforationLines unrolledLength={state.unrolledLength} />
      </group>

      <CameraController cameraRef={cameraRef} />
      <Environment preset="studio" />
    </>
  );
}

// ────────────────────── Main Exported Component ──────────────────────

type ToiletRollProps = {
  onLengthChange: (lengthCm: number) => void;
  externalLength?: number;
  maxLengthCm?: number;
  pattern?: PatternType;
  patternStrength?: number;
  patternDarkness?: number;
};

export function ToiletRoll({
  onLengthChange,
  externalLength,
  maxLengthCm = MAX_LENGTH_CM,
  pattern = "none",
  patternStrength = 50,
  patternDarkness = 100,
}: ToiletRollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rollState, setRollState] = useState<RollPhysicsState>({
    angularVelocity: 0,
    totalRotation: 0,
    unrolledLength: 0,
    isDragging: false,
  });

  // Camera state — shared with CameraController inside the Canvas
  const cameraRef = useRef<CameraState>({ ...INITIAL_CAMERA });

  // Track what the current drag is doing
  const dragMode = useRef<"none" | "unroll" | "orbit" | "pan">("none");
  const lastPointer = useRef({ x: 0, y: 0 });

  const config: Partial<RollPhysicsConfig> = {
    maxLengthCm,
    coreRadiusCm: CORE_RADIUS,
    outerRadiusCm: OUTER_RADIUS,
  };

  const handleUpdate = useCallback(
    (state: RollPhysicsState) => {
      setRollState(state);
      onLengthChange(Math.round(state.unrolledLength * 10) / 10);
    },
    [onLengthChange],
  );

  const {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    setUnrolledLength,
    stateRef,
  } = useRollPhysics(handleUpdate, config);

  // Sync external length changes (from manual input)
  useEffect(() => {
    if (externalLength !== undefined) {
      setUnrolledLength(externalLength);
    }
  }, [externalLength, setUnrolledLength]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      lastPointer.current = { x: e.clientX, y: e.clientY };

      if (e.shiftKey) {
        dragMode.current = "orbit";
      } else if (e.altKey) {
        dragMode.current = "pan";
      } else {
        dragMode.current = "unroll";
        onPointerDown(e.clientY);
      }
    },
    [onPointerDown],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      const mode = dragMode.current;

      if (mode === "unroll") {
        onPointerMove(e.clientY);
      } else if (mode === "orbit") {
        const cam = cameraRef.current;
        cam.theta -= dx * 0.005;
        cam.phi = Math.max(0.2, Math.min(Math.PI - 0.2, cam.phi + dy * 0.005));
      } else if (mode === "pan") {
        const cam = cameraRef.current;
        cam.panX -= dx * 0.03;
        cam.panY += dy * 0.03;
      }
    },
    [onPointerMove],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      if (dragMode.current === "unroll") {
        onPointerUp();
      }
      dragMode.current = "none";
    },
    [onPointerUp],
  );

  // Scroll to zoom – use native listener with { passive: false } so
  // preventDefault() works (React registers wheel as passive by default).
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = canvasWrapperRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      cam.radius = Math.max(5, Math.min(500, cam.radius + e.deltaY * 0.05));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const percentage = Math.round((rollState.unrolledLength / maxLengthCm) * 100);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* 3D Canvas */}
      <div
        ref={canvasWrapperRef}
        className="relative aspect-square w-full cursor-grab select-none overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-100 to-zinc-200 active:cursor-grabbing dark:from-zinc-800 dark:to-zinc-900"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: "none" }}
      >
        <Canvas
          camera={{
            fov: 35,
            near: 0.1,
            far: 1000,
          }}
        >
          <Scene
            state={rollState}
            stateRef={stateRef}
            config={config}
            cameraRef={cameraRef}
            pattern={pattern}
            patternStrength={patternStrength}
            patternDarkness={patternDarkness}
          />
        </Canvas>

        {/* Drag hint overlay */}
        {rollState.unrolledLength === 0 && !rollState.isDragging && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-6">
            <div className="animate-bounce rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              Drag down to unroll &bull; Shift+drag to orbit &bull; Alt+drag to
              pan
            </div>
          </div>
        )}
      </div>

      {/* HUD overlay — unrolled length */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1">
        <div className="rounded-lg bg-black/60 px-3 py-1.5 text-lg font-bold tabular-nums text-white backdrop-blur-sm">
          {rollState.unrolledLength.toFixed(1)} cm
        </div>
        <div className="rounded-lg bg-black/40 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
          {percentage}% unrolled
        </div>
      </div>

      {/* Velocity indicator */}
      {Math.abs(rollState.angularVelocity) > 0.5 && (
        <div className="pointer-events-none absolute right-4 top-4">
          <div className="rounded-lg bg-amber-500/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            Spinning...
          </div>
        </div>
      )}
    </div>
  );
}
