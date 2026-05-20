import { useEffect, useRef, useState } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  Quaternion,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from "three";

const MAX_LEVELS = 53;
const MIN_LEVELS = 12;
const SEGMENTS = 24;
const CARDINAL_SEGMENTS = [0, SEGMENTS / 4, SEGMENTS / 2, (SEGMENTS * 3) / 4].map(Math.round);
const MAP_ROWS = 8;
const MAP_COLS = 12;
const DESIGN_LOOP_DURATION = 3000;
const ANALYSIS_LOOP_DURATION = 3000;
const BIM_LOOP_DURATION = 3000;
const DOCUMENTATION_LOOP_DURATION = 3000;
const BASE_Y = -1.52;
const MAX_SCENE_HEIGHT = 3.58;
const MIN_FLOOR_HEIGHT = 3.2;
const MAX_FLOOR_HEIGHT = 4.5;
const SCENE_REFERENCE_FLOOR_HEIGHT = 3.6;
const MAX_TOTAL_HEIGHT = MAX_LEVELS * SCENE_REFERENCE_FLOOR_HEIGHT;
const STAGE_KEYS = ["design", "analysis", "bim", "documentation"];
const STAGE_LABELS = ["DISEÑO", "ANÁLISIS", "BIM", "DOCUMENTACIÓN"];
const SUN_PATH_LINE_CAPACITY = 2200;
const SUN_BASE_Y = BASE_Y + 0.06;
const SUN_CENTER_X = 0;
const SUN_CENTER_Z = -0.02;
const SUN_PATH_SCALE = 1.5;
const SUN_RADIUS_X = 2.34 * SUN_PATH_SCALE;
const SUN_RADIUS_Z = 2.02 * SUN_PATH_SCALE;
const SUN_DOME_HEIGHT = 3.18 * SUN_PATH_SCALE;
const SUN_START_ANGLE = Math.PI * 0.92;
const SUN_END_ANGLE = Math.PI * 0.08;
const BIM_SLAB_VERTICES_PER_FLOOR = SEGMENTS * 12;
const BIM_GLAZING_VERTICES_PER_PANEL = 36;
const BIM_STRUCTURE_VERTICES_PER_RIB = 6;
const BIM_GLAZING_LINES_PER_PANEL = 7;
const DOC_PLAN_LINE_CAPACITY = 260;
const DOC_ELEVATION_LINE_CAPACITY = 620;
const DOC_SECTION_LINE_CAPACITY = 720;
const DOC_FRAME_LINE_CAPACITY = 12;
const PLAN_METERS_PER_UNIT = 18;

const DESIGN_SLIDERS = [
  { key: "floorHeight", label: "ALTURA", min: MIN_FLOOR_HEIGHT, max: MAX_FLOOR_HEIGHT, unit: " m", decimals: 1 },
  { key: "levels", label: "NIVELES", min: MIN_LEVELS, max: MAX_LEVELS, unit: "", decimals: 0 },
  { key: "torsion", label: "TORSION", min: 0, max: 32, unit: "°", decimals: 0 },
  { key: "flow", label: "FLUIDEZ", min: 0, max: 100, unit: "%", decimals: 0 },
  { key: "waist", label: "ENSANCHE", min: 0, max: 100, unit: "%", decimals: 0 },
  { key: "crown", label: "CORONA", min: 0, max: 100, unit: "%", decimals: 0 },
];

const HEAT_STOPS = [
  [0, "#10256d"],
  [0.24, "#1a8edb"],
  [0.44, "#64d8ff"],
  [0.6, "#f1e35a"],
  [0.78, "#ff8a2e"],
  [1, "#ff3030"],
].map(([stop, color]) => [stop, new Color(color)]);

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function createLineGeometry(maxLineCount) {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(maxLineCount * 2 * 3);
  const attribute = new Float32BufferAttribute(positions, 3);

  attribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  geometry.setDrawRange(0, 0);
  return geometry;
}

function createMeshGeometry(maxVertexCount) {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(maxVertexCount * 3);
  const colors = new Float32Array(maxVertexCount * 3);
  const positionAttribute = new Float32BufferAttribute(positions, 3);
  const colorAttribute = new Float32BufferAttribute(colors, 3);

  positionAttribute.setUsage(DynamicDrawUsage);
  colorAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", colorAttribute);
  geometry.setDrawRange(0, 0);
  return geometry;
}

function createFacadeGeometry() {
  return createMeshGeometry(MAX_LEVELS * SEGMENTS * 6);
}

function writePoint(array, offset, point) {
  array[offset] = point.x;
  array[offset + 1] = point.y;
  array[offset + 2] = point.z;
}

function writeColor(array, offset, color) {
  array[offset] = color.r;
  array[offset + 1] = color.g;
  array[offset + 2] = color.b;
}

function writeLine(array, offset, a, b) {
  writePoint(array, offset, a);
  writePoint(array, offset + 3, b);
  return offset + 6;
}

function writeColoredPoint(positions, colors, offset, point, color) {
  writePoint(positions, offset, point);
  writeColor(colors, offset, color);
}

function writeTriangle(positions, colors, offset, a, b, c, color) {
  writeColoredPoint(positions, colors, offset, a, color);
  writeColoredPoint(positions, colors, offset + 3, b, color);
  writeColoredPoint(positions, colors, offset + 6, c, color);
  return offset + 9;
}

function writeQuad(positions, colors, offset, a, b, c, d, color) {
  let nextOffset = writeTriangle(positions, colors, offset, a, b, c, color);
  nextOffset = writeTriangle(positions, colors, nextOffset, c, b, d, color);
  return nextOffset;
}

function setLineCount(geometry, lineCount) {
  geometry.setDrawRange(0, Math.max(0, lineCount) * 2);
  geometry.attributes.position.needsUpdate = true;
}

