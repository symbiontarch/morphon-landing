import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const ParametricTower = lazy(() => import("./ParametricTower.jsx"));

const navItems = [
  ["Home", "#top"],
  ["Servicios", "#servicios"],
  ["Sistema", "#sistema"],
  ["Proceso", "#proceso"],
  ["Contacto", "#contacto"],
];

const heroCopyLines = [
  "Diseñamos sistemas paramétricos, herramientas de automatización",
  "y flujos BIM inteligentes para convertir geometría compleja",
  "en modelos analizables, documentables y construibles.",
];

const pillars = [
  {
    index: "01",
    title: "Modelos paramétricos",
    text: "Modelos interactivos que controlan geometría, variantes, datos y cantidades desde una sola lógica editable.",
  },
  {
    index: "02",
    title: "Automatización BIM",
    text: "Flujos inteligentes para conectar Rhino, Grasshopper, Revit y documentación técnica sin duplicar trabajo.",
  },
  {
    index: "03",
    title: "Geometría construible",
    text: "Racionalización de fachadas, cubiertas, estructuras ligeras, conexiones, paneles y sistemas especiales.",
  },
  {
    index: "04",
    title: "Análisis y optimización",
    text: "Integración de métricas de desempeño, cantidades, radiación, sombras, costos y escenarios para diseñar con evidencia.",
  },
];

const services = [
  ["Sistema de Entrega BIM Paramétrico", "Modelos BIM inteligentes que se actualizan con cambios de diseño y apoyan coordinación, cantidades y documentación.", "BIM"],
  ["Sistema de Diseño para Geometría Compleja", "Racionalización de formas no estándar en superficies, paneles, tiras, módulos y sistemas construibles.", "GEOMETRÍA"],
  ["Sistema de Fachada Paramétrica", "Fachadas que conectan geometría, clima, módulos, aperturas, estructura y documentación desde el inicio.", "ENVOLVENTE"],
  ["Estructuras Tensiles + Fabricación", "Form-finding, membranas, cables, patronaje, conexiones, planos de taller y geometría de fabricación.", "TENSIL"],
  ["Diseño Estructuralmente Informado", "Exploración formal con comportamiento estructural, rigidez, curvatura, optimización y coordinación técnica.", "ESTRUCTURA"],
  ["Análisis de Diseño Climático", "Radiación solar, sombras, luz natural, viento, agua, escenarios comparativos y recomendaciones visuales.", "ANÁLISIS"],
  ["Sistema de Diseño-a-Fabricación", "Partes, numeración, ensamble, CNC, planos de instalación, cantidades y lógica para construir elementos complejos.", "FABRICACIÓN"],
  ["Configurador de Producto AEC", "Herramientas web para visualizar, personalizar, cotizar y prevender productos arquitectónicos o constructivos.", "DIGITAL"],
  ["Automatización de Flujos AEC", "Scripts y herramientas Grasshopper, Python, C#, Revit y Rhino para reducir trabajo repetitivo de semanas a días.", "AUTOMATION"],
];

const processSteps = [
  ["01", "Concepto", "Intención de diseño, restricciones del sitio y objetivos técnicos."],
  ["02", "Modelo", "Sistema paramétrico editable, conectado y preparado para iterar."],
  ["03", "Análisis", "Desempeño ambiental, geométrico, estructural o de fabricación."],
  ["04", "Documentación", "Dibujos, cantidades, coordinación y paquetes constructivos."],
  ["05", "Fabricación", "Piezas, conexiones, archivos y lógica de ensamble."],
];

function SectionTransition() {
  return (
    <div className="section-transition" aria-hidden="true">
      <span className="section-transition__grain" />
      <span className="section-transition__wipe" />
      <span className="section-transition__scanline" />
      <span className="section-transition__corner section-transition__corner--tl" />
      <span className="section-transition__corner section-transition__corner--tr" />
      <span className="section-transition__corner section-transition__corner--br" />
      <span className="section-transition__corner section-transition__corner--bl" />
      <span className="section-transition__registration section-transition__registration--top" />
      <span className="section-transition__registration section-transition__registration--right" />
      <span className="section-transition__registration section-transition__registration--bottom" />
      <span className="section-transition__registration section-transition__registration--left" />
    </div>
  );
}

function usePageMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis;
    let rafId = 0;
    let isTowerScrollLocked = false;

    if (!reduced) {
      lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.85 });
      const raf = (time) => {
        lenis.raf(time);
        ScrollTrigger.update();
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);

      gsap.set(".hero__inner", { clearProps: "opacity,visibility,transform,filter,clipPath" });

      gsap.utils.toArray(".reveal:not(.hero__inner)").forEach((element) => {
        gsap.fromTo(
          element,
          { y: 34, opacity: 0, clipPath: "inset(0 0 100% 0)" },
          {
            y: 0,
            opacity: 1,
            clipPath: "inset(0 0 0% 0)",
            duration: 0.95,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 84%",
            },
          },
        );
      });

      if (window.innerWidth >= 900) {
        gsap.utils.toArray(".hero.scene-section").forEach((section) => {
          const content = section.querySelectorAll(".scene-content");
          const transition = section.querySelector(".section-transition");

          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "+=68%",
              scrub: 0.65,
              pin: true,
              pinSpacing: false,
              anticipatePin: 1,
            },
          });

          timeline.to(
            content,
            { y: -22, duration: 0.72, ease: "none" },
            0,
          );
          if (transition) {
            timeline.to(transition, { opacity: 0.86, ease: "none" }, 0);
          }
        });
      }

      if (window.innerWidth >= 760) {
        const snapSections = gsap.utils.toArray(".scene-section");
        const getSnapRange = () => {
          const lastSection = snapSections[snapSections.length - 1];
          const end = Math.max(1, lastSection?.offsetTop || 1);
          const points = snapSections.map((section) =>
            gsap.utils.clamp(0, 1, section.offsetTop / end),
          );

          return { end, points };
        };
        const canSnap = () => {
          const activeElement = document.activeElement;
          const isEditing = activeElement?.matches?.(
            "input, textarea, select, button, [contenteditable='true']",
          );

          return !isTowerScrollLocked && !isEditing;
        };

        ScrollTrigger.create({
          id: "scene-section-snap",
          start: 0,
          end: () => getSnapRange().end,
          snap: {
            snapTo: (progress) => {
              if (!canSnap()) return progress;

              return gsap.utils.snap(getSnapRange().points, progress);
            },
            duration: { min: 0.42, max: 0.78 },
            delay: 0.06,
            ease: "power3.inOut",
            inertia: false,
          },
        });
      }

      gsap.utils.toArray(".section-transition").forEach((element) => {
        const section = element.parentElement;
        const scanline = element.querySelector(".section-transition__scanline");
        const marks = element.querySelectorAll(
          ".section-transition__corner, .section-transition__registration",
        );

        gsap.fromTo(
          element,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 72%",
              toggleActions: "play none none reverse",
            },
          },
        );

        gsap.fromTo(
          scanline,
          { scaleX: 0, opacity: 0 },
          {
            scaleX: 1,
            opacity: 0.7,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 88%",
              end: "top 34%",
              scrub: true,
            },
          },
        );

        gsap.fromTo(
          marks,
          { opacity: 0, scale: 0.72 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.72,
            stagger: 0.025,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 70%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });

      gsap.utils.toArray(".rule-draw").forEach((element) => {
        gsap.fromTo(
          element,
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 92%",
            },
          },
        );
      });
    }

    const handleTowerScrollLock = (event) => {
      isTowerScrollLocked = Boolean(event.detail?.active);
      if (isTowerScrollLocked) {
        lenis?.stop();
      } else {
        lenis?.start();
      }
    };

    window.addEventListener("morphon:tower-scroll-lock", handleTowerScrollLock);

    return () => {
      window.removeEventListener("morphon:tower-scroll-lock", handleTowerScrollLock);
      cancelAnimationFrame(rafId);
      lenis?.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);
}

