import { useEffect, useRef, useState } from "react";
import {
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";

const RADIAL_SEGMENTS = 28;
const BASE_RADIUS_SCENE = 1.25;
const METERS_PER_SCENE_UNIT = 14;

const controls = [
  { key: "floorHeight", label: "Altura nivel", min: 2.8, max: 4.4, step: 0.1 },
  { key: "twist", label: "Giro", min: -170, max: 170, step: 5 },
  { key: "taper", label: "Conicidad", min: 0, max: 0.62, step: 0.02 },
  { key: "levels", label: "Niveles", min: 8, max: 28, step: 1 },
  { key: "coreDiameter", label: "Diámetro núcleo", min: 4, max: 16, step: 0.5 },
  { key: "slabThickness", label: "Espesor losa", min: 0.15, max: 0.8, step: 0.05 },
];

const initialParams = {
  floorHeight: 3.6,
  twist: 95,
  taper: 0.34,
  levels: 18,
  coreDiameter: 8,
  slabThickness: 0.35,
};

function formatValue(key, value) {
  if (key === "twist") return `${Math.round(value)}°`;
  if (key === "levels") return String(Math.round(value));
  if (key === "floorHeight" || key === "coreDiameter" || key === "slabThickness") {
    return `${value.toFixed(2).replace(/0$/, "")} m`;
  }
  return value.toFixed(1);
}

function formatMetricNumber(value, digits = 0) {
  return value.toLocaleString("es-MX", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function getTotalHeightMeters({ floorHeight, levels }) {
  return floorHeight * Math.round(levels);
}

function getLevelRadiiMeters(t, taper) {
  const radius = BASE_RADIUS_SCENE * (1 - taper * t);
  const belly = 1 + Math.sin(t * Math.PI) * 0.08;

  return {
    x: radius * belly * METERS_PER_SCENE_UNIT,
    z: radius * (1.02 - t * 0.06) * METERS_PER_SCENE_UNIT,
  };
}

function getEllipseArea({ x, z }) {
  return Math.PI * x * z;
}

function getEllipsePerimeter({ x, z }) {
  return Math.PI * (3 * (x + z) - Math.sqrt((3 * x + z) * (x + 3 * z)));
}

function getTowerMetrics(params) {
  const floorCount = Math.round(params.levels);
  const totalHeightMeters = getTotalHeightMeters(params);
  const floorAreas = [];
  let facadeArea = 0;

  for (let level = 0; level < floorCount; level += 1) {
    const floorT = (level + 0.5) / floorCount;
    const lowerT = level / floorCount;
    const upperT = (level + 1) / floorCount;
    const floorRadii = getLevelRadiiMeters(floorT, params.taper);
    const lowerPerimeter = getEllipsePerimeter(getLevelRadiiMeters(lowerT, params.taper));
    const upperPerimeter = getEllipsePerimeter(getLevelRadiiMeters(upperT, params.taper));

    floorAreas.push(getEllipseArea(floorRadii));
    facadeArea += ((lowerPerimeter + upperPerimeter) / 2) * params.floorHeight;
  }

  const totalArea = floorAreas.reduce((sum, area) => sum + area, 0);
  const averageFloorArea = totalArea / floorCount;
  const baseRadii = getLevelRadiiMeters(0, params.taper);
  const topRadii = getLevelRadiiMeters(1, params.taper);
  const baseRadius = (baseRadii.x + baseRadii.z) / 2;
  const topRadius = (topRadii.x + topRadii.z) / 2;
  const baseDiameter = baseRadii.x + baseRadii.z;
  const slenderness = totalHeightMeters / baseDiameter;

  return [
    ["Altura total", `${formatMetricNumber(totalHeightMeters, 1)} m`],
    ["Área total aprox.", `${formatMetricNumber(totalArea)} m²`],
    ["Área promedio nivel", `${formatMetricNumber(averageFloorArea)} m²`],
    ["Superficie fachada", `${formatMetricNumber(facadeArea)} m²`],
    ["Paneles fachada", formatMetricNumber(floorCount * RADIAL_SEGMENTS)],
    ["Esbeltez", `${formatMetricNumber(slenderness, 1)}:1`],
    ["Giro por nivel", `${formatMetricNumber(params.twist / floorCount, 1)}°`],
    ["Radio base / superior", `${formatMetricNumber(baseRadius, 1)} / ${formatMetricNumber(topRadius, 1)} m`],
  ];
}

function createTowerGeometry({ floorHeight, twist, taper, levels, coreDiameter, slabThickness }) {
  const floorCount = Math.round(levels);
  const height = getTotalHeightMeters({ floorHeight, levels }) / 14;
  const coreRadius = coreDiameter / METERS_PER_SCENE_UNIT / 2;
  const slabHalfThickness = slabThickness / METERS_PER_SCENE_UNIT / 2;
  const twistRadians = MathUtils.degToRad(twist);
  const vertices = [];
  const indices = [];
  const lineVertices = [];
  const slabVertices = [];
  const slabIndices = [];

  for (let floor = 0; floor <= floorCount; floor += 1) {
    const t = floor / floorCount;
    const y = (t - 0.5) * height;
    const radius = 1.25 * (1 - taper * t);
    const belly = 1 + Math.sin(t * Math.PI) * 0.08;
    const floorTwist = twistRadians * t;

    for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 1) {
      const angle = (segment / RADIAL_SEGMENTS) * Math.PI * 2 + floorTwist;
      const x = Math.cos(angle) * radius * belly;
      const z = Math.sin(angle) * radius * (1.02 - t * 0.06);
      vertices.push(x, y, z);
    }
  }

  for (let floor = 0; floor < floorCount; floor += 1) {
    for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 1) {
      const nextSegment = (segment + 1) % RADIAL_SEGMENTS;
      const current = floor * RADIAL_SEGMENTS + segment;
      const next = floor * RADIAL_SEGMENTS + nextSegment;
      const above = (floor + 1) * RADIAL_SEGMENTS + segment;
      const aboveNext = (floor + 1) * RADIAL_SEGMENTS + nextSegment;

      indices.push(current, above, next);
      indices.push(next, above, aboveNext);
    }
  }

  for (let floor = 0; floor <= floorCount; floor += 1) {
    for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 1) {
      const nextSegment = (segment + 1) % RADIAL_SEGMENTS;
      const currentIndex = (floor * RADIAL_SEGMENTS + segment) * 3;
      const nextIndex = (floor * RADIAL_SEGMENTS + nextSegment) * 3;

      lineVertices.push(
        vertices[currentIndex],
        vertices[currentIndex + 1],
        vertices[currentIndex + 2],
        vertices[nextIndex],
        vertices[nextIndex + 1],
        vertices[nextIndex + 2],
      );
    }
  }

  for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 4) {
    for (let floor = 0; floor < floorCount; floor += 1) {
      const currentIndex = (floor * RADIAL_SEGMENTS + segment) * 3;
      const nextIndex = ((floor + 1) * RADIAL_SEGMENTS + segment) * 3;

      lineVertices.push(
        vertices[currentIndex],
        vertices[currentIndex + 1],
        vertices[currentIndex + 2],
        vertices[nextIndex],
        vertices[nextIndex + 1],
        vertices[nextIndex + 2],
      );
    }
  }

  for (let floor = 0; floor <= floorCount; floor += 1) {
    const baseIndex = slabVertices.length / 3;
    const t = floor / floorCount;
    const y = (t - 0.5) * height;
    const radius = 1.25 * (1 - taper * t);
    const belly = 1 + Math.sin(t * Math.PI) * 0.08;
    const floorTwist = twistRadians * t;

    slabVertices.push(0, y + slabHalfThickness, 0, 0, y - slabHalfThickness, 0);

    for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 1) {
      const angle = (segment / RADIAL_SEGMENTS) * Math.PI * 2 + floorTwist;
      const x = Math.cos(angle) * radius * belly;
      const z = Math.sin(angle) * radius * (1.02 - t * 0.06);
      slabVertices.push(x, y + slabHalfThickness, z, x, y - slabHalfThickness, z);
    }

    for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 1) {
      const nextSegment = (segment + 1) % RADIAL_SEGMENTS;
      const topCenter = baseIndex;
      const bottomCenter = baseIndex + 1;
      const topCurrent = baseIndex + 2 + segment * 2;
      const bottomCurrent = topCurrent + 1;
      const topNext = baseIndex + 2 + nextSegment * 2;
      const bottomNext = topNext + 1;

      slabIndices.push(topCenter, topCurrent, topNext);
      slabIndices.push(bottomCenter, bottomNext, bottomCurrent);
      slabIndices.push(topCurrent, bottomCurrent, topNext);
      slabIndices.push(topNext, bottomCurrent, bottomNext);
    }
  }

  const surfaceGeometry = new BufferGeometry();
  surfaceGeometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  surfaceGeometry.setIndex(indices);
  surfaceGeometry.computeVertexNormals();

  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute("position", new Float32BufferAttribute(lineVertices, 3));

  const coreGeometry = new CylinderGeometry(coreRadius, coreRadius, height, 32, 1, false);

  const slabGeometry = new BufferGeometry();
  slabGeometry.setAttribute("position", new Float32BufferAttribute(slabVertices, 3));
  slabGeometry.setIndex(slabIndices);
  slabGeometry.computeVertexNormals();

  return { surfaceGeometry, lineGeometry, coreGeometry, slabGeometry };
}