function setMeshVertexCount(geometry, vertexCount) {
  geometry.setDrawRange(0, Math.max(0, vertexCount));
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function mixColor(a, b, t) {
  return new Color(
    lerp(a.r, b.r, t),
    lerp(a.g, b.g, t),
    lerp(a.b, b.b, t),
  );
}

function heatColor(value) {
  const t = clamp(value);

  for (let index = 0; index < HEAT_STOPS.length - 1; index += 1) {
    const [startStop, startColor] = HEAT_STOPS[index];
    const [endStop, endColor] = HEAT_STOPS[index + 1];

    if (t >= startStop && t <= endStop) {
      return mixColor(startColor, endColor, (t - startStop) / (endStop - startStop));
    }
  }

  return HEAT_STOPS[HEAT_STOPS.length - 1][1].clone();
}

function heatColorCss(value) {
  return `#${heatColor(value).getHexString()}`;
}

function getDesignParams(phase, reducedMotion) {
  const parameterProgress = reducedMotion ? 1 : smoothstep(0.06, 1, phase);
  const profilePulse = reducedMotion ? 1 : parameterProgress * (0.94 + Math.sin(phase * Math.PI * 2) * 0.06);
  const floorHeight = lerp(MIN_FLOOR_HEIGHT, MAX_FLOOR_HEIGHT, parameterProgress);
  const levels = lerp(MIN_LEVELS, MAX_LEVELS, parameterProgress);
  const totalHeight = floorHeight * Math.round(levels);

  return {
    parameterProgress,
    floorHeight,
    levels,
    totalHeight,
    torsion: lerp(0, 30, parameterProgress),
    facade: lerp(38, 72, parameterProgress),
    footprint: lerp(0.84, 1.02, profilePulse),
    profile: lerp(0.02, 0.08, parameterProgress),
    flow: lerp(0, 0.34, parameterProgress),
    waist: lerp(0, 0.72, parameterProgress),
    crown: lerp(0, 0.32, parameterProgress),
    lean: lerp(0, 0.14, parameterProgress),
    asymmetry: lerp(0, 0.16, parameterProgress),
  };
}

function getDesignSequence(phase, reducedMotion) {
  if (reducedMotion) {
    return {
      fade: 1,
      footprint: 1,
      core: 1,
      plates: 1,
      ribs: 1,
      guides: 1,
    };
  }

  return {
    fade: 1,
    footprint: smoothstep(0.04, 0.3, phase),
    core: smoothstep(0.18, 0.56, phase),
    plates: smoothstep(0.34, 0.8, phase),
    ribs: smoothstep(0.52, 0.96, phase),
    guides: smoothstep(0.68, 1, phase),
  };
}

function getAnalysisSequence(phase, reducedMotion) {
  if (reducedMotion) {
    return {
      path: 1,
      sun: 1,
      radiation: 1,
      map: 1,
      travel: 0.68,
      fade: 1,
    };
  }

  return {
    path: lerp(0.62, 1, smoothstep(0, 0.1, phase)),
    sun: lerp(0.55, 1, smoothstep(0, 0.12, phase)),
    radiation: lerp(0.42, 1, smoothstep(0, 0.18, phase)),
    map: lerp(0.42, 1, smoothstep(0, 0.2, phase)),
    travel: smoothstep(0.02, 0.78, phase),
    fade: 1,
  };
}

function getBimSequence(phase, reducedMotion) {
  if (reducedMotion) {
    return {
      slabs: 1,
      structure: 1,
      glazing: 1,
      coordination: 1,
    };
  }

  return {
    slabs: lerp(0.36, 1, smoothstep(0, 0.22, phase)),
    structure: lerp(0.18, 1, smoothstep(0, 0.34, phase)),
    glazing: lerp(0.16, 1, smoothstep(0, 0.44, phase)),
    coordination: 0.72 + Math.sin(phase * Math.PI * 2) * 0.18,
  };
}

function getAnalysisState(phase, reducedMotion) {
  const sequence = getAnalysisSequence(phase, reducedMotion);
  const hour = lerp(8, 17, sequence.travel);
  const azimuth = lerp(78, 268, sequence.travel);
  const altitude = 10 + Math.sin(sequence.travel * Math.PI) * 58;
  const azimuthRad = (azimuth * Math.PI) / 180;
  const altitudeRad = (altitude * Math.PI) / 180;

  return {
    ...sequence,
    hour,
    azimuth,
    altitude,
    sunDirection: {
      x: Math.cos(azimuthRad),
      y: Math.sin(altitudeRad),
      z: Math.sin(azimuthRad),
    },
  };
}

function towerCenter(t, params) {
  const lean = params.lean || 0;

  return {
    x: lean * (Math.sin(t * Math.PI * 0.92) * 0.28 - smoothstep(0.72, 1, t) * 0.06),
    z: lean * (Math.sin(t * Math.PI * 1.3 - 0.7) * 0.12 + smoothstep(0.58, 1, t) * 0.13),
  };
}

function towerPoint(level, segment, params) {
  const levelCount = Math.max(1, Math.round(params.levels));
  const t = clamp(level / levelCount);
  const baseAngle = (segment / SEGMENTS) * Math.PI * 2;
  const twistProgress = 0.16 * t + 0.84 * smoothstep(0, 1, t);
  const flow = params.flow || 0;
  const angle = baseAngle + (params.torsion * Math.PI * twistProgress) / 180 + Math.sin(t * Math.PI * 1.18) * flow * 0.035;
  const sceneHeight = MAX_SCENE_HEIGHT * (params.totalHeight / MAX_TOTAL_HEIGHT);
  const taper = params.profile * (0.24 * t + 0.76 * t * t);
  const vaseAmount = params.waist || 0;
  const baseContraction = 1 - vaseAmount * (1 - smoothstep(0.04, 0.42, t)) * 0.32;
  const belly = 1 + vaseAmount * Math.sin(smoothstep(0.08, 0.86, t) * Math.PI) * 0.18;
  const upperContraction = 1 - vaseAmount * smoothstep(0.62, 1, t) * 0.24;
  const crownLip = 1 + (params.crown || 0) * smoothstep(0.82, 1, t) * 0.06;
  const vaseProfile = baseContraction * belly * upperContraction * crownLip;
  const shoulder = 1 + Math.sin(t * Math.PI) * (0.02 + flow * 0.03);
  const asymmetry = params.asymmetry || 0;
  const perimeterWave =
    1 +
    flow *
      (Math.sin(baseAngle * 2.0 - t * 2.25) * 0.035 +
        Math.sin(baseAngle * 3.0 + t * 3.2) * 0.02);
  const asymmetricPull =
    1 +
    asymmetry *
      (Math.cos(baseAngle - 0.82) * 0.035 +
        Math.sin(baseAngle + t * Math.PI * 1.45) * 0.025);
  const localOval = 0.58 + flow * Math.sin(t * Math.PI * 1.06 + 0.4) * 0.012;
  const radiusX = params.footprint * vaseProfile * shoulder * perimeterWave * asymmetricPull * (1 - taper * 0.34);
  const radiusZ = params.footprint * localOval * vaseProfile * shoulder * perimeterWave * (1 - taper * 0.18);
  const center = towerCenter(t, params);

  return {
    x: center.x + Math.cos(angle) * radiusX,
    y: BASE_Y + sceneHeight * t,
    z: center.z + Math.sin(angle) * radiusZ,
  };
}

function lerpPoint(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

function offsetPoint(point, normal, distance) {
  return {
    x: point.x + normal.x * distance,
    y: point.y,
    z: point.z + normal.z * distance,
  };
}

function offsetTowerPoint(level, segment, params, distance = 0, yOffset = 0) {
  const levelCount = Math.max(1, Math.round(params.levels));
  const t = clamp(level / levelCount);
  const point = towerPoint(level, segment, params);
  const center = towerCenter(t, params);
  const x = point.x - center.x;
  const z = point.z - center.z;
  const length = Math.hypot(x, z) || 1;

  return {
    x: point.x + (x / length) * distance,
    y: point.y + yOffset,
    z: point.z + (z / length) * distance,
  };
}

function panelNormal(segment, level, params) {
  const levelCount = Math.max(1, Math.round(params.levels));
  const vertical = clamp((level + 0.5) / levelCount);
  const current = towerPoint(level + 0.5, segment, params);
  const next = towerPoint(level + 0.5, (segment + 1) % SEGMENTS, params);
  const center = towerCenter(vertical, params);
  const tangent = { x: next.x - current.x, z: next.z - current.z };
  const tangentLength = Math.hypot(tangent.x, tangent.z) || 1;
  const midpoint = { x: (current.x + next.x) / 2, z: (current.z + next.z) / 2 };
  const radial = { x: midpoint.x - center.x, z: midpoint.z - center.z };
  let normal = { x: tangent.z / tangentLength, z: -tangent.x / tangentLength };

  if (normal.x * radial.x + normal.z * radial.z < 0) {
    normal = { x: -normal.x, z: -normal.z };
  }

  return normal;
}

function panelTangent(level, segment, params) {
  const previous = towerPoint(level, (segment + SEGMENTS - 1) % SEGMENTS, params);
  const next = towerPoint(level, (segment + 1) % SEGMENTS, params);
  const x = next.x - previous.x;
  const z = next.z - previous.z;
  const length = Math.hypot(x, z) || 1;

  return { x: x / length, z: z / length };
}

function getPanelRadiation(level, segment, params, analysis) {
  const levelCount = Math.max(1, Math.round(params.levels));
  const vertical = clamp((level + 0.5) / levelCount);
  const normal = panelNormal(segment, level, params);
  const dot = Math.max(0, normal.x * analysis.sunDirection.x + normal.z * analysis.sunDirection.z);
  const altitudeFactor = clamp(Math.sin((analysis.altitude * Math.PI) / 180), 0.1, 1);
  const verticalFactor = 0.68 + vertical * 0.28;
  const panelVariation = 0.92 + Math.sin(segment * 1.71 + level * 0.43) * 0.08;
  const radiation = clamp(dot * altitudeFactor * verticalFactor * panelVariation * analysis.radiation * 1.22);

  return radiation * 1050;
}

function updateFacadeSurface(geometry, params, visibleLevels, getPanelColor) {
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;
  let positionOffset = 0;
  let colorOffset = 0;

  for (let level = 0; level < MAX_LEVELS; level += 1) {
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const p00 = towerPoint(level, segment, params);
      const p10 = towerPoint(level + 1, segment, params);
      const p01 = towerPoint(level, (segment + 1) % SEGMENTS, params);
      const p11 = towerPoint(level + 1, (segment + 1) % SEGMENTS, params);
      const panelColor = getPanelColor(level, segment);
      const vertices = [p00, p10, p01, p01, p10, p11];

      vertices.forEach((point) => {
        writePoint(positions, positionOffset, point);
        writeColor(colors, colorOffset, panelColor);
        positionOffset += 3;
        colorOffset += 3;
      });
    }
  }

  geometry.setDrawRange(0, Math.max(0, visibleLevels) * SEGMENTS * 6);
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function updateBimFloorSlabs(geometry, params, visibleLevels, progress) {
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;
  const slabBase = new Color(0x145dff);
  const slabTop = new Color(0x36c7ff);
  const slabThickness = 0.022;
  let offset = 0;

  for (let level = 0; level <= MAX_LEVELS; level += 1) {
    const centerTop = { x: 0, y: towerPoint(level, 0, params).y + slabThickness, z: 0 };
    const centerBottom = { x: 0, y: centerTop.y - slabThickness * 2, z: 0 };

    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const nextSegment = (segment + 1) % SEGMENTS;
      const color = mixColor(slabBase, slabTop, segment % 3 === 0 ? 0.58 : 0.28);
      const aTop = offsetTowerPoint(level, segment, params, 0.018, slabThickness);
      const bTop = offsetTowerPoint(level, nextSegment, params, 0.018, slabThickness);
      const aBottom = offsetTowerPoint(level, segment, params, 0.018, -slabThickness);
      const bBottom = offsetTowerPoint(level, nextSegment, params, 0.018, -slabThickness);

      offset = writeTriangle(positions, colors, offset, centerTop, aTop, bTop, color);
      offset = writeTriangle(positions, colors, offset, centerBottom, bBottom, aBottom, color);
      offset = writeQuad(positions, colors, offset, aTop, aBottom, bTop, bBottom, color);
    }
  }

  const visibleFloors = Math.round((visibleLevels + 1) * progress);
  setMeshVertexCount(geometry, visibleFloors * BIM_SLAB_VERTICES_PER_FLOOR);
}

function updateBimGlazing(geometry, params, visibleLevels, progress) {
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;
  const glazingBase = new Color(0x8f5a3a);
  const glazingHot = new Color(0xd7a064);
  const panelSideGap = 0.16;
  const panelVerticalGap = 0.18;
  let offset = 0;

  for (let level = 0; level < MAX_LEVELS; level += 1) {
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const nextSegment = (segment + 1) % SEGMENTS;
      const normal = panelNormal(segment, level, params);
      const bottomA = lerpPoint(towerPoint(level, segment, params), towerPoint(level + 1, segment, params), panelVerticalGap);
      const bottomB = lerpPoint(towerPoint(level, nextSegment, params), towerPoint(level + 1, nextSegment, params), panelVerticalGap);
      const topA = lerpPoint(towerPoint(level, segment, params), towerPoint(level + 1, segment, params), 1 - panelVerticalGap);
      const topB = lerpPoint(towerPoint(level, nextSegment, params), towerPoint(level + 1, nextSegment, params), 1 - panelVerticalGap);
      const p00 = lerpPoint(bottomA, bottomB, panelSideGap);
      const p01 = lerpPoint(bottomA, bottomB, 1 - panelSideGap);
      const p10 = lerpPoint(topA, topB, panelSideGap);
      const p11 = lerpPoint(topA, topB, 1 - panelSideGap);
      const front = [p00, p10, p01, p11].map((point) => offsetPoint(point, normal, 0.066));
      const back = [p00, p10, p01, p11].map((point) => offsetPoint(point, normal, 0.028));
      const orientation = clamp((normal.x * 0.56 + normal.z * 0.34 + 1) / 2);
      const color = mixColor(glazingBase, glazingHot, clamp(0.1 + orientation * 0.68 + ((level * 2 + segment) % 4) * 0.055));

      offset = writeQuad(positions, colors, offset, front[0], front[1], front[2], front[3], color);
      offset = writeQuad(positions, colors, offset, back[2], back[3], back[0], back[1], color);
      offset = writeQuad(positions, colors, offset, front[0], back[0], front[1], back[1], color);
      offset = writeQuad(positions, colors, offset, front[2], front[3], back[2], back[3], color);
      offset = writeQuad(positions, colors, offset, front[0], front[2], back[0], back[2], color);
      offset = writeQuad(positions, colors, offset, front[1], back[1], front[3], back[3], color);
    }
  }

  const visiblePanels = Math.round(visibleLevels * SEGMENTS * progress);
  setMeshVertexCount(geometry, visiblePanels * BIM_GLAZING_VERTICES_PER_PANEL);
}

function updateBimGlazingLines(geometry, params, visibleLevels, progress) {
  const positions = geometry.attributes.position.array;
  const panelSideGap = 0.16;
  const panelVerticalGap = 0.18;
  let offset = 0;
  let lineCount = 0;

  for (let level = 0; level < MAX_LEVELS; level += 1) {
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const nextSegment = (segment + 1) % SEGMENTS;
      const normal = panelNormal(segment, level, params);
      const bottomA = lerpPoint(towerPoint(level, segment, params), towerPoint(level + 1, segment, params), panelVerticalGap);
      const bottomB = lerpPoint(towerPoint(level, nextSegment, params), towerPoint(level + 1, nextSegment, params), panelVerticalGap);
      const topA = lerpPoint(towerPoint(level, segment, params), towerPoint(level + 1, segment, params), 1 - panelVerticalGap);
      const topB = lerpPoint(towerPoint(level, nextSegment, params), towerPoint(level + 1, nextSegment, params), 1 - panelVerticalGap);
      const p00 = offsetPoint(lerpPoint(bottomA, bottomB, panelSideGap), normal, 0.074);
      const p01 = offsetPoint(lerpPoint(bottomA, bottomB, 1 - panelSideGap), normal, 0.074);
      const p10 = offsetPoint(lerpPoint(topA, topB, panelSideGap), normal, 0.074);
      const p11 = offsetPoint(lerpPoint(topA, topB, 1 - panelSideGap), normal, 0.074);
      const midV0 = lerpPoint(p00, p10, 0.5);
      const midV1 = lerpPoint(p01, p11, 0.5);
      const midH0 = lerpPoint(p00, p01, 0.5);
      const midH1 = lerpPoint(p10, p11, 0.5);

      offset = writeLine(positions, offset, p00, p10);
      offset = writeLine(positions, offset, p01, p11);
      offset = writeLine(positions, offset, p00, p01);
      offset = writeLine(positions, offset, p10, p11);
      offset = writeLine(positions, offset, midV0, midV1);
      offset = writeLine(positions, offset, midH0, midH1);
      offset = writeLine(positions, offset, lerpPoint(p00, p01, 0.25), lerpPoint(p10, p11, 0.25));
      lineCount += BIM_GLAZING_LINES_PER_PANEL;
    }
  }

  const visiblePanels = Math.round(visibleLevels * SEGMENTS * progress);
  setLineCount(geometry, visiblePanels * BIM_GLAZING_LINES_PER_PANEL);
}

