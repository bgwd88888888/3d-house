"use client";

/**
 * 合院外墙山水：
 * - 南门两侧：长幅无框，边缘渐变透明
 * - 北墙三幅、东西墙各四幅：带画框、均匀间隔，国画不重复
 */
import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import {
  COMPOUND_DEPTH,
  COMPOUND_HALF_X,
  COMPOUND_HALF_Z,
  COMPOUND_WIDTH,
  GATE_OPENING_W,
} from "@/lib/geoCompound";

const SOUTH_MURAL_URL = "/textures/wall-mural/shanshui.png";

/** 画框用公有领域竖轴国画（Wikimedia Commons） */
const FRAMED_MURAL_URLS = [
  "/textures/wall-mural/guohua-01.jpg", // 李成《晴峦萧寺》
  "/textures/wall-mural/guohua-02.jpg", // 马远《踏歌图》
  "/textures/wall-mural/guohua-03.jpg", // 周季常《天台山石桥》
  "/textures/wall-mural/guohua-04.jpg", // 八大山人《仿倪瓒山水》
  "/textures/wall-mural/guohua-05.jpg", // 范宽《溪山行旅》
  "/textures/wall-mural/guohua-06.jpg", // 郭熙《早春图》
  "/textures/wall-mural/guohua-07.jpg", // 陈录《梅花》
  "/textures/wall-mural/guohua-08.jpg", // 《浸月图》梅月
  "/textures/wall-mural/guohua-09.jpg", // 仿李成《寒林》
  "/textures/wall-mural/guohua-10.jpg", // 《寒林钟馗》
  "/textures/wall-mural/guohua-11.jpg", // 沈南苹《雪梅双兔》
] as const;

const WALL_H = 4.0;
const FOUNDATION_H = 0.35;
const OUTSET = 0.04;

/** 南墙长幅 */
const SOUTH_ART_H = WALL_H - 1.05;
const SOUTH_ART_Y = FOUNDATION_H + 0.42 + SOUTH_ART_H * 0.5;
const FADE_U = 0.1;
const FADE_V = 0.12;

/** 侧墙 / 北墙画框竖幅 */
const FRAME_ART_W = 3.6;
const FRAME_ART_H = WALL_H - 1.15;
const FRAME_ART_Y = FOUNDATION_H + 0.5 + FRAME_ART_H * 0.5;
const FRAME_BORDER = 0.22;
const NORTH_COUNT = 3;
const SIDE_COUNT = 4;

type SoftPanel = {
  id: string;
  position: [number, number, number];
  rotationY: number;
  width: number;
  height: number;
};

type FramedPanel = SoftPanel & {
  framed: true;
  textureIndex: number;
};

function createEdgeFadeAlphaMap() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const ax = Math.min(u / FADE_U, (1 - u) / FADE_U, 1);
      const ay = Math.min(v / FADE_V, (1 - v) / FADE_V, 1);
      const a = Math.max(0, Math.min(1, ax * ay));
      const i = (y * size + x) * 4;
      const c = Math.round(a * 255);
      img.data[i] = c;
      img.data[i + 1] = c;
      img.data[i + 2] = c;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** 在可用跨度内均匀排布 count 幅画的中心坐标 */
function spacedCenters(span: number, count: number): number[] {
  if (count <= 1) return [0];
  const step = span / (count + 1);
  return Array.from({ length: count }, (_, i) => -span * 0.5 + step * (i + 1));
}

function buildSouthSoftPanels(): SoftPanel[] {
  const southZ = COMPOUND_HALF_Z + OUTSET;
  const sideW = (COMPOUND_WIDTH - GATE_OPENING_W) * 0.5;
  const artW = Math.min(sideW * 0.72, 12);
  const centerX = GATE_OPENING_W * 0.5 + sideW * 0.5;

  return [
    {
      id: "south-left",
      position: [-centerX, SOUTH_ART_Y, southZ],
      rotationY: 0,
      width: artW,
      height: SOUTH_ART_H,
    },
    {
      id: "south-right",
      position: [centerX, SOUTH_ART_Y, southZ],
      rotationY: 0,
      width: artW,
      height: SOUTH_ART_H,
    },
  ];
}

