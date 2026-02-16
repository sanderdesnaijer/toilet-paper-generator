"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  CylinderCollider,
} from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import {
  MAX_LENGTH_CM,
  CORE_RADIUS,
  OUTER_RADIUS,
  ROLL_WIDTH,
  CLOTH_MAX_ACTIVE_ROWS,
} from "@/constants";
import { ClothSimulation } from "@/hooks/useClothSimulation";

// ───────────────────────────── Types ─────────────────────────────

type PatternType =
  | "none"
  | "dots"
  | "stripes"
  | "grid"
  | "checkerboard"
  | "diamonds";

type RollPhysicsState = {
  angularVelocity: number;
  totalRotation: number;
  unrolledLength: number;
  isDragging: boolean;
};

// ───────────────────────────── Constants ─────────────────────────────

const PAPER_COLOR = "#f5f0e8";
const CORE_COLOR = "#8b7355";
const TEXTURE_SIZE = 512;
const FLOOR_SURFACE_Y = -3.5 + 0.08;

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

  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const alpha = clamp(darkness / 100, 0.05, 1);
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;

  const scale = TEXTURE_SIZE / 288;

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

// ───────────────── Radius Calculation ─────────────────────────────

function calculateRadius(unrolledLength: number, maxLengthCm: number): number {
  const fraction = 1 - unrolledLength / maxLengthCm;
  const outerArea = Math.PI * OUTER_RADIUS * OUTER_RADIUS;
  const coreArea = Math.PI * CORE_RADIUS * CORE_RADIUS;
  const currentArea = coreArea + (outerArea - coreArea) * fraction;
  return Math.sqrt(currentArea / Math.PI);
}

// ────────────────────────── Cloth Paper Mesh ──────────────────────────

// Pre-allocated buffer sizes (2 vertices per row: left + right)
const MAX_VERTS = CLOTH_MAX_ACTIVE_ROWS * 2;
const MAX_INDICES = (CLOTH_MAX_ACTIVE_ROWS - 1) * 6;