function updateBimStructure(geometry, params, visibleLevels, progress) {
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;
  const structureBase = new Color(0x21ff68);
  const structureAlt = new Color(0xb8ffd2);
  const ribWidth = 0.018;
  let offset = 0;

  for (let level = 0; level < MAX_LEVELS; level += 1) {
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const tangent = panelTangent(level, segment, params);
      const color = mixColor(structureBase, structureAlt, segment % 3 === 0 ? 0.34 : 0.12);
      const bottom = offsetTowerPoint(level, segment, params, 0.082, 0);
      const top = offsetTowerPoint(level + 1, segment, params, 0.082, 0);
      const bottomA = { x: bottom.x - tangent.x * ribWidth, y: bottom.y, z: bottom.z - tangent.z * ribWidth };
      const bottomB = { x: bottom.x + tangent.x * ribWidth, y: bottom.y, z: bottom.z + tangent.z * ribWidth };
      const topA = { x: top.x - tangent.x * ribWidth, y: top.y, z: top.z - tangent.z * ribWidth };
      const topB = { x: top.x + tangent.x * ribWidth, y: top.y, z: top.z + tangent.z * ribWidth };

      offset = writeQuad(positions, colors, offset, bottomA, topA, bottomB, topB, color);
    }
  }

  const visibleRibs = Math.round(visibleLevels * SEGMENTS * progress);
  setMeshVertexCount(geometry, visibleRibs * BIM_STRUCTURE_VERTICES_PER_RIB);
}

function updateFootprint(geometry, params, progress) {
  const positions = geometry.attributes.position.array;
  let offset = 0;

  for (let segment = 0; segment < SEGMENTS; segment += 1) {
    offset = writeLine(
      positions,
      offset,
      towerPoint(0, segment, params),
      towerPoint(0, (segment + 1) % SEGMENTS, params),
    );
  }

  setLineCount(geometry, Math.round(SEGMENTS * progress));
}

function updateFloorBands(geometry, params, visibleLevels) {
  const positions = geometry.attributes.position.array;
  let offset = 0;

  for (let level = 0; level <= MAX_LEVELS; level += 1) {
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      offset = writeLine(
        positions,
        offset,
        towerPoint(level, segment, params),
        towerPoint(level, (segment + 1) % SEGMENTS, params),
      );
    }
  }

  setLineCount(geometry, (visibleLevels + 1) * SEGMENTS);
}

function updateRibs(geometry, params, visibleLevels, ribProgress) {
  const positions = geometry.attributes.position.array;
  const targetRibs = Math.round(lerp(4, SEGMENTS, clamp((params.facade - 32) / 36)));
  const visibleRibs = Math.max(1, Math.round(targetRibs * ribProgress));
  let offset = 0;
  let lineCount = 0;

  for (let rib = 0; rib < visibleRibs; rib += 1) {
    const segment = Math.round((rib / visibleRibs) * SEGMENTS) % SEGMENTS;

    for (let level = 0; level < visibleLevels; level += 1) {
      offset = writeLine(positions, offset, towerPoint(level, segment, params), towerPoint(level + 1, segment, params));
      lineCount += 1;
    }
  }

  setLineCount(geometry, lineCount);
}

function updateGuides(geometry, params, visibleLevels, progress) {
  const positions = geometry.attributes.position.array;
  let offset = 0;
  let lineCount = 0;
  const maxGuideLevels = Math.max(0, Math.min(visibleLevels - 2, Math.round(visibleLevels * progress)));

  for (let level = 0; level < maxGuideLevels; level += 2) {
    CARDINAL_SEGMENTS.forEach((segment) => {
      offset = writeLine(
        positions,
        offset,
        towerPoint(level, segment, params),
        towerPoint(level + 2, (segment + 1) % SEGMENTS, params),
      );
      lineCount += 1;
    });
  }

  setLineCount(geometry, lineCount);
}

function updateCoreLines(geometry, params, progress) {
  const positions = geometry.attributes.position.array;
  const sceneHeight = MAX_SCENE_HEIGHT * (params.totalHeight / MAX_TOTAL_HEIGHT) * progress;
  const bottom = BASE_Y;
  const top = BASE_Y + sceneHeight;
  const width = 0.22;
  const depth = 0.16;
  const corners = [
    { x: -width, y: bottom, z: -depth },
    { x: width, y: bottom, z: -depth },
    { x: width, y: bottom, z: depth },
    { x: -width, y: bottom, z: depth },
    { x: -width, y: top, z: -depth },
    { x: width, y: top, z: -depth },
    { x: width, y: top, z: depth },
    { x: -width, y: top, z: depth },
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  let offset = 0;

  edges.forEach(([a, b]) => {
    offset = writeLine(positions, offset, corners[a], corners[b]);
  });

  setLineCount(geometry, progress > 0 ? edges.length : 0);
}

function sunDomePoint(travel, altitudeScale = 0.9, radialScale = 1) {
  const theta = lerp(SUN_START_ANGLE, SUN_END_ANGLE, travel);
  const lift = Math.sin(travel * Math.PI);
  const radiusCompression = 1 - lift * (0.08 + altitudeScale * 0.08);

  return {
    x: SUN_CENTER_X + Math.cos(theta) * SUN_RADIUS_X * radialScale * radiusCompression,
    y: SUN_BASE_Y + lift * SUN_DOME_HEIGHT * altitudeScale,
    z: SUN_CENTER_Z + Math.sin(theta) * SUN_RADIUS_Z * radialScale * radiusCompression,
  };
}

function sunRingPoint(progress, radialScale = 1) {
  const theta = progress * Math.PI * 2;

  return {
    x: SUN_CENTER_X + Math.cos(theta) * SUN_RADIUS_X * radialScale,
    y: SUN_BASE_Y,
    z: SUN_CENTER_Z + Math.sin(theta) * SUN_RADIUS_Z * radialScale,
  };
}

function sunPathPoint(travel, radialScale = 1) {
  return sunDomePoint(lerp(0.06, 0.88, clamp(travel)), 0.96, radialScale);
}

function updateSunPath(geometry, progress) {
  const positions = geometry.attributes.position.array;
  let offset = 0;
  let lineCount = 0;
  const ringSteps = 128;
  const activeArcSteps = 96;

  [1.02, 1.1, 1.18].forEach((scale) => {
    for (let step = 0; step < ringSteps; step += 1) {
      offset = writeLine(positions, offset, sunRingPoint(step / ringSteps, scale), sunRingPoint((step + 1) / ringSteps, scale));
      lineCount += 1;
    }
  });

  for (let tick = 0; tick < 32; tick += 1) {
    const travel = tick / 32;
    const isMajor = tick % 4 === 0;
    offset = writeLine(positions, offset, sunRingPoint(travel, isMajor ? 0.94 : 1.04), sunRingPoint(travel, isMajor ? 1.3 : 1.2));
    lineCount += 1;
  }

  [0, 0.25, 0.5, 0.75].forEach((travel) => {
    offset = writeLine(positions, offset, sunRingPoint(travel, 0.52), sunRingPoint(travel, 1.32));
    lineCount += 1;
  });

  for (let step = 0; step < activeArcSteps; step += 1) {
    offset = writeLine(
      positions,
      offset,
      sunPathPoint(step / activeArcSteps),
      sunPathPoint((step + 1) / activeArcSteps),
    );
    lineCount += 1;
  }

  setLineCount(geometry, Math.round(lineCount * progress));
}

function updateSunRays(geometry, analysis, progress) {
  const positions = geometry.attributes.position.array;
  const sun = sunPathPoint(analysis.travel);
  const targets = [
    { x: 0, y: 0.06, z: 0.08 },
    { x: -0.52, y: -0.58, z: 0.15 },
    { x: 0.52, y: 0.62, z: 0.1 },
    { x: 0.18, y: 1.32, z: 0.08 },
  ];
  let offset = 0;

  targets.forEach((target) => {
    offset = writeLine(positions, offset, sun, target);
  });

  setLineCount(geometry, Math.round(targets.length * progress));
}

function getDesignHudState(params) {
  const activeLevels = Math.round(params.levels);
  const totalHeight = Math.round(params.totalHeight);
  const grossArea = lerp(8400, 24600, params.parameterProgress);
  const plan = getDocumentationPlanData(params);
  const footprintWidth = (plan.maxX - plan.minX) * PLAN_METERS_PER_UNIT;
  const footprintDepth = (plan.maxZ - plan.minZ) * PLAN_METERS_PER_UNIT;
  const typicalFloorArea = Math.PI * (footprintWidth / 2) * (footprintDepth / 2);
  const panelCount = activeLevels * SEGMENTS;

  return {
    mode: "design",
    values: {
      floorHeight: params.floorHeight,
      levels: activeLevels,
      torsion: params.torsion,
      flow: params.flow * 100,
      waist: params.waist * 100,
      crown: params.crown * 100,
    },
    metrics: [
      ["NIVELES", activeLevels],
      ["ALTURA TOTAL", `${totalHeight} m`],
      ["ÁREA GFA", `${Math.round(grossArea).toLocaleString("es-MX")} m²`],
      ["ALTURA NIVEL", `${params.floorHeight.toFixed(1)} m`],
      ["HUELLA TIPO", `${Math.round(typicalFloorArea).toLocaleString("es-MX")} m²`],
      ["PÁNELES", panelCount.toLocaleString("es-MX")],
    ],
  };
}

function getAnalysisHudState(params, analysis) {
  const values = [];

  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      const level = Math.round((row / MAP_ROWS) * Math.round(params.levels));
      const segment = col % SEGMENTS;
      values.push(getPanelRadiation(level, segment, params, analysis));
    }
  }

  const max = Math.max(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const exposureSignal = clamp(analysis.radiation * (0.34 + Math.sin(analysis.travel * Math.PI) * 0.66));
  const readoutSignal = smoothstep(0.04, 0.96, exposureSignal);
  const displayAverage = Math.round(lerp(320, 680, readoutSignal));
  const displayMax = Math.round(lerp(700, 1050, clamp(readoutSignal + average / 3200 + max / 8400)));
  const exposedArea = Math.round(lerp(38, 74, readoutSignal));
  const hourValue = Math.round(analysis.hour);
  const criticalOrientation = analysis.azimuth < 125 ? "Oriente" : analysis.azimuth < 205 ? "Sur" : "Poniente";

  return {
    mode: "analysis",
    metrics: [
      ["RADIACIÓN MEDIA", `${displayAverage} Wh/m²`],
      ["RADIACIÓN MÁX.", `${displayMax} Wh/m²`],
      ["ÁREA EXPUESTA", `${exposedArea}%`],
      ["ORIENTACIÓN CRÍTICA", criticalOrientation],
      ["HORA CRÍTICA", `${Math.min(16, Math.max(14, hourValue))}:00`],
    ],
    analysis: {
      hour: `${String(Math.floor(analysis.hour)).padStart(2, "0")}:${analysis.hour % 1 > 0.5 ? "30" : "00"}`,
      azimuth: `${Math.round(analysis.azimuth)}°`,
      altitude: `${Math.round(analysis.altitude)}°`,
      max: `${displayMax} Wh/m²`,
      average: `${displayAverage} Wh/m²`,
      cells: values.map((value) => ({
        value: Math.round(value),
        color: heatColorCss(value / 1050),
      })),
    },
  };
}

function getBimHudState(params, phase, reducedMotion) {
  const levels = Math.round(params.levels);
  const coordination = reducedMotion ? 1 : smoothstep(0.16, 0.72, phase);
  const clashCount = Math.max(2, Math.round(lerp(18, 3, coordination)));

  return {
    mode: "bim",
    metrics: [
      ["LOSAS", `${levels + 1}`],
      ["DISCIPLINAS", "4 modelos"],
      ["VIDRIO", `${levels * SEGMENTS} páneles`],
      ["NÚCLEO", "1 núcleo"],
      ["CLASH", `${clashCount} alertas`],
      ["LOD", "300"],
    ],
  };
}

function getDocumentationHudState(params) {
  return {
    mode: "documentation",
    metrics: [
      ["PLANOS", "12"],
      ["ELEVACIONES", "4"],
      ["DETALLES", "18"],
      ["NIVELES", `${Math.round(params.levels)}`],
      ["LÁMINA", "A-301"],
      ["ESCALA", "1:100"],
    ],
  };
}