function ScrambleText({ text, trigger }) {
  const [displayText, setDisplayText] = useState(text);
  const timersRef = useRef([]);

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  useEffect(() => {
    if (!trigger) {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current = [];
      setDisplayText(text);
      return undefined;
    }

    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];

    const digits = "0123456789";
    const frames = 7;
    for (let frame = 0; frame < frames; frame += 1) {
      const timer = setTimeout(() => {
        const resolved = Math.floor((frame / (frames - 1)) * text.length);
        const next = text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < resolved) return char;
            return digits[(index + frame * 3) % digits.length];
          })
          .join("");
        setDisplayText(next);
      }, frame * 34);
      timersRef.current.push(timer);
    }

    const finalTimer = setTimeout(() => setDisplayText(text), frames * 34 + 24);
    timersRef.current.push(finalTimer);

    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current = [];
    };
  }, [text, trigger]);

  return <span className="nav-label">{displayText}</span>;
}

function HeroHeadline() {
  const fullText = heroCopyLines.join(" ");
  const [lines, setLines] = useState(heroCopyLines.map(() => ""));
  const [visibleLines, setVisibleLines] = useState([]);
  const [settled, setSettled] = useState(false);
  const [glitchPhrase, setGlitchPhrase] = useState(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setLines(heroCopyLines);
      setVisibleLines(heroCopyLines.map((_, index) => index));
      setSettled(true);
      return undefined;
    }

    const glyphs = "0123456789/<>[]{}";
    const timers = [];

    heroCopyLines.forEach((line, lineIndex) => {
      const startDelay = 220 + lineIndex * 260;
      timers.push(
        setTimeout(() => {
          setVisibleLines((current) => [...current, lineIndex]);
        }, startDelay),
      );

      const frames = 14;
      for (let frame = 0; frame <= frames; frame += 1) {
        timers.push(
          setTimeout(() => {
            const resolved = Math.floor((frame / frames) * line.length);
            const next = line
              .split("")
              .map((char, index) => {
                if (char === " " || index < resolved) return char;
                return glyphs[(index + frame * 5 + lineIndex * 3) % glyphs.length];
              })
              .join("");

            setLines((current) => current.map((item, index) => (index === lineIndex ? next : item)));
          }, startDelay + frame * 38),
        );
      }

      timers.push(
        setTimeout(() => {
          setLines((current) => current.map((item, index) => (index === lineIndex ? line : item)));
        }, startDelay + frames * 38 + 40),
      );
    });

    timers.push(setTimeout(() => setSettled(true), 220 + heroCopyLines.length * 260 + 620));

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      };
    }, []);

  useEffect(() => {
    if (!settled) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return undefined;

    const phrasePositions = heroCopyLines.map((line, lineIndex) => ({ line, lineIndex }));
    let timeoutId;
    let pulseTimeoutId;

    const scheduleGlitch = () => {
      const delay = 2200 + Math.random() * 2600;
      timeoutId = window.setTimeout(() => {
        const nextPhrase = phrasePositions[Math.floor(Math.random() * phrasePositions.length)];
        setGlitchPhrase(nextPhrase);
        pulseTimeoutId = window.setTimeout(() => setGlitchPhrase(null), 2400);
        scheduleGlitch();
      }, delay);
    };

    scheduleGlitch();

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(pulseTimeoutId);
    };
  }, [settled]);

  const renderLine = (line, lineIndex) => {
    if (!settled) return lines[lineIndex] || line.replace(/\S/g, "0");

    const isGlitching = glitchPhrase?.lineIndex === lineIndex && glitchPhrase?.line === line;

    return (
      <span className={`hero-title__phrase${isGlitching ? " is-glitching" : ""}`} data-text={line}>
        {line}
      </span>
    );
  };

  return (
    <h1 className={`hero-title${settled ? " is-settled" : ""}`} data-text={fullText}>
      {heroCopyLines.map((line, index) => (
        <span className="hero-title__line-wrap" key={line}>
          <span
              className={`hero-title__line${visibleLines.includes(index) ? " is-visible" : ""}`}
              data-text={line}
            >
              {renderLine(line, index)}
            </span>
          </span>
        ))}
    </h1>
  );
}

