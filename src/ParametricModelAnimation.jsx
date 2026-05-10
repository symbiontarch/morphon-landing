import { useEffect, useRef, useState } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from "three";

const LEVELS = 14;
const SEGMENTS = 12;
const STAGE_KEYS = ["design", "analysis", "bim", "documentation", "workshop", "assembly"];
const STAGE_LABELS = ["DISEÑO", "ANÁLISIS", "BIM", "DOCUMENTACIÓN", "TALLER", "MONTAJE"];

function addLine(vertices, a, b) {
  vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
}

function createLineGeometry(vertices) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  return geometry;
}

function createPointsGeometry(points) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
}

function towerPoint(level, segment, inset = 0) {
  const t = level / LEVELS;
  const angle = (segment / SEGMENTS) * Math.PI * 2 + t * 0.72;
  const radiusX = (1.22 - t * 0.24 - inset) * (1 + Math.sin(t * Math.PI) * 0.08);
  const radiusZ = 0.82 - t * 0.12 - inset * 0.65;

  return {
    x: Math.cos(angle) * radiusX,
    y: (t - 0.5) * 3.2,
    z: Math.sin(angle) * radiusZ,
  };
}

function createBaseWireframe() {
  const vertices = [];

  for (let level = 0; level <= LEVELS; level += 1) {
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      addLine(vertices, towerPoint(level, segment), towerPoint(level, (segment + 1) % SEGMENTS));
    }
  }

  for (let segment = 0; segment < SEGMENTS; segment += 2) {
    for (let level = 0; level < LEVELS; level += 1) {
      addLine(vertices, towerPoint(level, segment), towerPoint(level + 1, segment));
    }
  }

  for (let level = 1; level < LEVELS; level += 3) {
    addLine(vertices, towerPoint(level, 1), towerPoint(level + 1, 4));
    addLine(vertices, towerPoint(level, 7), towerPoint(level + 1, 10));
  }

  return createLineGeometry(vertices);
}

function createAnalysisLayer() {
  const lines = [];
  const points = [];

  for (let band = 0; band < 3; band += 1) {
    const segment = band * 3 + 1;
    for (let level = 0; level < LEVELS; level += 1) {
      const a = towerPoint(level, segment, -0.08);
      const b = towerPoint(level + 1, segment + 1, -0.08);
      addLine(lines, a, b);
      if (level % 2 === 0) points.push(a.x, a.y, a.z);
    }
  }

  return {
    lines: createLineGeometry(lines),
    points: createPointsGeometry(points),
  };
}

function createBimLayer() {
  const vertices = [];

  for (let level = 0; level <= LEVELS; level += 2) {
    for (let segment = 0; segment < SEGMENTS; segment += 3) {
      addLine(vertices, towerPoint(level, segment, 0.12), towerPoint(level, (segment + 3) % SEGMENTS, 0.12));
    }
  }

  for (let segment = 0; segment < SEGMENTS; segment += 3) {
    addLine(vertices, towerPoint(0, segment, 0.12), towerPoint(LEVELS, segment, 0.12));
  }

  return createLineGeometry(vertices);
}

function createDocumentationLayer() {
  const vertices = [];
  const leftBottom = { x: -1.7, y: -1.55, z: 0.05 };
  const leftTop = { x: -1.7, y: 1.55, z: 0.05 };
  const rightMidA = { x: 1.65, y: -0.7, z: 0.1 };
  const rightMidB = { x: 1.65, y: 0.95, z: 0.1 };

  addLine(vertices, leftBottom, leftTop);
  addLine(vertices, { x: -1.55, y: -1.55, z: 0.05 }, leftBottom);
  addLine(vertices, { x: -1.55, y: 1.55, z: 0.05 }, leftTop);
  addLine(vertices, rightMidA, rightMidB);
  addLine(vertices, { x: 1.42, y: -0.7, z: 0.1 }, rightMidA);
  addLine(vertices, { x: 1.42, y: 0.95, z: 0.1 }, rightMidB);

  for (let level = 2; level < LEVELS; level += 4) {
    const p = towerPoint(level, 2);
    addLine(vertices, p, { x: p.x + 0.52, y: p.y + 0.16, z: p.z + 0.18 });
  }

  return createLineGeometry(vertices);
}

function createWorkshopLayer() {
  const vertices = [];

  for (let level = 0; level < LEVELS; level += 2) {
    for (let segment = 0; segment < SEGMENTS; segment += 2) {
      addLine(vertices, towerPoint(level, segment, -0.015), towerPoint(level + 1, segment + 1, -0.015));
      addLine(vertices, towerPoint(level + 1, segment, -0.015), towerPoint(level, segment + 1, -0.015));
    }
  }

  return createLineGeometry(vertices);
}

function createAssemblyLayer() {
  const points = [];
  const lines = [];
  const sequence = [1, 3, 5, 8, 10, 12];

  sequence.forEach((level, index) => {
    const p = towerPoint(level, 9, -0.12);
    points.push(p.x, p.y, p.z);
    if (index > 0) {
      const previous = towerPoint(sequence[index - 1], 9, -0.12);
      addLine(lines, previous, p);
    }
  });

  return {
    lines: createLineGeometry(lines),
    points: createPointsGeometry(points),
  };
}

function disposeObject(object) {
  object.geometry?.dispose();
  object.material?.dispose();
}