function getDocumentationSequence(phase, reducedMotion) {
  if (reducedMotion) {
    return {
      plan: 1,
      planDims: 1,
      elevation: 1,
      elevationDims: 1,
      section: 1,
      cut: 1,
    };
  }

  return {
    plan: smoothstep(0.02, 0.18, phase),
    planDims: smoothstep(0.08, 0.26, phase),
    elevation: smoothstep(0.02, 0.18, phase),
    elevationDims: smoothstep(0.08, 0.26, phase),
    section: smoothstep(0.02, 0.18, phase),
    cut: smoothstep(0.08, 0.3, phase),
  };
}

function createTextSprite(text, options = {}) {
  const {
    color = "#eaf5ff",
    background = "rgba(2, 9, 18, 0.74)",
    border = "rgba(125, 191, 255, 0.42)",
    accent = "#31ff5c",
    height = 0.12,
    fontSize = 42,
    opacity = 1,
  } = options;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const paddingX = 24;
  const paddingY = 14;

  context.font = `800 ${fontSize}px monospace`;
  const width = Math.ceil(context.measureText(text).width + paddingX * 2);
  const heightPx = Math.ceil(fontSize + paddingY * 2);
  canvas.width = Math.max(64, width);
  canvas.height = Math.max(36, heightPx);

  context.font = `800 ${fontSize}px monospace`;
  context.textBaseline = "middle";
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = border;
  context.lineWidth = 2;
  context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  context.fillStyle = color;
  context.fillText(text, paddingX, canvas.height / 2);
  context.fillStyle = accent;
  context.fillRect(0, canvas.height - 4, Math.min(canvas.width, 58), 4);

  const texture = new CanvasTexture(canvas);
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new Sprite(material);
  const aspect = canvas.width / canvas.height;

  sprite.scale.set(height * aspect, height, 1);
  sprite.userData.baseOpacity = opacity;
  return sprite;
}

function setSpritesOpacity(sprites, opacity) {
  sprites.forEach((sprite) => {
    sprite.material.opacity = opacity * (sprite.userData.baseOpacity ?? 1);
  });
}

function setMaterialOpacity(material, opacity) {
  material.opacity = opacity;
  material.transparent = true;
}

function toPlanPoint(point, y = 0) {
  return { x: point.x, y, z: point.z };
}

function toElevationPoint(point, z = 0) {
  return { x: point.x, y: point.y, z };
}

function addLineToState(positions, state, a, b) {
  state.offset = writeLine(positions, state.offset, a, b);
  state.count += 1;
}

function addRectangleLines(positions, state, corners) {
  corners.forEach((corner, index) => {
    addLineToState(positions, state, corner, corners[(index + 1) % corners.length]);
  });
}

function addCircleLines(positions, state, center, radius, plane = "xz", segments = 16) {
  for (let index = 0; index < segments; index += 1) {
    const a = (index / segments) * Math.PI * 2;
    const b = ((index + 1) / segments) * Math.PI * 2;
    const pointA = plane === "xy"
      ? { x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius, z: center.z }
      : { x: center.x + Math.cos(a) * radius, y: center.y, z: center.z + Math.sin(a) * radius };
    const pointB = plane === "xy"
      ? { x: center.x + Math.cos(b) * radius, y: center.y + Math.sin(b) * radius, z: center.z }
      : { x: center.x + Math.cos(b) * radius, y: center.y, z: center.z + Math.sin(b) * radius };

    addLineToState(positions, state, pointA, pointB);
  }
}

function updateDocumentationFrame(geometry, plane = "xz") {
  const positions = geometry.attributes.position.array;
  const state = { offset: 0, count: 0 };
  const corners = plane === "xy"
    ? [
      { x: -2.36, y: -1.88, z: -0.02 },
      { x: 2.36, y: -1.88, z: -0.02 },
      { x: 2.36, y: 3.12, z: -0.02 },
      { x: -2.36, y: 3.12, z: -0.02 },
    ]
    : [
      { x: -2.08, y: 0, z: -1.46 },
      { x: 2.08, y: 0, z: -1.46 },
      { x: 2.08, y: 0, z: 1.46 },
      { x: -2.08, y: 0, z: 1.46 },
    ];

  addRectangleLines(positions, state, corners);
  setLineCount(geometry, state.count);
}

function updateSectionCutPlaneOutline(geometry) {
  const positions = geometry.attributes.position.array;
  const state = { offset: 0, count: 0 };
  [-0.028, 0, 0.028].forEach((x) => {
    addRectangleLines(positions, state, [
      { x, y: -0.5, z: -0.5 },
      { x, y: 0.5, z: -0.5 },
      { x, y: 0.5, z: 0.5 },
      { x, y: -0.5, z: 0.5 },
    ]);
  });
  setLineCount(geometry, state.count);
}

function getDocumentationPlanData(params) {
  const level = Math.round(Math.max(1, params.levels) * 0.5);
  const points = Array.from({ length: SEGMENTS }, (_, segment) => toPlanPoint(towerPoint(level, segment, params), 0.02));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minZ = Math.min(...points.map((point) => point.z));
  const maxZ = Math.max(...points.map((point) => point.z));
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return {
    level,
    points,
    minX,
    maxX,
    minZ,
    maxZ,
    centerX,
    centerZ,
    gridX: [-0.5, -0.25, 0, 0.25, 0.5].map((factor) => centerX + width * factor),
    gridZ: [-0.5, -0.25, 0, 0.25, 0.5].map((factor) => centerZ + depth * factor),
    gridMinX: minX - 0.3,
    gridMaxX: maxX + 0.3,
    gridMinZ: minZ - 0.26,
    gridMaxZ: maxZ + 0.26,
    dimX: maxX + 0.38,
    dimZ: maxZ + 0.34,
    widthLabel: `${(width * PLAN_METERS_PER_UNIT).toFixed(1)} M`,
    depthLabel: `${(depth * PLAN_METERS_PER_UNIT).toFixed(1)} M`,
  };
}

function updateDocumentationPlan(gridGeometry, modelGeometry, dimGeometry, params, sequence) {
  const gridPositions = gridGeometry.attributes.position.array;
  const modelPositions = modelGeometry.attributes.position.array;
  const dimPositions = dimGeometry.attributes.position.array;
  const gridState = { offset: 0, count: 0 };
  const modelState = { offset: 0, count: 0 };
  const dimState = { offset: 0, count: 0 };
  const plan = getDocumentationPlanData(params);

  plan.gridX.forEach((x) => {
    addLineToState(gridPositions, gridState, { x, y: 0, z: plan.gridMinZ }, { x, y: 0, z: plan.gridMaxZ });
    addCircleLines(gridPositions, gridState, { x, y: 0, z: plan.gridMinZ - 0.16 }, 0.035);
  });
  plan.gridZ.forEach((z) => {
    addLineToState(gridPositions, gridState, { x: plan.gridMinX, y: 0, z }, { x: plan.gridMaxX, y: 0, z });
    addCircleLines(gridPositions, gridState, { x: plan.gridMinX - 0.16, y: 0, z }, 0.035);
  });

  for (let segment = 0; segment < SEGMENTS; segment += 1) {
    addLineToState(
      modelPositions,
      modelState,
      plan.points[segment],
      plan.points[(segment + 1) % SEGMENTS],
    );
  }

  const core = [
    { x: plan.centerX - 0.22, y: 0.03, z: plan.centerZ - 0.16 },
    { x: plan.centerX + 0.22, y: 0.03, z: plan.centerZ - 0.16 },
    { x: plan.centerX + 0.22, y: 0.03, z: plan.centerZ + 0.16 },
    { x: plan.centerX - 0.22, y: 0.03, z: plan.centerZ + 0.16 },
  ];
  addRectangleLines(modelPositions, modelState, core);

  addLineToState(dimPositions, dimState, { x: plan.minX, y: 0.04, z: plan.dimZ }, { x: plan.maxX, y: 0.04, z: plan.dimZ });
  addLineToState(dimPositions, dimState, { x: plan.minX, y: 0.04, z: plan.dimZ - 0.09 }, { x: plan.minX, y: 0.04, z: plan.dimZ + 0.09 });
  addLineToState(dimPositions, dimState, { x: plan.maxX, y: 0.04, z: plan.dimZ - 0.09 }, { x: plan.maxX, y: 0.04, z: plan.dimZ + 0.09 });
  addLineToState(dimPositions, dimState, { x: plan.minX, y: 0.04, z: plan.maxZ }, { x: plan.minX, y: 0.04, z: plan.dimZ });
  addLineToState(dimPositions, dimState, { x: plan.maxX, y: 0.04, z: plan.maxZ }, { x: plan.maxX, y: 0.04, z: plan.dimZ });
  addLineToState(dimPositions, dimState, { x: plan.dimX, y: 0.04, z: plan.minZ }, { x: plan.dimX, y: 0.04, z: plan.maxZ });
  addLineToState(dimPositions, dimState, { x: plan.dimX - 0.09, y: 0.04, z: plan.minZ }, { x: plan.dimX + 0.09, y: 0.04, z: plan.minZ });
  addLineToState(dimPositions, dimState, { x: plan.dimX - 0.09, y: 0.04, z: plan.maxZ }, { x: plan.dimX + 0.09, y: 0.04, z: plan.maxZ });
  addLineToState(dimPositions, dimState, { x: plan.maxX, y: 0.04, z: plan.minZ }, { x: plan.dimX, y: 0.04, z: plan.minZ });
  addLineToState(dimPositions, dimState, { x: plan.maxX, y: 0.04, z: plan.maxZ }, { x: plan.dimX, y: 0.04, z: plan.maxZ });

  setLineCount(gridGeometry, Math.round(gridState.count * sequence.plan));
  setLineCount(modelGeometry, Math.round(modelState.count * sequence.plan));
  setLineCount(dimGeometry, Math.round(dimState.count * sequence.planDims));
}

function updateDocumentationElevation(modelGeometry, dimGeometry, params, visibleLevels, sequence) {
  const modelPositions = modelGeometry.attributes.position.array;
  const dimPositions = dimGeometry.attributes.position.array;
  const modelState = { offset: 0, count: 0 };
  const dimState = { offset: 0, count: 0 };
  const levelCount = Math.max(1, visibleLevels);
  const datumLevels = [];
  for (let level = 0; level < levelCount; level += 10) {
    datumLevels.push(level);
  }
  if (datumLevels[datumLevels.length - 1] !== levelCount) {
    datumLevels.push(levelCount);
  }
  const minY = BASE_Y;
  const maxY = towerPoint(levelCount, 0, params).y;
  const envelopes = [];

  for (let level = 0; level <= levelCount; level += 1) {
    const points = Array.from({ length: SEGMENTS }, (_, segment) => towerPoint(level, segment, params));
    const y = points[0].y;
    const left = { x: Math.min(...points.map((point) => point.x)), y, z: 0 };
    const right = { x: Math.max(...points.map((point) => point.x)), y, z: 0 };

    addLineToState(modelPositions, modelState, left, right);
    envelopes.push({ left, right, y });

    if (level > 0) {
      const previous = envelopes[level - 1];
      addLineToState(modelPositions, modelState, previous.left, left);
      addLineToState(modelPositions, modelState, previous.right, right);
    }
  }

  for (let bay = 1; bay < 10; bay += 1) {
    const bayPosition = bay / 10;

    for (let level = 0; level < envelopes.length - 1; level += 1) {
      const current = envelopes[level];
      const next = envelopes[level + 1];

      addLineToState(
        modelPositions,
        modelState,
        { x: lerp(current.left.x, current.right.x, bayPosition), y: current.y, z: 0.014 },
        { x: lerp(next.left.x, next.right.x, bayPosition), y: next.y, z: 0.014 },
      );
    }
  }

  const coreLeft = -0.24;
  const coreRight = 0.24;
  const coreBottom = minY + 0.08;
  const coreTop = maxY - 0.08;
  addRectangleLines(modelPositions, modelState, [
    { x: coreLeft, y: coreBottom, z: 0.02 },
    { x: coreRight, y: coreBottom, z: 0.02 },
    { x: coreRight, y: coreTop, z: 0.02 },
    { x: coreLeft, y: coreTop, z: 0.02 },
  ]);

  datumLevels.slice(1, -1).forEach((level) => {
    const y = towerPoint(level, 0, params).y;
    addLineToState(modelPositions, modelState, { x: coreLeft, y, z: 0.022 }, { x: coreRight, y, z: 0.022 });
  });

  addLineToState(dimPositions, dimState, { x: -1.62, y: minY, z: 0.03 }, { x: -1.62, y: maxY, z: 0.03 });
  addLineToState(dimPositions, dimState, { x: -1.72, y: minY, z: 0.03 }, { x: -1.52, y: minY, z: 0.03 });
  addLineToState(dimPositions, dimState, { x: -1.72, y: maxY, z: 0.03 }, { x: -1.52, y: maxY, z: 0.03 });

  datumLevels.forEach((level) => {
    const y = towerPoint(level, 0, params).y;
    addLineToState(dimPositions, dimState, { x: 1.06, y, z: 0.03 }, { x: 1.72, y, z: 0.03 });
  });

  setLineCount(modelGeometry, Math.round(modelState.count * sequence.elevation));
  setLineCount(dimGeometry, Math.round(dimState.count * sequence.elevationDims));
}