function RotatingDiscipline() {
  const words = ["Arquitectura", "Ingeniería", "Construcción"];
  const [wordIndex, setWordIndex] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [phase, setPhase] = useState("typing");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCharacterCount(words[0].length);
      return undefined;
    }

    const currentWord = words[wordIndex];
    let delay = 72;

    if (phase === "typing" && characterCount >= currentWord.length) {
      delay = 2500;
    } else if (phase === "deleting") {
      delay = 42;
    }

    const timer = setTimeout(() => {
      if (phase === "typing") {
        if (characterCount < currentWord.length) {
          setCharacterCount((count) => count + 1);
        } else {
          setPhase("deleting");
        }
      } else if (characterCount > 0) {
        setCharacterCount((count) => count - 1);
      } else {
        setWordIndex((index) => (index + 1) % words.length);
        setPhase("typing");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [characterCount, phase, wordIndex]);

  const visibleWord = words[wordIndex].slice(0, characterCount);

  return (
    <span className="discipline-word" aria-label={words[wordIndex]}>
      <span className="discipline-word__text">{visibleWord}</span>
      <span className="discipline-cursor" aria-hidden="true" />
    </span>
  );
}

function Header() {
  const navRef = useRef(null);
  const linkRefs = useRef(new Map());
  const [activeHash, setActiveHash] = useState("#top");
  const [indicator, setIndicator] = useState({ opacity: 0, x: 0, y: 0, width: 0, height: 0 });
  const [scramble, setScramble] = useState({ href: null, tick: 0 });

  const moveIndicator = (href) => {
    const nav = navRef.current;
    const link = linkRefs.current.get(href);
    if (!nav || !link) return;
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    setIndicator({
      opacity: 1,
      x: linkRect.left - navRect.left,
      y: linkRect.top - navRect.top,
      width: linkRect.width,
      height: linkRect.height,
    });
  };

  useEffect(() => {
    const syncHash = () => {
      const nextHash = window.location.hash || "#top";
      const knownHash = navItems.some(([, href]) => href === nextHash) ? nextHash : "#top";
      setActiveHash(knownHash);
      requestAnimationFrame(() => moveIndicator(knownHash));
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("resize", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("resize", syncHash);
    };
  }, []);

  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="MORPHON inicio">
        MORPHON
      </a>
      <nav
        className="nav"
        aria-label="Navegación principal"
        ref={navRef}
        onMouseLeave={() => {
          moveIndicator(activeHash);
          setScramble({ href: null, tick: 0 });
        }}
      >
        <span
          className="nav-indicator"
          aria-hidden="true"
          style={{
            opacity: indicator.opacity,
            transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
            width: indicator.width,
            height: indicator.height,
          }}
        >
          <span className="nav-frame" />
          <span className="nav-corner nav-corner--tl" />
          <span className="nav-corner nav-corner--tr" />
          <span className="nav-corner nav-corner--br" />
          <span className="nav-corner nav-corner--bl" />
        </span>
        {navItems.map(([label, href]) => (
          <a
            key={href}
            href={href}
            aria-label={label}
            className={href === activeHash ? "is-active" : undefined}
            ref={(node) => {
              if (node) linkRefs.current.set(href, node);
              else linkRefs.current.delete(href);
            }}
            onMouseEnter={() => {
              moveIndicator(href);
              setScramble((current) => ({ href, tick: current.tick + 1 }));
            }}
            onFocus={() => {
              moveIndicator(href);
            }}
            onClick={() => setActiveHash(href)}
          >
            <ScrambleText text={label} trigger={scramble.href === href ? scramble.tick : 0} />
          </a>
        ))}
      </nav>
      <a className="header-cta" href="#contacto">
        Iniciar proyecto
      </a>
    </header>
  );
}

function ParticleDome() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const points = [];
    const lines = 23;
    const samples = 46;

    for (let line = 0; line < lines; line += 1) {
      const fixed = -1 + (line / (lines - 1)) * 2;

      for (let sample = 0; sample < samples; sample += 1) {
        const variable = -1 + (sample / (samples - 1)) * 2;
        const major = line % 5 === 0 || sample % 11 === 0;

        points.push({ u: fixed, v: variable, major });
        points.push({ u: variable, v: fixed, major });
      }
    }

    let frameId = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;
    const startedAt = performance.now();

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasWidth = Math.max(1, rect.width);
      canvasHeight = Math.max(1, rect.height);
      canvas.width = Math.floor(canvasWidth * dpr);
      canvas.height = Math.floor(canvasHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time = startedAt) => {
      if (!canvasWidth || !canvasHeight) resizeCanvas();

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      const elapsed = reduced ? 0 : time - startedAt;
      const angle = Math.PI / 4 + (elapsed / 42000) * Math.PI * 2;
      const pitch = 0;
      const cosY = Math.cos(angle);
      const sinY = Math.sin(angle);
      const cosX = Math.cos(pitch);
      const sinX = Math.sin(pitch);
      const scale = Math.min(canvasWidth / 5.2, canvasHeight / 3.45) * 0.8;
      const centerX = canvasWidth * 0.5;
      const centerY = canvasHeight * 0.43;
      const camera = 4.7;
      const projected = [];

      for (const point of points) {
        const { u, v, major } = point;
        const x = u * 1.62;
        const z = v * 1.16;
        const y = (u * u - v * v) * 0.74;

        const rotatedX = x * cosY + z * sinY;
        const rotatedZ = -x * sinY + z * cosY;
        const tiltedY = y * cosX - rotatedZ * sinX;
        const tiltedZ = y * sinX + rotatedZ * cosX;
        const perspective = camera / (camera + tiltedZ);
        const screenX = centerX + rotatedX * scale * perspective;
        const screenY = centerY - tiltedY * scale * perspective;

        if (
          screenX < -12 ||
          screenX > canvasWidth + 12 ||
          screenY < -12 ||
          screenY > canvasHeight + 12
        ) {
          continue;
        }

        const edgeFade = 1 - Math.max(Math.abs(u), Math.abs(v)) * 0.3;
        const depthFade = 0.82 + perspective * 0.18;
        const alpha = Math.max(0.28, Math.min(0.95, edgeFade * depthFade));
        const radius = (major ? 1.62 : 1.18) * Math.max(0.78, Math.min(1.18, perspective));

        projected.push({ alpha, radius, screenX, screenY, z: tiltedZ });
      }

      projected.sort((a, b) => b.z - a.z);

      for (const point of projected) {
        context.beginPath();
        context.fillStyle = `rgba(255, 255, 255, ${point.alpha})`;
        context.arc(point.screenX, point.screenY, point.radius, 0, Math.PI * 2);
        context.fill();
      }

      if (!reduced) {
        frameId = requestAnimationFrame(draw);
      }
    };

    resizeCanvas();
    draw();
    window.addEventListener("resize", resizeCanvas);

    if (!reduced) {
      frameId = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <canvas className="particle-dome" ref={canvasRef} aria-hidden="true" />;
}

function HeroNoiseCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return undefined;

    const gaussianNoise = () => {
      let u = 0;
      let v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    const drawNoise = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = 1.25;
      const width = Math.max(1, Math.floor(rect.width * scale));
      const height = Math.max(1, Math.floor(rect.height * scale));

      canvas.width = width;
      canvas.height = height;

      const imageData = context.createImageData(width, height);
      const pixels = imageData.data;

      for (let index = 0; index < pixels.length; index += 4) {
        const value = Math.max(0, Math.min(255, 128 + gaussianNoise() * 42));
        pixels[index] = value;
        pixels[index + 1] = value;
        pixels[index + 2] = value;
        pixels[index + 3] = 255;
      }

      context.putImageData(imageData, 0, 0);
    };

    drawNoise();
    window.addEventListener("resize", drawNoise);

    return () => {
      window.removeEventListener("resize", drawNoise);
    };
  }, []);

  return <canvas className="hero__noise" ref={canvasRef} aria-hidden="true" />;
}