export default function ParametricModelAnimation({ activeStage = 0, reducedMotion = false }) {
  const viewportRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const groupRef = useRef(null);
  const animationRef = useRef(0);
  const renderRef = useRef(null);
  const activeStageRef = useRef(activeStage);
  const layerRefs = useRef([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    activeStageRef.current = activeStage;

    layerRefs.current.forEach((layer, index) => {
      const isBase = layer.key === "base";
      const isActive = STAGE_KEYS[activeStage] === layer.key;
      const opacity = isBase ? (activeStage === 0 ? 0.78 : 0.34) : isActive ? 0.86 : 0.055;

      layer.objects.forEach((object) => {
        object.material.opacity = object.userData.opacityScale * opacity;
        object.visible = isBase || isActive || opacity > 0.06;
      });
    });

    renderRef.current?.();
  }, [activeStage]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 100);
    const group = new Group();
    group.rotation.x = -0.12;
    group.rotation.y = 0.36;
    camera.position.set(0, 0.1, 6.6);
    scene.add(group);

    let renderer;

    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setFailed(true);
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.className = "model-animation__canvas";
    viewport.appendChild(renderer.domElement);

    const baseMaterial = new LineBasicMaterial({ color: 0x82c6ff, transparent: true, opacity: 0.78 });
    const analysisMaterial = new LineBasicMaterial({ color: 0x31ff5c, transparent: true, opacity: 0.1 });
    const analysisPointMaterial = new PointsMaterial({ color: 0x31ff5c, transparent: true, opacity: 0.15, size: 0.035 });
    const bimMaterial = new LineBasicMaterial({ color: 0xe7f6ff, transparent: true, opacity: 0.1 });
    const docsMaterial = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });
    const workshopMaterial = new LineBasicMaterial({ color: 0x7dbfff, transparent: true, opacity: 0.1 });
    const assemblyMaterial = new LineBasicMaterial({ color: 0x31ff5c, transparent: true, opacity: 0.1 });
    const assemblyPointMaterial = new PointsMaterial({ color: 0x31ff5c, transparent: true, opacity: 0.1, size: 0.052 });

    const base = new LineSegments(createBaseWireframe(), baseMaterial);
    const analysis = createAnalysisLayer();
    const analysisLines = new LineSegments(analysis.lines, analysisMaterial);
    const analysisPoints = new Points(analysis.points, analysisPointMaterial);
    const bimLines = new LineSegments(createBimLayer(), bimMaterial);
    const docsLines = new LineSegments(createDocumentationLayer(), docsMaterial);
    const workshopLines = new LineSegments(createWorkshopLayer(), workshopMaterial);
    const assembly = createAssemblyLayer();
    const assemblyLines = new LineSegments(assembly.lines, assemblyMaterial);
    const assemblyPoints = new Points(assembly.points, assemblyPointMaterial);

    [base, analysisLines, analysisPoints, bimLines, docsLines, workshopLines, assemblyLines, assemblyPoints].forEach(
      (object) => {
        object.userData.opacityScale = object.type === "Points" ? 1.2 : 1;
        group.add(object);
      },
    );

    layerRefs.current = [
      { key: "base", objects: [base] },
      { key: "analysis", objects: [analysisLines, analysisPoints] },
      { key: "bim", objects: [bimLines] },
      { key: "documentation", objects: [docsLines] },
      { key: "workshop", objects: [workshopLines] },
      { key: "assembly", objects: [assemblyLines, assemblyPoints] },
    ];

    const renderScene = () => renderer.render(scene, camera);
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
      const active = activeStageRef.current;
      const pulse = 0.04 + Math.sin(time * 0.003) * 0.025;

      if (!reducedMotion) {
        group.rotation.y = 0.36 + Math.sin(time * 0.00045) * 0.08 + time * 0.000055;
      }

      layerRefs.current.forEach((layer) => {
        const isActive = STAGE_KEYS[active] === layer.key || (active === 0 && layer.key === "base");
        if (!isActive || layer.key === "base") return;

        layer.objects.forEach((object) => {
          object.material.opacity = Math.min(0.95, object.material.opacity + pulse);
        });
      });

      renderScene();
      animationRef.current = window.requestAnimationFrame(tick);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();

    if (!reducedMotion) {
      animationRef.current = window.requestAnimationFrame(tick);
    }

    rendererRef.current = renderer;
    sceneRef.current = scene;
    groupRef.current = group;

    return () => {
      window.cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      layerRefs.current.forEach((layer) => layer.objects.forEach(disposeObject));
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      sceneRef.current = null;
      groupRef.current = null;
      renderRef.current = null;
      layerRefs.current = [];
    };
  }, [reducedMotion]);

  return (
    <div className="model-animation">
      <div className="model-animation__viewport" ref={viewportRef}>
        {failed ? <div className="model-animation__fallback">WebGL no disponible</div> : null}
      </div>
      <div className="model-animation__readout" aria-hidden="true">
        <span>MODELO VIVO</span>
        <strong>{STAGE_LABELS[activeStage]}</strong>
      </div>
      <div className={`model-animation__labels model-animation__labels--${STAGE_KEYS[activeStage]}`} aria-hidden="true">
        <span className="model-animation__label model-animation__label--a">GRID / NIVEL</span>
        <span className="model-animation__label model-animation__label--b">DATOS / CAPA</span>
        <span className="model-animation__label model-animation__label--c">SEQ. 04</span>
      </div>
    </div>
  );
}