export default function ParametricTower() {
  const shellRef = useRef(null);
  const viewportRef = useRef(null);
  const sceneRef = useRef(null);
  const groupRef = useRef(null);
  const rendererRef = useRef(null);
  const surfaceMeshRef = useRef(null);
  const lineMeshRef = useRef(null);
  const coreMeshRef = useRef(null);
  const slabMeshRef = useRef(null);
  const renderRef = useRef(null);
  const animationRef = useRef(0);
  const visibleRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const [params, setParams] = useState(initialParams);
  const [failed, setFailed] = useState(false);
  const [dataPulse, setDataPulse] = useState(0);
  const [isDataUpdating, setIsDataUpdating] = useState(false);
  const towerMetrics = getTowerMetrics(params);

  useEffect(() => {
    if (dataPulse === 0) return undefined;

    setIsDataUpdating(true);
    const timeout = window.setTimeout(() => setIsDataUpdating(false), 620);

    return () => window.clearTimeout(timeout);
  }, [dataPulse]);

  useEffect(() => {
    const shell = shellRef.current;
    const viewport = viewportRef.current;
    if (!shell || !viewport) return undefined;

    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 100);
    const group = new Group();
    group.scale.setScalar(0.82);
    const surfaceMaterial = new MeshBasicMaterial({
      color: 0xf4fbff,
      transparent: true,
      opacity: 0.2,
      side: DoubleSide,
      depthWrite: false,
    });
    const lineMaterial = new LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    const coreMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      side: DoubleSide,
      depthWrite: false,
    });
    const slabMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.26,
      side: DoubleSide,
      depthWrite: false,
    });

    let renderer;

    try {
      renderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.className = "tower-canvas";
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      "Vista previa de una torre paramétrica. Usa clic izquierdo para pan, clic derecho para orbitar y scroll para zoom.",
    );

    const cameraState = {
      yaw: 0.022,
      pitch: 0.018,
      distance: 11.2,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    };
    const pointerState = {
      active: false,
      mode: null,
      x: 0,
      y: 0,
    };

    const updateCamera = () => {
      const cosPitch = Math.cos(cameraState.pitch);
      const x = cameraState.targetX + Math.sin(cameraState.yaw) * cosPitch * cameraState.distance;
      const y = cameraState.targetY + Math.sin(cameraState.pitch) * cameraState.distance;
      const z = cameraState.targetZ + Math.cos(cameraState.yaw) * cosPitch * cameraState.distance;

      camera.position.set(x, y, z);
      camera.lookAt(cameraState.targetX, cameraState.targetY, cameraState.targetZ);
    };

    const clampCameraTarget = () => {
      cameraState.targetX = Math.max(-0.85, Math.min(0.85, cameraState.targetX));
      cameraState.targetY = Math.max(-1.15, Math.min(1.15, cameraState.targetY));
      cameraState.targetZ = Math.max(-0.85, Math.min(0.85, cameraState.targetZ));
    };

    updateCamera();
    scene.add(group);
    viewport.appendChild(renderer.domElement);

    const surfaceMesh = new Mesh(new BufferGeometry(), surfaceMaterial);
    const lineMesh = new LineSegments(new BufferGeometry(), lineMaterial);
    const coreMesh = new Mesh(new BufferGeometry(), coreMaterial);
    const slabMesh = new Mesh(new BufferGeometry(), slabMaterial);
    surfaceMesh.renderOrder = 1;
    slabMesh.renderOrder = 2;
    coreMesh.renderOrder = 3;
    lineMesh.renderOrder = 4;
    group.add(surfaceMesh, slabMesh, coreMesh, lineMesh);

    sceneRef.current = scene;
    groupRef.current = group;
    rendererRef.current = renderer;
    surfaceMeshRef.current = surfaceMesh;
    lineMeshRef.current = lineMesh;
    coreMeshRef.current = coreMesh;
    slabMeshRef.current = slabMesh;

    const renderScene = () => {
      updateCamera();
      renderer.render(scene, camera);
    };
    renderRef.current = renderScene;

    const resize = () => {
      const rect = viewport.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderScene();
    };

    const tick = (time) => {
      if (!visibleRef.current) {
        animationRef.current = 0;
        return;
      }

      if (!reducedMotionRef.current) {
        group.rotation.y = time * 0.00006;
      }

      renderScene();
      animationRef.current = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (!animationRef.current) {
        animationRef.current = window.requestAnimationFrame(tick);
      }
    };

    const stop = () => {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    };

    const handlePointerDown = (event) => {
      if (event.button !== 0 && event.button !== 2) return;

      event.preventDefault();
      renderer.domElement.focus();
      pointerState.active = true;
      pointerState.mode = event.button === 2 ? "orbit" : "pan";
      pointerState.x = event.clientX;
      pointerState.y = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!pointerState.active) return;

      event.preventDefault();
      const deltaX = event.clientX - pointerState.x;
      const deltaY = event.clientY - pointerState.y;
      pointerState.x = event.clientX;
      pointerState.y = event.clientY;

      if (pointerState.mode === "orbit") {
        cameraState.yaw -= deltaX * 0.006;
        cameraState.pitch = Math.max(-0.9, Math.min(0.9, cameraState.pitch + deltaY * 0.005));
      } else if (pointerState.mode === "pan") {
        const rect = renderer.domElement.getBoundingClientRect();
        const panScale = cameraState.distance / Math.max(rect.height, 1);
        const rightX = Math.cos(cameraState.yaw);
        const rightZ = -Math.sin(cameraState.yaw);
        const upX = -Math.sin(cameraState.yaw) * Math.sin(cameraState.pitch);
        const upY = Math.cos(cameraState.pitch);
        const upZ = -Math.cos(cameraState.yaw) * Math.sin(cameraState.pitch);

        cameraState.targetX -= (rightX * deltaX - upX * deltaY) * panScale;
        cameraState.targetY += upY * deltaY * panScale;
        cameraState.targetZ -= (rightZ * deltaX - upZ * deltaY) * panScale;
        clampCameraTarget();
      }

      renderScene();
    };

    const handlePointerUp = (event) => {
      if (!pointerState.active) return;

      pointerState.active = false;
      pointerState.mode = null;

      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }

      if (!shell.matches(":hover")) {
        window.dispatchEvent(new CustomEvent("morphon:tower-scroll-lock", { detail: { active: false } }));
      }
    };

    const handleWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();
      cameraState.distance = Math.max(8.2, Math.min(18, cameraState.distance * (1 + event.deltaY * 0.0012)));
      renderScene();
    };

    const preventCanvasMenu = (event) => event.preventDefault();

    const setPageScrollLock = (active) => {
      window.dispatchEvent(new CustomEvent("morphon:tower-scroll-lock", { detail: { active } }));
    };

    const handlePointerEnter = () => setPageScrollLock(true);
    const handlePointerLeave = () => {
      if (!pointerState.active) setPageScrollLock(false);
    };

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          start();
        } else {
          stop();
        }
      },
      { threshold: 0.08 },
    );

    resizeObserver.observe(viewport);
    visibilityObserver.observe(viewport);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);
    renderer.domElement.addEventListener("contextmenu", preventCanvasMenu);
    renderer.domElement.addEventListener("auxclick", preventCanvasMenu);
    shell.addEventListener("pointerenter", handlePointerEnter);
    shell.addEventListener("pointerleave", handlePointerLeave);
    shell.addEventListener("wheel", handleWheel, { passive: false });
    resize();
    start();

    return () => {
      setPageScrollLock(false);
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.domElement.removeEventListener("contextmenu", preventCanvasMenu);
      renderer.domElement.removeEventListener("auxclick", preventCanvasMenu);
      shell.removeEventListener("pointerenter", handlePointerEnter);
      shell.removeEventListener("pointerleave", handlePointerLeave);
      shell.removeEventListener("wheel", handleWheel);
      surfaceMesh.geometry.dispose();
      lineMesh.geometry.dispose();
      coreMesh.geometry.dispose();
      slabMesh.geometry.dispose();
      surfaceMaterial.dispose();
      lineMaterial.dispose();
      coreMaterial.dispose();
      slabMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      groupRef.current = null;
      rendererRef.current = null;
      surfaceMeshRef.current = null;
      lineMeshRef.current = null;
      coreMeshRef.current = null;
      slabMeshRef.current = null;
      renderRef.current = null;
    };
  }, []);

  useEffect(() => {
    const surfaceMesh = surfaceMeshRef.current;
    const lineMesh = lineMeshRef.current;
    const coreMesh = coreMeshRef.current;
    const slabMesh = slabMeshRef.current;
    if (!surfaceMesh || !lineMesh || !coreMesh || !slabMesh) return;

    const { surfaceGeometry, lineGeometry, coreGeometry, slabGeometry } = createTowerGeometry(params);
    surfaceMesh.geometry.dispose();
    lineMesh.geometry.dispose();
    coreMesh.geometry.dispose();
    slabMesh.geometry.dispose();
    surfaceMesh.geometry = surfaceGeometry;
    lineMesh.geometry = lineGeometry;
    coreMesh.geometry = coreGeometry;
    slabMesh.geometry = slabGeometry;
    renderRef.current?.();
  }, [params]);

  return (
    <div className="tower-shell" ref={shellRef} aria-label="Sistema paramétrico interactivo">
      <div className="tower-viewport" ref={viewportRef}>
        {failed ? <div className="tower-fallback">WebGL no disponible</div> : null}
      </div>
      <div className="tower-controls">
        <div className="tower-panel-title">Datos del modelo</div>
        <div className={`tower-data-panel${isDataUpdating ? " is-updating" : ""}`}>
          <div className="tower-metrics" aria-label="Datos derivados del modelo">
            {towerMetrics.map(([label, value], index) => (
              <div className="tower-metric" key={label} style={{ "--metric-index": index }}>
                <span>{label}</span>
                <strong key={`${label}-${value}`}>{value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="tower-panel-title">Parámetros</div>
        <div className="tower-slider-panel">
          <div className="tower-slider-grid">
            {controls.map((control) => (
              <label className="tower-control" key={control.key}>
                <span className="tower-control__meta">
                  <span>{control.label}</span>
                  <output>{formatValue(control.key, params[control.key])}</output>
                </span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                    value={params[control.key]}
                    onChange={(event) => {
                      const rawValue = Number(event.target.value);
                      setParams((current) => ({
                        ...current,
                        [control.key]: control.key === "levels" ? Math.round(rawValue) : rawValue,
                      }));
                      setDataPulse((current) => current + 1);
                    }}
                  />
                </label>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