function Hero() {
  return (
    <section className="hero scene-section" id="top">
      <div className="hero__frame" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <i className="hero__edge-marker hero__edge-marker--top" />
        <i className="hero__edge-marker hero__edge-marker--right" />
        <i className="hero__edge-marker hero__edge-marker--bottom" />
        <i className="hero__edge-marker hero__edge-marker--left" />
      </div>
      <HeroNoiseCanvas />
      <ParticleDome />
      <div className="hero__inner scene-content">
        <p className="hero-kicker">
          <span>El futuro de la</span>
          <RotatingDiscipline />
          <span>es paramétrico.</span>
        </p>
        <HeroHeadline />
      </div>
      <div className="hero__footer">
        <span>© 2026 - MORPHON</span>
        <div className="hero__social" aria-label="Enlaces sociales">
          <a href="#contacto" aria-label="LinkedIn">in</a>
          <a href="#contacto" aria-label="X">X</a>
          <a href="#contacto" aria-label="Video">▶</a>
        </div>
      </div>
    </section>
  );
}

function Intro() {
    return (
      <section className="section intro scene-section">
          <SectionTransition />
          <HeroNoiseCanvas />
        <h3 className="section-label reveal scene-content">00 / Diagnóstico</h3>
        <h2 className="reveal scene-content">
          La desconexión entre <span className="no-wrap">diseño, ingeniería y obra</span>{" "}
          <span className="text-accent">castiga la utilidad</span> de tus proyectos.
        </h2>
        <p className="reveal scene-content">
          Cuando las decisiones clave del proyecto viven en modelos desconectados, cada cambio
          pierde precisión. El resultado es retrabajo constante, errores de coordinación, ajustes
          tardíos y horas de equipo convertidas en pérdida. El flujo tradicional no está diseñado
          para la eficiencia: está diseñado para la fricción.
        </p>
    </section>
  );
}