function updateDocumentationElevationGlazing(geometry, params, visibleLevels, progress) {
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;
  const coolGlass = new Color(0x185bff);
  const brightGlass = new Color(0x67dcff);
  const violetGlass = new Color(0xa06dff);
  let positionOffset = 0;
  let colorOffset = 0;
  let panelCount = 0;

  for (let level = 0; level < MAX_LEVELS; level += 1) {
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const normal = panelNormal(segment, level, params);
      if (normal.z < 0.02) continue;

      const nextSegment = (segment + 1) % SEGMENTS;
      const panelBottomA = lerpPoint(towerPoint(level, segment, params), towerPoint(level + 1, segment, params), 0.12);
      const panelBottomB = lerpPoint(towerPoint(level, nextSegment, params), towerPoint(level + 1, nextSegment, params), 0.12);
      const panelTopA = lerpPoint(towerPoint(level, segment, params), towerPoint(level + 1, segment, params), 0.88);
      const panelTopB = lerpPoint(towerPoint(level, nextSegment, params), towerPoint(level + 1, nextSegment, params), 0.88);
      const p00 = toElevationPoint(lerpPoint(panelBottomA, panelBottomB, 0.08), -0.035);
      const p01 = toElevationPoint(lerpPoint(panelBottomA, panelBottomB, 0.92), -0.035);
      const p10 = toElevationPoint(lerpPoint(panelTopA, panelTopB, 0.08), -0.035);
      const p11 = toElevationPoint(lerpPoint(panelTopA, panelTopB, 0.92), -0.035);
      const glassBlend = clamp((normal.z - 0.02) / 0.98);
      const levelTint = 0.12 + ((level * 2 + segment) % 6) * 0.07;
      const color = mixColor(
        mixColor(coolGlass, brightGlass, glassBlend),
        violetGlass,
        levelTint,
      );

      [p00, p10, p01, p01, p10, p11].forEach((point) => {
        writePoint(positions, positionOffset, point);
        writeColor(colors, colorOffset, color);
        positionOffset += 3;
        colorOffset += 3;
      });
      panelCount += 1;
    }
  }

  setMeshVertexCount(geometry, Math.round(panelCount * progress) * 6);
}

function updateDocumentationSectionLines(geometry, params, visibleLevels, sequence) {
  const positions = geometry.attributes.position.array;
  const state = { offset: 0, count: 0 };
  const levelStep = Math.max(1, Math.round(visibleLevels / 8));

  for (let level = 0; level <= visibleLevels; level += levelStep) {
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      addLineToState(
        positions,
        state,
        offsetTowerPoint(level, segment, params, 0.035),
        offsetTowerPoint(level, (segment + 1) % SEGMENTS, params, 0.035),
      );
    }
  }

  CARDINAL_SEGMENTS.forEach((segment) => {
    addLineToState(
      positions,
      state,
      offsetTowerPoint(0, segment, params, 0.05),
      offsetTowerPoint(visibleLevels, segment, params, 0.05),
    );
  });

  setLineCount(geometry, Math.round(state.count * sequence.section));
}

function updateDocumentationSectionFacade(geometry, params, visibleLevels, progress) {
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;
  const facadeColor = new Color(0x2aa8ff);
  const accentColor = new Color(0xeaf5ff);
  let positionOffset = 0;
  let colorOffset = 0;
  let panelCount = 0;

  for (let level = 0; level < MAX_LEVELS; level += 1) {
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      if (segment >= 8 && segment <= 10) continue;
      const p00 = offsetTowerPoint(level, segment, params, 0.02);
      const p10 = offsetTowerPoint(level + 1, segment, params, 0.02);
      const p01 = offsetTowerPoint(level, (segment + 1) % SEGMENTS, params, 0.02);
      const p11 = offsetTowerPoint(level + 1, (segment + 1) % SEGMENTS, params, 0.02);
      const color = mixColor(facadeColor, accentColor, ((level + segment) % 4) * 0.08);

      [p00, p10, p01, p01, p10, p11].forEach((point) => {
        writePoint(positions, positionOffset, point);
        writeColor(colors, colorOffset, color);
        positionOffset += 3;
        colorOffset += 3;
      });
      panelCount += 1;
    }
  }

  const visiblePanels = Math.round(Math.min(panelCount, visibleLevels * (SEGMENTS - 3)) * progress);
  setMeshVertexCount(geometry, visiblePanels * 6);
}

function updateDocumentationCameras(view, width, height, fitWidth, fitHeight, padding = 1.08) {
  const aspect = Math.max(0.2, width / Math.max(1, height));
  const halfHeight = Math.max(fitHeight / 2, fitWidth / (2 * aspect)) * padding;

  view.camera.left = -halfHeight * aspect;
  view.camera.right = halfHeight * aspect;
  view.camera.top = halfHeight;
  view.camera.bottom = -halfHeight;
  view.camera.updateProjectionMatrix();
}

const sectionClipPoint = new Vector3();
const sectionClipNormal = new Vector3();
const sectionClipQuaternion = new Quaternion();

function updateSectionClipPlane(sectionView) {
  const cutX = sectionView.cutPlane.position.x;
  sectionView.group.updateMatrixWorld(true);
  sectionClipPoint.set(cutX, 0, 0);
  sectionView.group.localToWorld(sectionClipPoint);
  sectionClipNormal.set(-1, 0, 0).applyQuaternion(sectionView.group.getWorldQuaternion(sectionClipQuaternion)).normalize();
  sectionView.clipPlane.setFromNormalAndCoplanarPoint(sectionClipNormal, sectionClipPoint);
}

function getDocumentationViewRects(width, height, isCompact) {
  const gap = isCompact ? 8 : 12;

  if (isCompact) {
    const viewHeight = Math.max(1, Math.floor((height - gap * 2) / 3));
    return {
      section: { x: 0, y: 0, width, height: viewHeight },
      elevation: { x: 0, y: viewHeight + gap, width, height: viewHeight },
      plan: { x: 0, y: (viewHeight + gap) * 2, width, height: Math.max(1, height - (viewHeight + gap) * 2) },
    };
  }

  const topInset = isCompact ? 0 : Math.min(64, Math.max(46, height * 0.12));
  const leftViewHeight = Math.max(1, height - topInset);
  const leftWidth = Math.max(1, Math.floor((width - gap) * 0.5));
  const sectionWidth = Math.max(1, width - leftWidth - gap);
  const elevationHeight = Math.max(1, Math.floor((leftViewHeight - gap) * 0.72));
  const planHeight = Math.max(1, leftViewHeight - elevationHeight - gap);

  return {
    elevation: { x: 0, y: 0, width: leftWidth, height: elevationHeight },
    plan: { x: 0, y: elevationHeight + gap, width: leftWidth, height: planHeight },
    section: { x: leftWidth + gap, y: 0, width: sectionWidth, height },
  };
}

function updateDocumentationViews(docViews, params, visibleLevels, phase, reducedMotion) {
  const sequence = getDocumentationSequence(phase, reducedMotion);
  const sceneHeight = MAX_SCENE_HEIGHT * (params.totalHeight / MAX_TOTAL_HEIGHT);

  updateDocumentationPlan(docViews.plan.gridGeometry, docViews.plan.modelGeometry, docViews.plan.dimGeometry, params, sequence);
  updateDocumentationElevation(docViews.elevation.modelGeometry, docViews.elevation.dimGeometry, params, visibleLevels, sequence);
  updateDocumentationElevationGlazing(docViews.elevation.glazingGeometry, params, visibleLevels, sequence.elevation);
  updateDocumentationSectionLines(docViews.section.lineGeometry, params, visibleLevels, sequence);
  updateDocumentationSectionFacade(docViews.section.facadeGeometry, params, visibleLevels, sequence.section);
  updateBimFloorSlabs(docViews.section.slabGeometry, params, visibleLevels, sequence.section);
  updateCoreLines(docViews.section.coreLineGeometry, params, sequence.section);

  docViews.section.coreMesh.position.set(0, BASE_Y + (sceneHeight * sequence.section) / 2, 0);
  docViews.section.coreMesh.scale.set(0.34, Math.max(0.001, sceneHeight * sequence.section), 0.24);
  docViews.section.cutPlane.position.set(lerp(-0.7, 0.42, sequence.cut), BASE_Y + sceneHeight / 2, -0.05);
  docViews.section.cutPlane.scale.set(1, Math.max(0.001, sceneHeight), 1.45);
  docViews.section.cutPlaneOutline.position.copy(docViews.section.cutPlane.position);
  docViews.section.cutPlaneOutline.scale.set(1, Math.max(0.001, sceneHeight), 1.48);
  updateSectionClipPlane(docViews.section);

  setMaterialOpacity(docViews.plan.gridMaterial, 0.34 * sequence.plan);
  setMaterialOpacity(docViews.plan.modelMaterial, 0.9 * sequence.plan);
  setMaterialOpacity(docViews.plan.dimMaterial, 0.5 * sequence.planDims);
  setMaterialOpacity(docViews.elevation.modelMaterial, 0.94 * sequence.elevation);
  setMaterialOpacity(docViews.elevation.glazingMaterial, 0.56 * sequence.elevation);
  setMaterialOpacity(docViews.elevation.dimMaterial, 0.38 * sequence.elevationDims);
  setMaterialOpacity(docViews.section.lineMaterial, 0.8 * sequence.section);
  setMaterialOpacity(docViews.section.slabMaterial, 0.44 * sequence.section);
  setMaterialOpacity(docViews.section.facadeMaterial, 0.22 * sequence.section);
  setMaterialOpacity(docViews.section.coreMaterial, 0.14 * sequence.section);
  setMaterialOpacity(docViews.section.coreLineMaterial, 0.78 * sequence.section);
  setMaterialOpacity(docViews.section.cutPlaneMaterial, 0.045 * sequence.cut);
  setMaterialOpacity(docViews.section.cutPlaneOutlineMaterial, 0.48 * sequence.cut);

  setSpritesOpacity(docViews.plan.labels, Math.max(sequence.plan, sequence.planDims));
  setSpritesOpacity(docViews.elevation.labels, Math.max(sequence.elevation, sequence.elevationDims));
  setSpritesOpacity(docViews.section.labels, sequence.section);
}