function ClothPaperMesh({
  clothRef,
  pattern,
  patternStrength,
  patternDarkness,
}: {
  clothRef: React.RefObject<ClothSimulation>;
  pattern: PatternType;
  patternStrength: number;
  patternDarkness: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const texture = useMemo(
    () => createPatternTexture(pattern, patternStrength, patternDarkness),
    [pattern, patternStrength, patternDarkness],
  );

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  // Pre-allocate geometry with fixed-size buffers once
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();

    const posAttr = new THREE.BufferAttribute(
      new Float32Array(MAX_VERTS * 3),
      3,
    );
    posAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", posAttr);

    const uvAttr = new THREE.BufferAttribute(
      new Float32Array(MAX_VERTS * 2),
      2,
    );
    uvAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("uv", uvAttr);

    const idxAttr = new THREE.BufferAttribute(new Uint16Array(MAX_INDICES), 1);
    idxAttr.setUsage(THREE.DynamicDrawUsage);
    g.setIndex(idxAttr);

    g.setDrawRange(0, 0);
    return g;
  }, []);

  useEffect(() => {
    return () => {
      geo.dispose();
    };
  }, [geo]);

  useFrame(() => {
    const cloth = clothRef.current;
    if (!cloth || !meshRef.current) return;

    const rowCount = cloth.rowCount;
    const visible = rowCount >= 2;
    meshRef.current.visible = visible;

    if (!visible) {
      geo.setDrawRange(0, 0);
      return;
    }

    // Copy cloth data into pre-allocated buffers
    const positions = cloth.getPositions();
    const uvs = cloth.getUVs();
    const indices = cloth.getIndices();

    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    (posAttr.array as Float32Array).set(positions);
    posAttr.needsUpdate = true;

    const uvAttr = geo.getAttribute("uv") as THREE.BufferAttribute;
    (uvAttr.array as Float32Array).set(uvs);
    uvAttr.needsUpdate = true;

    const idxAttr = geo.getIndex() as THREE.BufferAttribute;
    (idxAttr.array as Uint16Array).set(indices);
    idxAttr.needsUpdate = true;

    geo.setDrawRange(0, indices.length);
    geo.computeVertexNormals();

    if (matRef.current) {
      if (texture) {
        if (matRef.current.map !== texture) {
          matRef.current.map = texture;
          matRef.current.color.set("#ffffff");
          texture.repeat.set(1, 1);
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
    <mesh ref={meshRef} geometry={geo} visible={false}>
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

// ────────────────────────── Roll 3D Component ─────────────────────────

function Roll3D({
  stateRef,
  maxLengthCm,
  onRadiusChange,
  pattern,
  patternStrength,
  patternDarkness,
}: {
  stateRef: React.RefObject<RollPhysicsState>;
  maxLengthCm: number;
  onRadiusChange?: (radius: number) => void;
  pattern: PatternType;
  patternStrength: number;
  patternDarkness: number;
}) {
  const shellMeshRef = useRef<THREE.Mesh>(null);
  const shellMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const capRightRef = useRef<THREE.Mesh>(null);
  const capLeftRef = useRef<THREE.Mesh>(null);
  const lastRadiusRef = useRef<number>(-1);

  const rollTexture = useMemo(
    () => createPatternTexture(pattern, patternStrength, patternDarkness),
    [pattern, patternStrength, patternDarkness],
  );

  useEffect(() => {
    return () => {
      rollTexture?.dispose();
    };
  }, [rollTexture]);

  useFrame(() => {
    const state = stateRef.current;
    if (!state) return;

    const currentRadius = calculateRadius(state.unrolledLength, maxLengthCm);
    onRadiusChange?.(currentRadius);

    const hasPaper = currentRadius > CORE_RADIUS + 0.05;
    const radiusChanged = lastRadiusRef.current !== currentRadius;
    if (radiusChanged) {
      lastRadiusRef.current = currentRadius;
    }

    if (shellMeshRef.current) {
      shellMeshRef.current.visible = hasPaper;
      if (hasPaper && radiusChanged) {
        const old = shellMeshRef.current.geometry;
        shellMeshRef.current.geometry = new THREE.CylinderGeometry(
          currentRadius,
          currentRadius,
          ROLL_WIDTH,
          64,
          1,
          true,
        );
        old.dispose();
      }
    }

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
    <group>
      {/* Inner cardboard core */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[CORE_RADIUS, CORE_RADIUS, ROLL_WIDTH, 32]} />
        <meshStandardMaterial color={CORE_COLOR} roughness={0.8} />
      </mesh>

      {/* Paper layers (outer shell) */}
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

type CameraState = {
  theta: number;
  phi: number;
  radius: number;
  targetX: number;
  targetY: number;
  targetZ: number;
};

// Roll floats at this Y position (fixed in space)
const ROLL_Y = 13;

const INITIAL_CAMERA: CameraState = {
  theta: Math.atan2(-25.8, -20.7),
  phi: Math.acos(0.4 / Math.hypot(25.8, 0.4, 20.7)),
  radius: Math.hypot(25.8, 0.4, 20.7),
  targetX: 0,
  targetY: (ROLL_Y + FLOOR_SURFACE_Y) / 2, // look between roll and floor
  targetZ: 0,
};

function CameraController({
  cameraRef,
}: {
  cameraRef: React.RefObject<CameraState>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const s = cameraRef.current;
    if (!s) return;

    const x = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
    const y = s.radius * Math.cos(s.phi);
    const z = s.radius * Math.sin(s.phi) * Math.cos(s.theta);

    camera.position.set(x + s.targetX, y + s.targetY, z + s.targetZ);
    camera.lookAt(s.targetX, s.targetY, s.targetZ);
  });

  return null;
}

// ───────────────────────────── Floor ──────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function useFloorTexture() {
  return useMemo(() => {
    const rand = seededRandom(12345);
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const tileSize = size / 4;
    const groutWidth = 2;

    ctx.fillStyle = "#4a4440";
    ctx.fillRect(0, 0, size, size);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * tileSize + groutWidth;
        const y = row * tileSize + groutWidth;
        const w = tileSize - groutWidth * 2;
        const h = tileSize - groutWidth * 2;

        const lightness = 48 + Math.sin(row * 3.7 + col * 5.1) * 3;
        ctx.fillStyle = `hsl(35, 12%, ${lightness}%)`;
        ctx.fillRect(x, y, w, h);

        for (let i = 0; i < 40; i++) {
          const nx = x + rand() * w;
          const ny = y + rand() * h;
          const alpha = 0.03 + rand() * 0.04;
          ctx.fillStyle = `rgba(0,0,0,${alpha})`;
          ctx.fillRect(nx, ny, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function Floor() {
  const tileTexture = useFloorTexture();

  useEffect(() => {
    return () => {
      tileTexture.dispose();
    };
  }, [tileTexture]);

  return (
    <RigidBody type="fixed" position={[0, -4, 0]}>
      <CuboidCollider args={[50, 0.5, 50]} friction={1.0} restitution={0.05} />
      <mesh receiveShadow>
        <boxGeometry args={[100, 1, 100]} />
        <meshStandardMaterial
          map={tileTexture}
          roughness={0.85}
          metalness={0.02}
        />
      </mesh>
    </RigidBody>
  );
}

// ───────────────────────────── Scene ──────────────────────────────

const _exitDir = new THREE.Vector3();
const _exitCenter = new THREE.Vector3();
const _exitLeft = new THREE.Vector3();
const _exitRight = new THREE.Vector3();
const _rollPos = new THREE.Vector3();
const _rightDir = new THREE.Vector3();

function Scene({
  stateRef,
  cameraRef,
  rollBodyRef,
  dragRef,
  maxLengthCm,
  onUpdate,
  pattern = "none",
  patternStrength = 50,
  patternDarkness = 100,
}: {
  stateRef: React.RefObject<RollPhysicsState>;
  cameraRef: React.RefObject<CameraState>;
  rollBodyRef: React.RefObject<RapierRigidBody | null>;
  dragRef: React.RefObject<{
    isDragging: boolean;
    deltaY: number;
    clientX: number;
    clientY: number;
  }>;
  maxLengthCm: number;
  onUpdate: (state: RollPhysicsState) => void;
  pattern?: PatternType;
  patternStrength?: number;
  patternDarkness?: number;
}) {
  const radiusRef = useRef(OUTER_RADIUS);
  const clothRef = useRef(new ClothSimulation({ floorY: FLOOR_SURFACE_Y }));
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  const handleRadiusChange = useCallback((r: number) => {
    radiusRef.current = r;
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const body = rollBodyRef.current;
    if (!body) return;

    const drag = dragRef.current;
    const s = stateRef.current;
    if (!s) return;

    // ── Drag controller — gentle torque from pointer movement ──
    if (drag.isDragging && drag.deltaY !== 0) {
      body.wakeUp();
      const currentAngVel = body.angvel();
      const torqueImpulse = drag.deltaY * 0.15;
      body.setAngvel({ x: currentAngVel.x + torqueImpulse, y: 0, z: 0 }, true);
      drag.deltaY = 0;
    }

    // ── Track rotation from Rapier body ──
    const angVel = body.angvel();
    const spinRate = angVel.x;
    s.angularVelocity = spinRate;
    s.totalRotation += spinRate * delta;
    s.isDragging = drag.isDragging;

    // ── Convert rotation to unrolled length ──
    const currentRadius = calculateRadius(s.unrolledLength, maxLengthCm);
    const lengthDelta = spinRate * currentRadius * delta;
    s.unrolledLength = Math.max(
      0,
      Math.min(maxLengthCm, s.unrolledLength + lengthDelta),
    );

    // ── Compute paper exit point from roll body ──
    const rollTranslation = body.translation();
    const rollRotation = body.rotation();

    _rollPos.set(rollTranslation.x, rollTranslation.y, rollTranslation.z);

    // Extract the clean rotation angle around the X axis from the quaternion.
    // This ignores any tiny Y/Z perturbations from the physics solver that
    // caused the exit point to jitter left-to-right when applying the full
    // quaternion.
    const exitAngle = 2 * Math.atan2(rollRotation.x, rollRotation.w);
    _exitDir.set(0, -Math.cos(exitAngle), -Math.sin(exitAngle));
    _exitCenter.copy(_exitDir).multiplyScalar(currentRadius).add(_rollPos);

    // Roll axis is always world-X (body only rotates around X), so the
    // left/right span direction is constant.
    const halfW = ROLL_WIDTH / 2;
    _rightDir.set(1, 0, 0);
    _exitLeft.copy(_exitCenter).addScaledVector(_rightDir, -halfW);
    _exitRight.copy(_exitCenter).addScaledVector(_rightDir, halfW);

    // ── Spawn/despawn cloth rows based on unrolled length ──
    const cloth = clothRef.current;
    const targetRows = Math.max(1, Math.floor(s.unrolledLength / 1.0) + 1);

    // Spawn rows
    while (cloth.rowCount < targetRows && s.unrolledLength > 0.5) {
      cloth.spawnRow(
        { x: _exitLeft.x, y: _exitLeft.y, z: _exitLeft.z },
        { x: _exitRight.x, y: _exitRight.y, z: _exitRight.z },
      );
    }

    // Despawn rows when rolling back
    while (cloth.rowCount > targetRows && cloth.rowCount > 1) {
      cloth.despawnRow();
    }

    // If fully rolled back, reset
    if (s.unrolledLength < 0.5) {
      cloth.reset();
    }

    // ── Step cloth simulation ──
    if (cloth.rowCount > 0) {
      cloth.update(
        delta,
        { x: _exitLeft.x, y: _exitLeft.y, z: _exitLeft.z },
        { x: _exitRight.x, y: _exitRight.y, z: _exitRight.z },
        spinRate,
      );
    }

    onUpdateRef.current({ ...s });
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} />

      <Physics gravity={[0, -981, 0]}>
        <Floor />
        <RigidBody
          ref={rollBodyRef}
          position={[0, ROLL_Y, 0]}
          angularDamping={2.5}
          linearDamping={0.5}
          enabledTranslations={[false, false, false]}
          enabledRotations={[true, false, false]}
        >
          <CylinderCollider
            args={[ROLL_WIDTH / 2, OUTER_RADIUS]}
            rotation={[0, 0, Math.PI / 2]}
            friction={1.0}
            restitution={0.1}
            density={0.5}
          />
          <Roll3D
            stateRef={stateRef}
            maxLengthCm={maxLengthCm}
            onRadiusChange={handleRadiusChange}
            pattern={pattern}
            patternStrength={patternStrength}
            patternDarkness={patternDarkness}
          />
        </RigidBody>
      </Physics>

      {/* Cloth paper mesh (rendered outside Physics since it uses custom Verlet) */}
      <ClothPaperMesh
        clothRef={clothRef}
        pattern={pattern}
        patternStrength={patternStrength}
        patternDarkness={patternDarkness}
      />

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

  const stateRef = useRef<RollPhysicsState>({
    angularVelocity: 0,
    totalRotation: 0,
    unrolledLength: 0,
    isDragging: false,
  });

  const rollBodyRef = useRef<RapierRigidBody>(null);

  const dragRef = useRef({
    isDragging: false,
    deltaY: 0,
    clientX: 0,
    clientY: 0,
  });

  const cameraRef = useRef<CameraState>({ ...INITIAL_CAMERA });

  const dragMode = useRef<"none" | "unroll" | "orbit" | "pan">("none");
  const lastPointer = useRef({ x: 0, y: 0 });

  const handleUpdate = useCallback(
    (state: RollPhysicsState) => {
      setRollState(state);
      onLengthChange(Math.round(state.unrolledLength * 10) / 10);
    },
    [onLengthChange],
  );

  // Sync external length changes (from manual input)
  useEffect(() => {
    if (externalLength !== undefined) {
      stateRef.current.unrolledLength = Math.max(
        0,
        Math.min(maxLengthCm, externalLength),
      );
      stateRef.current.angularVelocity = 0;
      if (rollBodyRef.current) {
        rollBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
      handleUpdate({ ...stateRef.current });
    }
  }, [externalLength, maxLengthCm, handleUpdate]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
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
      dragRef.current.isDragging = true;
      dragRef.current.deltaY = 0;
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };

    const mode = dragMode.current;

    if (mode === "unroll") {
      dragRef.current.deltaY += dy;
      dragRef.current.clientX = e.clientX;
      dragRef.current.clientY = e.clientY;
    } else if (mode === "orbit") {
      const cam = cameraRef.current;
      cam.theta -= dx * 0.005;
      cam.phi = Math.max(0.2, Math.min(Math.PI - 0.2, cam.phi + dy * 0.005));
    } else if (mode === "pan") {
      const cam = cameraRef.current;
      cam.targetX -= dx * 0.03;
      cam.targetY += dy * 0.03;
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (dragMode.current === "unroll") {
      dragRef.current.isDragging = false;
    }
    dragMode.current = "none";
  }, []);

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
            stateRef={stateRef}
            cameraRef={cameraRef}
            rollBodyRef={rollBodyRef}
            dragRef={dragRef}
            maxLengthCm={maxLengthCm}
            onUpdate={handleUpdate}
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

      {/* HUD overlay */}
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