function LazySolutionVisual() {
  const visualRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const element = visualRef.current;
    if (!element || shouldLoad) return undefined;

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "420px 0px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div className="solution-visual reveal" ref={visualRef}>
      {shouldLoad ? (
        <Suspense fallback={<div className="tower-shell tower-shell--loading">Cargando sistema...</div>}>
          <ParametricTower />
        </Suspense>
      ) : (
        <div className="tower-shell tower-shell--loading">Sistema paramétrico</div>
      )}
    </div>
  );
}

function Problem() {
  return (
    <section className="section problem scene-section">
      <SectionTransition />
      <HeroNoiseCanvas />
      <div className="solution-split">
        <div className="solution-copy reveal scene-content">
          <h3 className="section-label">01 / La solución</h3>
          <h2 className="solution-headline">
              <span className="solution-headline__reveal">
                <span className="solution-headline__accent">Sistemas</span>
              </span>
              <span className="solution-headline__reveal">
                <span className="solution-headline__accent">paramétricos:</span>
              </span>
              <span className="solution-headline__reveal">
                un modelo vivo
              </span>
              <span className="solution-headline__reveal">
                para diseñar, analizar
              </span>
              <span className="solution-headline__reveal">
                y construir.
              </span>
          </h2>
          <p>
            Integramos geometría, datos, análisis y documentación en un solo modelo interactivo.
            <br />
            Cada ajuste actualiza el proyecto en tiempo real, reduce retrabajo y convierte la
            complejidad en proyectos construibles.
          </p>
        </div>
        <div className="scene-content">
          <LazySolutionVisual />
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section className="section pillars scene-section" id="servicios">
      <SectionTransition />
      <HeroNoiseCanvas />
      <div className="pillars__content reveal scene-content">
        <div className="pillars__intro">
          <h3 className="section-label">02 / Servicios</h3>
          <h2 className="section-title">Cuatro líneas para convertir intención compleja en sistemas entregables.</h2>
        </div>
        <div className="pillar-table">
          {pillars.map((pillar) => (
            <article className="pillar-row" key={pillar.title}>
              <div className="pillar-row__top">
                <span>{pillar.index}</span>
                <span aria-hidden="true">↗</span>
              </div>
              <div className="pillar-row__copy">
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </div>
              <div className="pillar-row__media" aria-hidden="true" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Flagship() {
  return (
    <section className="flagship" id="sistema">
      <SectionTransition />
      <div className="flagship__content reveal">
        <h3 className="section-label">03 / Oferta insignia</h3>
        <h2>SISTEMA PARAMÉTRICO DE DISEÑO-A-CONSTRUCCIÓN</h2>
        <p>
          Un sistema a medida que lleva ideas arquitectónicas o estructurales complejas desde el
          concepto hasta una realidad construible: exploración, BIM, análisis, documentación,
          cuantificación y lógica de fabricación.
        </p>
      </div>
    </section>
  );
}

function ServiceRows() {
  return (
    <section className="section service-rows">
      <SectionTransition />
      <h3 className="section-label reveal">04 / Ofertas comerciales</h3>
      <div className="service-list reveal">
        {services.map(([title, text, category], index) => (
          <article className="service-row" key={title}>
            <span className="service-row__index">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <p className="service-row__category">{category}</p>
              <h3>{title}</h3>
            </div>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Process() {
  return (
    <section className="section process" id="proceso">
      <SectionTransition />
      <h3 className="section-label reveal">05 / Proceso</h3>
      <h2 className="section-title reveal">Del concepto a la fabricación con una lógica conectada.</h2>
      <div className="timeline reveal">
        {processSteps.map(([number, title, text]) => (
          <article className="timeline-row" key={title}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);

    return (
      <section className="section contact" id="contacto">
        <SectionTransition />
        <div className="contact__copy reveal">
        <h3 className="section-label">06 / Contacto</h3>
        <h2>TRAE UN PROYECTO COMPLEJO. MORPHON PUEDE CONVERTIRLO EN SISTEMA.</h2>
        <p>
          Fachada, estructura ligera, configurador, flujo BIM o paquete de fabricación: empecemos
          con el problema técnico que necesitas controlar.
        </p>
      </div>
      <form
        className="contact-form reveal"
        onSubmit={(event) => {
          event.preventDefault();
          setSent(true);
        }}
      >
        <label>
          Nombre
          <input name="name" type="text" placeholder="Tu nombre" required />
        </label>
        <label>
          Email
          <input name="email" type="email" placeholder="correo@empresa.com" required />
        </label>
        <label>
          Proyecto
          <textarea name="project" placeholder="Describe el reto de geometría, BIM, análisis o fabricación." rows="5" required />
        </label>
        <button className="button button--blue" type="submit">
          Enviar solicitud
        </button>
        {sent && <p className="form-note">Solicitud preparada. Conecta un endpoint de email para envío real.</p>}
      </form>
    </section>
  );
}

function App() {
  usePageMotion();

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Intro />
        <Problem />
        <Pillars />
        <Flagship />
        <ServiceRows />
        <Process />
        <Contact />
      </main>
      <footer className="footer">
        <span>MORPHON</span>
        <span>© 2026 - Parametric design-to-build systems for AEC.</span>
      </footer>
    </>
  );
}

export default App;