function renderDocumentationViews(renderer, docViews, viewportSize, isCompact) {
  const { width, height } = viewportSize;
  const rects = getDocumentationViewRects(width, height, isCompact);

  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.clear(true, true, true);
  renderer.setScissorTest(true);

  updateDocumentationCameras(docViews.plan, rects.plan.width, rects.plan.height, 4.55, 3.1, 1.08);
  updateDocumentationCameras(docViews.elevation, rects.elevation.width, rects.elevation.height, 5.25, 5.34, 1.04);
  docViews.section.camera.aspect = rects.section.width / Math.max(1, rects.section.height);
  docViews.section.camera.updateProjectionMatrix();

  [
    [docViews.plan, rects.plan],
    [docViews.elevation, rects.elevation],
    [docViews.section, rects.section],
  ].forEach(([view, rect]) => {
    renderer.setViewport(rect.x, rect.y, rect.width, rect.height);
    renderer.setScissor(rect.x, rect.y, rect.width, rect.height);
    renderer.clearDepth();
    renderer.render(view.scene, view.camera);
  });

  renderer.setScissorTest(false);
}

function formatSliderValue(definition, value) {
  return `${Number(value).toFixed(definition.decimals)}${definition.unit}`;
}

function sliderProgress(definition, value) {
  return clamp((value - definition.min) / (definition.max - definition.min));
}

function approach(current, target, amount) {
  return current + (target - current) * amount;
}

const materialColorTarget = new Color();

function approachMaterialOpacity(material, target, reducedMotion, amount = 0.12) {
  material.opacity = reducedMotion ? target : approach(material.opacity, target, amount);
}

function approachMaterialColor(material, target, reducedMotion, amount = 0.08) {
  if (typeof target === "number") {
    materialColorTarget.setHex(target);
  } else {
    materialColorTarget.copy(target);
  }

  if (reducedMotion) {
    material.color.copy(materialColorTarget);
    return;
  }

  material.color.lerp(materialColorTarget, amount);
}

function applyView(rootGroup, camera, isCompact, isAnalysis, isBim, reducedMotion) {
  const designView = {
    rotationX: -0.08,
    rotationY: 0.34,
    x: 0,
    y: isCompact ? 0.04 : -0.6,
    z: isCompact ? 10.65 : 8.3,
    cameraY: isCompact ? 1.22 : 1.22,
    fov: 34,
  };
  const target = isAnalysis
    ? {
      ...designView,
    }
    : isBim
      ? {
        ...designView,
      }
      : designView;
  const amount = reducedMotion ? 1 : 0.045;

  rootGroup.rotation.x = approach(rootGroup.rotation.x, target.rotationX, amount);
  rootGroup.rotation.y = approach(rootGroup.rotation.y, target.rotationY, amount);
  rootGroup.position.x = approach(rootGroup.position.x, target.x, amount);
  rootGroup.position.y = approach(rootGroup.position.y, target.y, amount);
  camera.position.y = approach(camera.position.y, target.cameraY, amount);
  camera.position.z = approach(camera.position.z, target.z, amount);
  camera.fov = approach(camera.fov, target.fov, amount);
  camera.updateProjectionMatrix();
}

function disposeObject(object) {
  object.material?.map?.dispose?.();
  object.geometry?.dispose();
  object.material?.dispose();
}

function disposeTree(root) {
  root.traverse?.((object) => disposeObject(object));
}

function normalizeStageIndex(stage) {
  return Math.min(Math.max(Number(stage) || 0, 0), STAGE_KEYS.length - 1);
}