function buildFramedPanels(): FramedPanel[] {
  const northZ = -COMPOUND_HALF_Z - OUTSET;
  const eastX = COMPOUND_HALF_X + OUTSET;
  const westX = -COMPOUND_HALF_X - OUTSET;
  const panels: FramedPanel[] = [];
  let textureIndex = 0;
  const nextTex = () => {
    const i = textureIndex % FRAMED_MURAL_URLS.length;
    textureIndex += 1;
    return i;
  };

  // 北墙：沿 X，三幅均匀
  const northMargin = 2.5;
  for (const x of spacedCenters(COMPOUND_WIDTH - northMargin * 2, NORTH_COUNT)) {
    panels.push({
      id: `north-${x.toFixed(1)}`,
      position: [x, FRAME_ART_Y, northZ],
      rotationY: Math.PI,
      width: FRAME_ART_W,
      height: FRAME_ART_H,
      framed: true,
      textureIndex: nextTex(),
    });
  }

  // 东 / 西墙：沿 Z，各四幅均匀（交错取图，避免左右对望同画）
  const sideMargin = 3.5;
  const sideCenters = spacedCenters(
    COMPOUND_DEPTH - sideMargin * 2,
    SIDE_COUNT,
  );
  for (const z of sideCenters) {
    panels.push({
      id: `east-${z.toFixed(1)}`,
      position: [eastX, FRAME_ART_Y, z],
      rotationY: Math.PI / 2,
      width: FRAME_ART_W,
      height: FRAME_ART_H,
      framed: true,
      textureIndex: nextTex(),
    });
    panels.push({
      id: `west-${z.toFixed(1)}`,
      position: [westX, FRAME_ART_Y, z],
      rotationY: -Math.PI / 2,
      width: FRAME_ART_W,
      height: FRAME_ART_H,
      framed: true,
      textureIndex: nextTex(),
    });
  }

  return panels;
}

function configureMap(map: THREE.Texture) {
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.needsUpdate = true;
}

function SoftMural({
  panel,
  map,
  alphaMap,
}: {
  panel: SoftPanel;
  map: THREE.Texture;
  alphaMap: THREE.Texture;
}) {
  const { position, rotationY, width, height } = panel;
  return (
    <mesh
      position={position}
      rotation={[0, rotationY, 0]}
      castShadow
      receiveShadow
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={map}
        alphaMap={alphaMap}
        transparent
        depthWrite={false}
        roughness={0.88}
        metalness={0.02}
        envMapIntensity={0.22}
        color="#f7f2e8"
      />
    </mesh>
  );
}

function FramedMural({
  panel,
  map,
}: {
  panel: FramedPanel;
  map: THREE.Texture;
}) {
  const { position, rotationY, width, height } = panel;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, -0.01]} receiveShadow>
        <planeGeometry
          args={[width + FRAME_BORDER * 2, height + FRAME_BORDER * 2]}
        />
        <meshStandardMaterial
          color="#5c3a22"
          roughness={0.78}
          metalness={0.04}
          envMapIntensity={0.2}
        />
      </mesh>
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={map}
          emissiveMap={map}
          emissive="#ffffff"
          emissiveIntensity={0.55}
          roughness={0.92}
          metalness={0}
          envMapIntensity={0.35}
          color="#ffffff"
        />
      </mesh>
    </group>
  );
}

export function CourtyardWallMurals() {
  const southMap = useTexture(SOUTH_MURAL_URL);
  const framedMaps = useTexture([...FRAMED_MURAL_URLS]);
  const alphaMap = useMemo(() => createEdgeFadeAlphaMap(), []);
  const softPanels = useMemo(() => buildSouthSoftPanels(), []);
  const framedPanels = useMemo(() => buildFramedPanels(), []);

  useLayoutEffect(() => {
    configureMap(southMap);
    for (const map of framedMaps) configureMap(map);
  }, [southMap, framedMaps]);

  useLayoutEffect(() => () => alphaMap.dispose(), [alphaMap]);

  return (
    <group>
      {softPanels.map((panel) => (
        <SoftMural
          key={panel.id}
          panel={panel}
          map={southMap}
          alphaMap={alphaMap}
        />
      ))}
      {framedPanels.map((panel) => (
        <FramedMural
          key={panel.id}
          panel={panel}
          map={framedMaps[panel.textureIndex]}
        />
      ))}
    </group>
  );
}