export default function ParametricModelAnimation({ activeStage = 0, isPlaying = true, reducedMotion = false, restartKey = 0, onReady }) {
  const stageIndex = normalizeStageIndex(activeStage);
  const viewportRef = useRef(null);
  const animationRef = useRef(0);
  const renderRef = useRef(null);
  const updateModelRef = useRef(null);
  const startLoopRef = useRef(null);
  const stopLoopRef = useRef(null);
  const activeStageRef = useRef(stageIndex);
  const isPlayingRef = useRef(isPlaying);
  const stageStartedAtRef = useRef(0);
  const lastHudUpdateRef = useRef(0);
  const layoutRef = useRef({ isCompact: false, viewportSize: { width: 1, height: 1 } });
  const [failed, setFailed] = useState(false);
  const [hud, setHud] = useState(() => getDesignHudState(getDesignParams(0.82, true)));

  useEffect(() => {
    activeStageRef.current = stageIndex;
    stageStartedAtRef.current = performance.now();
    lastHudUpdateRef.current = 0;
    updateModelRef.current?.();
    renderRef.current?.();
  }, [stageIndex]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;

    if (isPlaying) {
      stageStartedAtRef.current = performance.now();
      lastHudUpdateRef.current = 0;
      updateModelRef.current?.();
      renderRef.current?.();
      startLoopRef.current?.();
      return;
    }

    stopLoopRef.current?.();
  }, [isPlaying, restartKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 100);
    const towerGroup = new Group();
    const rootGroup = new Group();
    const startedAt = performance.now();

    stageStartedAtRef.current = startedAt;
    rootGroup.rotation.x = -0.08;
    rootGroup.rotation.y = 0.34;
    rootGroup.position.set(0, -0.6, 0);
    scene.add(rootGroup);
    rootGroup.add(towerGroup);
    camera.position.set(0, 1.22, 8.3);

    let renderer;

    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setFailed(true);
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.localClippingEnabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.className = "model-animation__canvas";
    viewport.appendChild(renderer.domElement);

    const docPlanScene = new Scene();
    const docElevationScene = new Scene();
    const docSectionScene = new Scene();
    const docPlanCamera = new OrthographicCamera(-2, 2, 1.5, -1.5, 0.1, 50);
    const docElevationCamera = new OrthographicCamera(-2, 2, 2, -2, 0.1, 50);
    const docSectionCamera = new PerspectiveCamera(39, 1, 0.1, 100);
    const docSectionGroup = new Group();
    const docSectionClipPlane = new Plane(new Vector3(-1, 0, 0), 0);

    docPlanCamera.position.set(0, 8, 0);
    docPlanCamera.up.set(0, 0, -1);
    docPlanCamera.lookAt(0, 0, 0);
    docElevationCamera.position.set(0, 0, 8);
    docElevationCamera.lookAt(0, 0, 0);
    docSectionCamera.position.set(5.25, 1.9, 8.65);
    docSectionCamera.lookAt(0, 0.34, 0);
    docSectionGroup.rotation.y = -0.42;
    docSectionScene.add(docSectionGroup);

    const docPlanFrameGeometry = createLineGeometry(DOC_FRAME_LINE_CAPACITY);
    const docElevationFrameGeometry = createLineGeometry(DOC_FRAME_LINE_CAPACITY);
    const docPlanGridGeometry = createLineGeometry(DOC_PLAN_LINE_CAPACITY);
    const docPlanModelGeometry = createLineGeometry(DOC_PLAN_LINE_CAPACITY);
    const docPlanDimGeometry = createLineGeometry(DOC_PLAN_LINE_CAPACITY);
    const docElevationModelGeometry = createLineGeometry(DOC_ELEVATION_LINE_CAPACITY);
    const docElevationGlazingGeometry = createMeshGeometry(MAX_LEVELS * SEGMENTS * 6);
    const docElevationDimGeometry = createLineGeometry(DOC_ELEVATION_LINE_CAPACITY);
    const docSectionLineGeometry = createLineGeometry(DOC_SECTION_LINE_CAPACITY);
    const docSectionSlabGeometry = createMeshGeometry((MAX_LEVELS + 1) * BIM_SLAB_VERTICES_PER_FLOOR);
    const docSectionFacadeGeometry = createMeshGeometry(MAX_LEVELS * SEGMENTS * 6);
    const docSectionCoreLineGeometry = createLineGeometry(12);
    const docSectionCoreGeometry = new BoxGeometry(1, 1, 1);
    const docSectionCutPlaneGeometry = new BoxGeometry(0.02, 1, 1);
    const docSectionCutPlaneOutlineGeometry = createLineGeometry(12);

    updateDocumentationFrame(docPlanFrameGeometry, "xz");
    updateDocumentationFrame(docElevationFrameGeometry, "xy");
    updateSectionCutPlaneOutline(docSectionCutPlaneOutlineGeometry);

    const docPlanFrameMaterial = new LineBasicMaterial({ color: 0x7dbfff, transparent: true, opacity: 0.28 });
    const docElevationFrameMaterial = new LineBasicMaterial({ color: 0x7dbfff, transparent: true, opacity: 0.28 });
    const docPlanGridMaterial = new LineBasicMaterial({ color: 0x7dbfff, transparent: true, opacity: 0 });
    const docPlanModelMaterial = new LineBasicMaterial({ color: 0xeaf5ff, transparent: true, opacity: 0 });
    const docPlanDimMaterial = new LineBasicMaterial({ color: 0x31ff5c, transparent: true, opacity: 0 });
    const docElevationModelMaterial = new LineBasicMaterial({ color: 0xeaf5ff, transparent: true, opacity: 0 });
    const docElevationGlazingMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, vertexColors: true });
    const docElevationDimMaterial = new LineBasicMaterial({ color: 0x31ff5c, transparent: true, opacity: 0 });
    const docSectionLineMaterial = new LineBasicMaterial({ color: 0x8ed0ff, transparent: true, opacity: 0 });
    const docSectionSlabMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, vertexColors: true });
    const docSectionFacadeMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, vertexColors: true });
    const docSectionCoreMaterial = new MeshBasicMaterial({ color: 0xf6fbff, transparent: true, opacity: 0, depthWrite: false });
    const docSectionCoreLineMaterial = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const docSectionCutPlaneMaterial = new MeshBasicMaterial({ color: 0x31ff5c, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false });
    const docSectionCutPlaneOutlineMaterial = new LineBasicMaterial({ color: 0x31ff5c, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    [docSectionLineMaterial, docSectionSlabMaterial, docSectionFacadeMaterial, docSectionCoreMaterial, docSectionCoreLineMaterial].forEach((material) => {
      material.clippingPlanes = [docSectionClipPlane];
      material.clipIntersection = false;
    });

    const docPlanFrame = new LineSegments(docPlanFrameGeometry, docPlanFrameMaterial);
    const docElevationFrame = new LineSegments(docElevationFrameGeometry, docElevationFrameMaterial);
    const docPlanGrid = new LineSegments(docPlanGridGeometry, docPlanGridMaterial);
    const docPlanModel = new LineSegments(docPlanModelGeometry, docPlanModelMaterial);
    const docPlanDims = new LineSegments(docPlanDimGeometry, docPlanDimMaterial);
    const docElevationModel = new LineSegments(docElevationModelGeometry, docElevationModelMaterial);
    const docElevationGlazing = new Mesh(docElevationGlazingGeometry, docElevationGlazingMaterial);
    const docElevationDims = new LineSegments(docElevationDimGeometry, docElevationDimMaterial);
    const docSectionLines = new LineSegments(docSectionLineGeometry, docSectionLineMaterial);
    const docSectionSlabs = new Mesh(docSectionSlabGeometry, docSectionSlabMaterial);
    const docSectionFacade = new Mesh(docSectionFacadeGeometry, docSectionFacadeMaterial);
    const docSectionCore = new Mesh(docSectionCoreGeometry, docSectionCoreMaterial);
    const docSectionCoreLines = new LineSegments(docSectionCoreLineGeometry, docSectionCoreLineMaterial);
    const docSectionCutPlane = new Mesh(docSectionCutPlaneGeometry, docSectionCutPlaneMaterial);
    const docSectionCutPlaneOutline = new LineSegments(docSectionCutPlaneOutlineGeometry, docSectionCutPlaneOutlineMaterial);

    docPlanScene.add(docPlanFrame, docPlanGrid, docPlanModel, docPlanDims);
    docElevationScene.add(docElevationFrame, docElevationGlazing, docElevationModel, docElevationDims);
    docSectionGroup.add(docSectionFacade, docSectionSlabs, docSectionCore, docSectionCoreLines, docSectionLines, docSectionCutPlane, docSectionCutPlaneOutline);

    const addDocLabel = (scene, text, position, options = {}) => {
      const label = createTextSprite(text, options);
      label.position.set(position.x, position.y, position.z);
      label.material.opacity = 0;
      scene.add(label);
      return label;
    };

    const docLabelParams = getDesignParams(1, true);
    const docPlanData = getDocumentationPlanData(docLabelParams);
    const docPlanLabels = [
      addDocLabel(docPlanScene, `A-201 / PLANTA TIPO N${docPlanData.level} / ESC 1:100`, { x: -1.28, y: 0.05, z: 1.32 }, { color: "#31ff5c", height: 0.095 }),
      addDocLabel(docPlanScene, docPlanData.widthLabel, { x: docPlanData.centerX, y: 0.05, z: docPlanData.dimZ + 0.11 }, { color: "#b8ffd2", height: 0.065, background: "rgba(2,9,18,0.38)", opacity: 0.72 }),
      addDocLabel(docPlanScene, docPlanData.depthLabel, { x: docPlanData.dimX + 0.17, y: 0.05, z: docPlanData.centerZ }, { color: "#b8ffd2", height: 0.065, background: "rgba(2,9,18,0.38)", opacity: 0.72 }),
      addDocLabel(docPlanScene, "N", { x: 1.68, y: 0.05, z: -1.28 }, { color: "#eaf5ff", height: 0.08, background: "rgba(2,9,18,0.42)" }),
    ];
    const docMidLevel = Math.round(MAX_LEVELS / 20) * 10;
    const docTopY = towerPoint(MAX_LEVELS, 0, docLabelParams).y;
    const docMidY = towerPoint(docMidLevel, 0, docLabelParams).y;
    const docElevationLabels = [
      addDocLabel(docElevationScene, "A-301 / ELEVACION FRONTAL", { x: -1.02, y: -1.56, z: 0.06 }, { color: "#31ff5c", height: 0.11 }),
      addDocLabel(docElevationScene, `ALTURA TOTAL ${Math.round(docLabelParams.totalHeight)} M`, { x: -1.86, y: 0.58, z: 0.06 }, { color: "#b8ffd2", height: 0.07, background: "rgba(2,9,18,0.38)", opacity: 0.72 }),
      addDocLabel(docElevationScene, "N00", { x: 1.9, y: BASE_Y, z: 0.06 }, { height: 0.07, background: "rgba(2,9,18,0.42)" }),
      addDocLabel(docElevationScene, `N${docMidLevel}`, { x: 1.9, y: docMidY, z: 0.06 }, { height: 0.07, background: "rgba(2,9,18,0.42)" }),
      addDocLabel(docElevationScene, `N${MAX_LEVELS}`, { x: 1.9, y: docTopY, z: 0.06 }, { height: 0.07, background: "rgba(2,9,18,0.42)" }),
    ];
    const docSectionLabels = [
      addDocLabel(docSectionScene, "A-401 / CORTE 3D", { x: -1.3, y: -1.38, z: 0.3 }, { color: "#31ff5c", height: 0.12 }),
      addDocLabel(docSectionScene, "PLANO DE CORTE", { x: 0.7, y: 0.9, z: 0.2 }, { color: "#31ff5c", height: 0.09, background: "rgba(2,9,18,0.52)" }),
    ];

    const docViews = {
      plan: {
        scene: docPlanScene,
        camera: docPlanCamera,
        frameGeometry: docPlanFrameGeometry,
        gridGeometry: docPlanGridGeometry,
        modelGeometry: docPlanModelGeometry,
        dimGeometry: docPlanDimGeometry,
        gridMaterial: docPlanGridMaterial,
        modelMaterial: docPlanModelMaterial,
        dimMaterial: docPlanDimMaterial,
        labels: docPlanLabels,
      },
      elevation: {
        scene: docElevationScene,
        camera: docElevationCamera,
        frameGeometry: docElevationFrameGeometry,
        modelGeometry: docElevationModelGeometry,
        glazingGeometry: docElevationGlazingGeometry,
        dimGeometry: docElevationDimGeometry,
        modelMaterial: docElevationModelMaterial,
        glazingMaterial: docElevationGlazingMaterial,
        dimMaterial: docElevationDimMaterial,
        labels: docElevationLabels,
      },
      section: {
        scene: docSectionScene,
        camera: docSectionCamera,
        group: docSectionGroup,
        lineGeometry: docSectionLineGeometry,
        slabGeometry: docSectionSlabGeometry,
        facadeGeometry: docSectionFacadeGeometry,
        coreLineGeometry: docSectionCoreLineGeometry,
        lineMaterial: docSectionLineMaterial,
        slabMaterial: docSectionSlabMaterial,
        facadeMaterial: docSectionFacadeMaterial,
        coreMaterial: docSectionCoreMaterial,
        coreLineMaterial: docSectionCoreLineMaterial,
        cutPlaneMaterial: docSectionCutPlaneMaterial,
        cutPlaneOutlineMaterial: docSectionCutPlaneOutlineMaterial,
        clipPlane: docSectionClipPlane,
        coreMesh: docSectionCore,
        cutPlane: docSectionCutPlane,
        cutPlaneOutline: docSectionCutPlaneOutline,
        labels: docSectionLabels,
      },
    };

    const facadeGeometry = createFacadeGeometry();
    const footprintGeometry = createLineGeometry(SEGMENTS);
    const floorGeometry = createLineGeometry((MAX_LEVELS + 1) * SEGMENTS);
    const ribGeometry = createLineGeometry(MAX_LEVELS * SEGMENTS);
    const guideGeometry = createLineGeometry(MAX_LEVELS * 4);
    const coreLineGeometry = createLineGeometry(12);
    const sunPathGeometry = createLineGeometry(SUN_PATH_LINE_CAPACITY);
    const sunRayGeometry = createLineGeometry(4);
    const bimSlabGeometry = createMeshGeometry((MAX_LEVELS + 1) * BIM_SLAB_VERTICES_PER_FLOOR);
    const bimGlazingGeometry = createMeshGeometry(MAX_LEVELS * SEGMENTS * BIM_GLAZING_VERTICES_PER_PANEL);
    const bimGlazingLineGeometry = createLineGeometry(MAX_LEVELS * SEGMENTS * BIM_GLAZING_LINES_PER_PANEL);
    const bimStructureGeometry = createMeshGeometry(MAX_LEVELS * SEGMENTS * BIM_STRUCTURE_VERTICES_PER_RIB);
    const coreGeometry = new BoxGeometry(1, 1, 1);
    const sunGeometry = new SphereGeometry(0.08, 18, 12);

    const facadeMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.16,
      side: DoubleSide,
      depthWrite: false,
      vertexColors: true,
    });
    const footprintMaterial = new LineBasicMaterial({ color: 0x31ff5c, transparent: true, opacity: 0.88 });
    const floorMaterial = new LineBasicMaterial({ color: 0x8ed0ff, transparent: true, opacity: 0.68 });
    const ribMaterial = new LineBasicMaterial({ color: 0x35a8ff, transparent: true, opacity: 0.76 });
    const guideMaterial = new LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.32 });
    const coreMaterial = new MeshBasicMaterial({ color: 0x77c4ff, transparent: true, opacity: 0.08, depthWrite: false });
    const coreLineMaterial = new LineBasicMaterial({ color: 0xb8e4ff, transparent: true, opacity: 0.36 });
    const sunPathMaterial = new LineBasicMaterial({ color: 0xff5a3d, transparent: true, opacity: 0 });
    const sunRayMaterial = new LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0 });
    const sunMaterial = new MeshBasicMaterial({ color: 0xffe164, transparent: true, opacity: 0 });
    const bimSlabMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, vertexColors: true });
    const bimGlazingMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, vertexColors: true });
    const bimGlazingLineMaterial = new LineBasicMaterial({ color: 0xe7fbff, transparent: true, opacity: 0 });
    const bimStructureMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, vertexColors: true });

    const facadeMesh = new Mesh(facadeGeometry, facadeMaterial);
    const coreMesh = new Mesh(coreGeometry, coreMaterial);
    const bimSlabMesh = new Mesh(bimSlabGeometry, bimSlabMaterial);
    const bimGlazingMesh = new Mesh(bimGlazingGeometry, bimGlazingMaterial);
    const bimGlazingLines = new LineSegments(bimGlazingLineGeometry, bimGlazingLineMaterial);
    const bimStructureMesh = new Mesh(bimStructureGeometry, bimStructureMaterial);
    const sunMarker = new Mesh(sunGeometry, sunMaterial);
    const footprintLines = new LineSegments(footprintGeometry, footprintMaterial);
    const floorLines = new LineSegments(floorGeometry, floorMaterial);
    const ribLines = new LineSegments(ribGeometry, ribMaterial);
    const guideLines = new LineSegments(guideGeometry, guideMaterial);
    const coreLines = new LineSegments(coreLineGeometry, coreLineMaterial);
    const sunPathLines = new LineSegments(sunPathGeometry, sunPathMaterial);
    const sunRayLines = new LineSegments(sunRayGeometry, sunRayMaterial);

    towerGroup.add(facadeMesh, bimSlabMesh, coreMesh, bimGlazingMesh, bimGlazingLines, bimStructureMesh, footprintLines, floorLines, ribLines, guideLines, coreLines, sunPathLines, sunRayLines, sunMarker);

    const renderScene = () => {
      if (activeStageRef.current === 3) {
        renderDocumentationViews(renderer, docViews, layoutRef.current.viewportSize, layoutRef.current.viewportSize.width < 300);
        return;
      }

      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, layoutRef.current.viewportSize.width, layoutRef.current.viewportSize.height);
      renderer.render(scene, camera);
    };
    renderRef.current = renderScene;

    const updateModel = (time = 0) => {
      const stage = activeStageRef.current;
      const isAnalysis = stage === 1;
      const isBim = stage === 2;
      const isDocumentation = stage === 3;
      const elapsed = reducedMotion ? 0 : Math.max(0, performance.now() - stageStartedAtRef.current);
      const duration = isAnalysis ? ANALYSIS_LOOP_DURATION : isBim ? BIM_LOOP_DURATION : isDocumentation ? DOCUMENTATION_LOOP_DURATION : DESIGN_LOOP_DURATION;
      const phase = reducedMotion ? 0.72 : isDocumentation ? (elapsed % duration) / duration : clamp(elapsed / duration);
      const mergedProgress = isDocumentation ? 0 : stage + phase;
      const designPhase = isDocumentation ? 1 : stage === 0 ? phase : 1;
      const analysisPhase = isDocumentation ? phase : clamp((mergedProgress - 0.94) / 1.06);
      const bimPhase = isDocumentation ? phase : clamp((mergedProgress - 1.94) / 1.06);
      const analysisBlend = isDocumentation
        ? 0
        : smoothstep(0.94, 1.04, mergedProgress) * (1 - smoothstep(1.94, 2.04, mergedProgress));
      const bimBlend = isDocumentation ? 0 : smoothstep(1.94, 2.04, mergedProgress);
      const mergedModelBlend = Math.max(analysisBlend, bimBlend);
      const params = isDocumentation ? getDesignParams(0.82, true) : getDesignParams(designPhase, reducedMotion);
      const sequence = isDocumentation ? getDesignSequence(0.82, true) : getDesignSequence(designPhase, reducedMotion);
      const bimSequence = getBimSequence(bimPhase, reducedMotion);
      const visibleLevels = Math.max(1, Math.round(params.levels));
      const sceneHeight = MAX_SCENE_HEIGHT * (params.totalHeight / MAX_TOTAL_HEIGHT);
      const analysis = getAnalysisState(analysisPhase, reducedMotion);

      if (isDocumentation) {
        updateDocumentationViews(docViews, params, visibleLevels, phase, reducedMotion);
      }

      applyView(rootGroup, camera, layoutRef.current.isCompact, isAnalysis, isBim, reducedMotion);
      const footprintProgress = lerp(sequence.footprint, 1, mergedModelBlend);
      const coreProgress = lerp(sequence.core, 1, mergedModelBlend);
      const ribProgress = lerp(sequence.ribs, 1, mergedModelBlend);
      const guideProgress = lerp(lerp(sequence.guides, 0.72, analysisBlend), 0.86, bimBlend);
      updateFootprint(footprintGeometry, params, footprintProgress);
      updateCoreLines(coreLineGeometry, params, coreProgress);
      updateFloorBands(floorGeometry, params, visibleLevels);
      updateRibs(ribGeometry, params, visibleLevels, ribProgress);
      updateGuides(guideGeometry, params, visibleLevels, guideProgress);
      updateBimFloorSlabs(bimSlabGeometry, params, visibleLevels, bimBlend * bimSequence.slabs);
      updateBimGlazing(bimGlazingGeometry, params, visibleLevels, bimBlend * bimSequence.glazing);
      updateBimGlazingLines(bimGlazingLineGeometry, params, visibleLevels, bimBlend * bimSequence.glazing);
      updateBimStructure(bimStructureGeometry, params, visibleLevels, bimBlend * bimSequence.structure);
      const designFacadeColor = new Color(0x1f86d9);
      const bimFacadeBase = new Color(0x061a2e);
      const bimFacadeAccent = new Color(0x1b6a86);
      updateFacadeSurface(
        facadeGeometry,
        params,
        visibleLevels,
        (level, segment) => {
          const analysisColor = heatColor(getPanelRadiation(level, segment, params, analysis) / 1050);
          const bimColor = mixColor(bimFacadeBase, bimFacadeAccent, 0.08 + ((level + segment) % 5) * 0.04);
          return mixColor(mixColor(designFacadeColor, analysisColor, analysisBlend), bimColor, bimBlend);
        },
      );

      coreMesh.position.set(0, BASE_Y + (sceneHeight * coreProgress) / 2, 0);
      coreMesh.scale.set(lerp(0.34, 0.42, bimBlend), Math.max(0.001, sceneHeight * coreProgress), lerp(0.24, 0.32, bimBlend));
      towerGroup.rotation.y = 0.04 + (params.torsion * Math.PI) / 180 / 4;

      const facadeOpacity = lerp(lerp(0.04 + 0.14 * sequence.plates * sequence.fade, 0.44 * analysis.radiation, analysisBlend), 0.035 * bimSequence.glazing, bimBlend);
      const footprintOpacity = lerp(lerp(0.88 * sequence.footprint * sequence.fade, 0.82, analysisBlend), 0.72, bimBlend);
      const floorOpacity = lerp(lerp(0.24 + 0.52 * sequence.plates * sequence.fade, 0.62, analysisBlend), 0.42, bimBlend);
      const ribOpacity = lerp(lerp(0.2 + 0.62 * sequence.ribs * sequence.fade, 0.78, analysisBlend), 0.28, bimBlend);
      const guideOpacity = lerp(lerp(0.42 * sequence.guides * sequence.fade, 0.18, analysisBlend), 0, bimBlend);
      const coreOpacity = lerp(lerp(0.07 * sequence.core * sequence.fade, 0.08, analysisBlend), 0.1, bimBlend);
      const coreLineOpacity = lerp(lerp(0.34 * sequence.core * sequence.fade, 0.36, analysisBlend), 0.32, bimBlend);
      approachMaterialOpacity(facadeMaterial, isDocumentation ? 0 : facadeOpacity, reducedMotion);
      approachMaterialOpacity(bimSlabMaterial, bimBlend * 0.5 * bimSequence.slabs, reducedMotion);
      approachMaterialOpacity(bimGlazingMaterial, bimBlend * 0.88 * bimSequence.glazing, reducedMotion);
      approachMaterialOpacity(bimGlazingLineMaterial, bimBlend * 0.6 * bimSequence.glazing, reducedMotion);
      approachMaterialOpacity(bimStructureMaterial, bimBlend * 0.88 * bimSequence.structure, reducedMotion);
      approachMaterialOpacity(footprintMaterial, isDocumentation ? 0 : footprintOpacity, reducedMotion);
      approachMaterialOpacity(floorMaterial, isDocumentation ? 0 : floorOpacity, reducedMotion);
      approachMaterialOpacity(ribMaterial, isDocumentation ? 0 : ribOpacity, reducedMotion);
      approachMaterialOpacity(guideMaterial, isDocumentation ? 0 : guideOpacity, reducedMotion);
      approachMaterialOpacity(coreMaterial, isDocumentation ? 0 : coreOpacity, reducedMotion);
      approachMaterialOpacity(coreLineMaterial, isDocumentation ? 0 : coreLineOpacity, reducedMotion);
      approachMaterialColor(floorMaterial, mixColor(new Color(0x8ed0ff), new Color(0x36c7ff), bimBlend), reducedMotion);
      approachMaterialColor(ribMaterial, mixColor(new Color(0x35a8ff), new Color(0x21ff68), bimBlend), reducedMotion);
      approachMaterialColor(guideMaterial, mixColor(new Color(0xffc857), new Color(0xff9f1c), bimBlend), reducedMotion);
      approachMaterialColor(coreMaterial, mixColor(new Color(0x77c4ff), new Color(0xf6fbff), bimBlend), reducedMotion);
      approachMaterialColor(coreLineMaterial, mixColor(new Color(0xb8e4ff), new Color(0xffffff), bimBlend), reducedMotion);

      updateSunPath(sunPathGeometry, 0);
      updateSunRays(sunRayGeometry, analysis, 0);
      sunPathMaterial.opacity = 0;
      sunRayMaterial.opacity = 0;
      sunMaterial.opacity = 0;
      sunMarker.visible = false;
      sunMarker.position.copy(sunPathPoint(analysis.travel));
      sunMarker.scale.setScalar(1 + Math.sin(time * 0.004) * 0.08);

      if (reducedMotion || time - lastHudUpdateRef.current > 70) {
        lastHudUpdateRef.current = time;
        setHud(isAnalysis ? getAnalysisHudState(params, analysis) : isBim ? getBimHudState(params, phase, reducedMotion) : isDocumentation ? getDocumentationHudState(params) : getDesignHudState(params));
      }

      renderScene();
    };

    updateModelRef.current = updateModel;

    const resize = () => {
      const rect = viewport.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      layoutRef.current.isCompact = width < 520;
      layoutRef.current.viewportSize = { width, height };
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      updateModel(performance.now() - startedAt);
    };

    let loopActive = false;
    const stopLoop = () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      loopActive = false;
    };
    const tick = (time) => {
      if (!isPlayingRef.current || reducedMotion) {
        stopLoop();
        return;
      }

      updateModel(time - startedAt);
      animationRef.current = window.requestAnimationFrame(tick);
    };
    const startLoop = () => {
      if (loopActive || reducedMotion) return;
      loopActive = true;
      animationRef.current = window.requestAnimationFrame(tick);
    };
    startLoopRef.current = startLoop;
    stopLoopRef.current = stopLoop;

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();
    onReady?.();

    if (isPlayingRef.current) {
      startLoop();
    }

    return () => {
      stopLoop();
      resizeObserver.disconnect();
      [facadeMesh, bimSlabMesh, coreMesh, bimGlazingMesh, bimGlazingLines, bimStructureMesh, footprintLines, floorLines, ribLines, guideLines, coreLines, sunPathLines, sunRayLines, sunMarker].forEach(disposeObject);
      [docPlanScene, docElevationScene, docSectionScene].forEach(disposeTree);
      renderer.dispose();
      renderer.domElement.remove();
      renderRef.current = null;
      updateModelRef.current = null;
      startLoopRef.current = null;
      stopLoopRef.current = null;
    };
  }, [onReady, reducedMotion]);

  const isAnalysis = stageIndex === 1;
  const isBim = stageIndex === 2;
  const isDocumentation = stageIndex === 3;
  const readoutTitle = isAnalysis
    ? "ANÁLISIS"
    : isBim
      ? "COORDINACIÓN BIM"
      : isDocumentation
        ? "DOCUMENTACIÓN"
        : "MODELO PARAMÉTRICO";

  return (
    <div className={`model-animation model-animation--${STAGE_KEYS[stageIndex]}`}>
      <div className="model-animation__viewport" ref={viewportRef}>
        {failed ? <div className="model-animation__fallback">WebGL no disponible</div> : null}
      </div>
      <div className="model-animation__readout" key={`readout-${stageIndex}`} aria-hidden="true">
        <strong>{readoutTitle}</strong>
      </div>
      {!isAnalysis && !isBim && !isDocumentation && (
        <div className="model-animation__sliders" aria-hidden="true">
          <span className="model-animation__panel-title">Parámetros vivos</span>
          {DESIGN_SLIDERS.map((definition) => {
            const value = hud.values?.[definition.key] ?? definition.min;
            const progress = sliderProgress(definition, value);

            return (
              <div className="model-animation__slider" key={definition.key} style={{ "--value": progress }}>
                <span>{definition.label}</span>
                <strong>{formatSliderValue(definition, value)}</strong>
                <i>
                  <b />
                </i>
              </div>
            );
          })}
        </div>
      )}
      {isDocumentation && (
        <div className="model-animation__sliders model-animation__doc-legend" aria-hidden="true">
          <span className="model-animation__panel-title">Set ejecutivo</span>
          {[
            ["PLANTA", "huella + retícula", "#33a8ff"],
            ["ELEVACIÓN", "fachada general", "#f6fbff"],
            ["DETALLES", "encuentros", "#31ff5c"],
            ["CORTES", "secciones", "#86c6ff"],
            ["PLANOS DE TALLER", "fabricación", "#ff9f1c"],
          ].map(([label, text, color]) => (
            <span className="model-animation__bim-layer" key={label} style={{ "--layer-color": color }}>
              <i />
              <span>
                <strong>{label}</strong>
                <small>{text}</small>
              </span>
            </span>
          ))}
        </div>
      )}
      {isBim && (
        <div className="model-animation__sliders model-animation__bim-legend" aria-hidden="true">
          <span className="model-animation__panel-title">Capas BIM</span>
          {[
            ["LOSAS", "placas extruidas", "#145dff"],
            ["DISCIPLINAS", "modelos federados", "#21ff68"],
            ["VIDRIO", "glazing exterior", "#c98f5a"],
            ["COORD.", "guías de cruce", "#ff9f1c"],
          ].map(([label, text, color]) => (
            <span className="model-animation__bim-layer" key={label} style={{ "--layer-color": color }}>
              <i />
              <span>
                <strong>{label}</strong>
                <small>{text}</small>
              </span>
            </span>
          ))}
        </div>
      )}
      <div className="model-animation__metrics" key={`metrics-${stageIndex}`} aria-hidden="true">
        <span className="model-animation__panel-title">{isAnalysis ? "Desempeño" : isBim ? "Coordinación" : isDocumentation ? "Documentación" : "Métricas"}</span>
        {hud.metrics.map(([label, value]) => (
          <span className="model-animation__metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </span>
        ))}
      </div>
      {isAnalysis && hud.analysis ? (
        <div className="model-animation__radiation" aria-hidden="true">
          <div className="model-animation__radiation-head">
            <span>RADIACIÓN SOLAR</span>
            <strong>FACHADA / MAPA 2D</strong>
          </div>
          <div className="model-animation__analysis-readouts">
            <span>HORA SOLAR <strong>{hud.analysis.hour}</strong></span>
            <span>AZIMUT <strong>{hud.analysis.azimuth}</strong></span>
            <span>ALTITUD <strong>{hud.analysis.altitude}</strong></span>
            <span>MAX <strong>{hud.analysis.max}</strong></span>
            <span>PROM <strong>{hud.analysis.average}</strong></span>
          </div>
          <div className="model-animation__radiation-body">
            <div className="model-animation__heatmap">
              {hud.analysis.cells.map((cell, index) => (
                <span key={`${cell.value}-${index}`} style={{ backgroundColor: cell.color }} />
              ))}
            </div>
            <div className="model-animation__legend">
              <i />
              {[1050, 900, 750, 600, 450, 300, 150, 0].map((value) => (
                <span key={value}>{value}</span>
              ))}
              <strong>Wh/m²</strong>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
