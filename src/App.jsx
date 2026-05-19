import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { Fragment, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const ParametricTower = lazy(() => import("./ParametricTower.jsx"));
const ParametricModelAnimation = lazy(() => import("./ParametricModelAnimation.jsx"));

const navItems = [
  ["INICIO", "#top"],
  ["DIAGNÓSTICO", "#diagnostico"],
  ["SISTEMA", "#sistema"],
  ["SERVICIOS", "#oferta-insignia"],
  ["CONTACTO", "#contacto"],
];

const SNAP_SECTION_HASHES = ["#top", "#diagnostico", "#sistema", "#oferta-insignia", "#servicios", "#contacto"];
const SECTION_SNAP_MIN_WIDTH = 760;
const SECTION_SNAP_IDLE_MS = 160;
const SECTION_SNAP_THRESHOLD_VH = 0.22;
const SECTION_SNAP_COOLDOWN_MS = 700;
const NAV_SCROLL_DURATION = 0.9;
const SNAP_SCROLL_DURATION = 0.55;

function getNavHashForSection(hash) {
  if (hash === "#servicios") return "#oferta-insignia";
  return navItems.some(([, href]) => href === hash) ? hash : "#top";
}

const heroCopyLines = [
  "Diseñamos sistemas paramétricos, herramientas de automatización",
  "y flujos BIM inteligentes para convertir geometría compleja",
  "en modelos analizables, documentables y construibles.",
];

const pillars = [
  {
    index: "01",
    title: "BIM + Documentación",
    titleLines: ["BIM +", "Documentación"],
    subtitle: "Modelos inteligentes para coordinar, cuantificar y construir.",
    description:
      "Desarrollamos modelos BIM, flujos Revit/Rhino, cuantificaciones, documentación ejecutiva, planos de taller y entregables técnicos conectados a la lógica del proyecto.",
    tags: ["Modelos BIM", "Docs ejecutivos", "Cantidades", "Planos de taller"],
  },
  {
    index: "02",
    title: "Productos Digitales AEC",
    titleLines: ["Productos Digitales", "AEC"],
    subtitle: "Herramientas para vender, configurar y automatizar decisiones.",
    description:
      "Creamos configuradores 3D, cotizadores automatizados, dashboards técnicos e interfaces web para convertir procesos internos en herramientas digitales reutilizables.",
    tags: ["Configuradores 3D", "Cotización", "Dashboards", "Web"],
  },
  {
    index: "03",
    title: "Automatización AEC",
    titleLines: ["Automatización", "AEC"],
    subtitle: "Menos tareas repetitivas. Más entregables controlados.",
    description:
      "Desarrollamos scripts, conectores, plugins y flujos de automatización para reducir trabajo manual, conectar plataformas y acelerar entregables.",
    tags: ["Scripts", "Conectores", "Plugins", "Flujos internos"],
  },
  {
    index: "04",
    title: "Formación de Equipos AEC",
    titleLines: ["Formación de", "Equipos AEC"],
    subtitle: "Entrenamiento aplicado para adoptar BIM, automatización, IA y flujos paramétricos.",
    description:
      "Acompañamos a equipos de arquitectura, ingeniería y construcción con talleres prácticos, estándares internos y ejercicios aplicados a proyectos reales.",
    tags: ["Capacitación", "BIM", "IA aplicada", "Flujos AEC"],
  },
];

const flagshipStages = [
  { key: "design", title: "Diseño", text: "Geometría base" },
  { key: "analysis", title: "Análisis", text: "Desempeño" },
  { key: "bim", title: "BIM", text: "Coordinación" },
  { key: "documentation", title: "Documentación", text: "Ejecutiva" },
];

const flagshipStageDurations = [8000, 8000, 8000, 8000];

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
    let activeFrameId = 0;
    let resizeTimeoutId = 0;
    let snapIdleTimeoutId = 0;
    let snapCooldownUntil = 0;
    let programmaticTimeoutId = 0;
    let programmaticScrollToken = 0;
    let lastActiveHash = "";
    let isTowerScrollLocked = false;
    let isProgrammaticScroll = false;
    const hashScrollTimeouts = [];
    const clearScheduledHashScroll = () => {
      while (hashScrollTimeouts.length) {
        window.clearTimeout(hashScrollTimeouts.pop());
      }
    };
    const clearSnapIdleTimer = () => {
      if (!snapIdleTimeoutId) return;
      window.clearTimeout(snapIdleTimeoutId);
      snapIdleTimeoutId = 0;
    };
    const clearProgrammaticTimer = () => {
      if (!programmaticTimeoutId) return;
      window.clearTimeout(programmaticTimeoutId);
      programmaticTimeoutId = 0;
    };
    const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
    const resolveHashTarget = (hash) => {
      if (!hash) return null;

      return document.getElementById(decodeURIComponent(hash.replace("#", "")));
    };
    const getSectionTop = (hash) => {
      if (hash === "#top") return 0;
      const target = resolveHashTarget(hash);
      if (!target) return 0;
      return Math.max(0, target.getBoundingClientRect().top + window.scrollY);
    };
    const getSectionEntries = () =>
      SNAP_SECTION_HASHES
        .map((hash) => ({ hash, top: getSectionTop(hash) }))
        .sort((a, b) => a.top - b.top);
    const getActiveSectionHash = () => {
      const marker = window.scrollY + Math.min(window.innerHeight * 0.34, 320);
      return getSectionEntries().reduce((active, section) => (section.top <= marker ? section.hash : active), "#top");
    };
    const dispatchActiveSection = (hash) => {
      if (!hash || hash === lastActiveHash) return;
      lastActiveHash = hash;
      window.dispatchEvent(new CustomEvent("morphon:active-section", { detail: { hash } }));
    };
    const syncActiveSection = (forcedHash) => {
      dispatchActiveSection(forcedHash || getActiveSectionHash());
    };
    const requestActiveSectionSync = () => {
      if (activeFrameId || isProgrammaticScroll) return;
      activeFrameId = window.requestAnimationFrame(() => {
        activeFrameId = 0;
        syncActiveSection();
      });
    };
    const setLocationHash = (hash, mode = "replace") => {
      if (!hash || window.location.hash === hash) return;
      const method = mode === "push" ? "pushState" : "replaceState";
      window.history[method](null, "", `${window.location.pathname}${window.location.search}${hash}`);
    };
    const finishProgrammaticScroll = (hash, historyMode) => {
      isProgrammaticScroll = false;
      clearProgrammaticTimer();
      if (historyMode) {
        setLocationHash(hash, historyMode);
      }
      syncActiveSection(hash);
    };
    const scrollToHash = (hash, options = {}) => {
      const {
        immediate = false,
        source = "programmatic",
        historyMode = null,
      } = options;
      const targetHash = SNAP_SECTION_HASHES.includes(hash) ? hash : "#top";
      const targetTop = getSectionTop(targetHash);
      const duration = source === "snap" ? SNAP_SCROLL_DURATION : NAV_SCROLL_DURATION;
      const token = programmaticScrollToken + 1;
      let completed = false;
      const complete = () => {
        if (completed || token !== programmaticScrollToken) return;
        completed = true;
        finishProgrammaticScroll(targetHash, historyMode);
      };

      clearSnapIdleTimer();
      clearProgrammaticTimer();
      programmaticScrollToken = token;
      isProgrammaticScroll = true;
      ScrollTrigger.update();

      if (lenis && !reduced) {
        lenis.scrollTo(targetTop, {
          duration,
          easing: easeOutCubic,
          force: true,
          immediate,
          lock: true,
          onComplete: complete,
        });
        programmaticTimeoutId = window.setTimeout(complete, immediate ? 80 : duration * 1000 + 220);
        return;
      }

      window.scrollTo({
        top: targetTop,
        behavior: immediate || reduced ? "auto" : "smooth",
      });
      programmaticTimeoutId = window.setTimeout(complete, immediate || reduced ? 80 : duration * 1000 + 220);
    };
    const scheduleHashScroll = (immediate = false, hash = window.location.hash, retry = true) => {
      clearScheduledHashScroll();
      (retry ? [0, 140, 720, 1400] : [0]).forEach((delay) => {
        const timeoutId = window.setTimeout(() => {
          ScrollTrigger.refresh();
          scrollToHash(hash || "#top", { immediate: immediate || delay < 200, source: "history" });
        }, delay);
        hashScrollTimeouts.push(timeoutId);
      });
    };
    const getNearestSection = () => {
      const scrollY = window.scrollY;
      return getSectionEntries().reduce((nearest, section) => {
        const distance = Math.abs(section.top - scrollY);
        return distance < nearest.distance ? { ...section, distance } : nearest;
      }, { hash: "#top", top: 0, distance: Number.POSITIVE_INFINITY });
    };
    const isFormFocused = () => {
      const activeElement = document.activeElement;
      return Boolean(activeElement?.matches?.("input, textarea, select, button, [contenteditable='true']"));
    };
    const canSoftSnap = () =>
      !reduced &&
      window.innerWidth >= SECTION_SNAP_MIN_WIDTH &&
      !isTowerScrollLocked &&
      !isProgrammaticScroll &&
      performance.now() >= snapCooldownUntil &&
      !isFormFocused();
    const handleSoftSnap = () => {
      snapIdleTimeoutId = 0;
      if (!canSoftSnap()) return;

      const nearest = getNearestSection();
      const snapThreshold = window.innerHeight * SECTION_SNAP_THRESHOLD_VH;
      if (!nearest || nearest.distance < 2 || nearest.distance > snapThreshold) return;

      snapCooldownUntil = performance.now() + SECTION_SNAP_COOLDOWN_MS;
      scrollToHash(nearest.hash, { source: "snap", historyMode: "replace" });
    };
    const scheduleSoftSnap = () => {
      clearSnapIdleTimer();
      if (!canSoftSnap()) return;
      snapIdleTimeoutId = window.setTimeout(handleSoftSnap, SECTION_SNAP_IDLE_MS);
    };
    const handleScroll = () => {
      requestActiveSectionSync();
      scheduleSoftSnap();
    };
    const handleResize = () => {
      window.clearTimeout(resizeTimeoutId);
      resizeTimeoutId = window.setTimeout(() => {
        ScrollTrigger.refresh();
        syncActiveSection();
      }, 180);
    };

    if (!reduced) {
      lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
      const raf = (time) => {
        lenis.raf(time);
        ScrollTrigger.update();
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);

      gsap.set(".hero__inner", { clearProps: "opacity,visibility,transform,filter,clipPath" });

      gsap.utils.toArray(".scene-section:not(.hero) .scene-content").forEach((element) => {
        gsap.fromTo(
          element,
          { y: 24, opacity: 0, filter: "blur(4px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.82,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 86%",
              toggleActions: "play none none reverse",
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
            duration: 0.48,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 82%",
              toggleActions: "play none none reverse",
            },
          },
        );

        gsap.fromTo(
          scanline,
          { xPercent: -8, scaleX: 0, opacity: 0 },
          {
            xPercent: 0,
            scaleX: 1,
            opacity: 0.52,
            duration: 0.78,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 86%",
              toggleActions: "play none none reverse",
            },
          },
        );

        gsap.fromTo(
          marks,
          { opacity: 0, scale: 0.82 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.52,
            stagger: 0.025,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 82%",
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
    const handleHashScroll = () => {
      scheduleHashScroll();
    };
    const handleHashNavigate = (event) => {
      clearScheduledHashScroll();
      scrollToHash(event.detail?.hash || window.location.hash || "#top", {
        immediate: Boolean(event.detail?.immediate),
        source: event.detail?.source || "nav",
        historyMode: event.detail?.source === "snap" ? "replace" : "push",
      });
    };

    window.addEventListener("morphon:tower-scroll-lock", handleTowerScrollLock);
    window.addEventListener("morphon:navigate-hash", handleHashNavigate);
    window.addEventListener("hashchange", handleHashScroll);
    window.addEventListener("popstate", handleHashScroll);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });

    scheduleHashScroll(true);
    syncActiveSection();

    return () => {
      window.removeEventListener("morphon:tower-scroll-lock", handleTowerScrollLock);
      window.removeEventListener("morphon:navigate-hash", handleHashNavigate);
      window.removeEventListener("hashchange", handleHashScroll);
      window.removeEventListener("popstate", handleHashScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      clearScheduledHashScroll();
      clearSnapIdleTimer();
      clearProgrammaticTimer();
      window.clearTimeout(resizeTimeoutId);
      cancelAnimationFrame(activeFrameId);
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
  const [isLightHeader, setIsLightHeader] = useState(false);
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

  const navigateToHash = (event, href) => {
    event.preventDefault();
    setActiveHash(href);

    window.dispatchEvent(new CustomEvent("morphon:navigate-hash", { detail: { hash: href, immediate: href === "#top", source: "nav" } }));
    requestAnimationFrame(() => moveIndicator(href));
  };

  useEffect(() => {
    let frameId = 0;

    const syncHeaderTheme = () => {
      frameId = 0;
      const probeY = Math.min(82, window.innerHeight * 0.16);
      const currentSection = Array.from(document.querySelectorAll("main section")).find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= probeY && rect.bottom >= probeY;
      });
      setIsLightHeader(currentSection?.id === "contacto");
    };

    const requestHeaderThemeSync = () => {
      if (frameId) return;
      frameId = requestAnimationFrame(syncHeaderTheme);
    };

    const syncHash = () => {
      const nextHash = window.location.hash || "#top";
      const knownHash = getNavHashForSection(nextHash);
      setActiveHash(knownHash);
      requestAnimationFrame(() => moveIndicator(knownHash));
      requestHeaderThemeSync();
    };
    const syncActiveSection = (event) => {
      const knownHash = getNavHashForSection(event.detail?.hash || "#top");
      setActiveHash(knownHash);
      requestAnimationFrame(() => moveIndicator(knownHash));
      requestHeaderThemeSync();
    };

    syncHash();
    requestHeaderThemeSync();
    window.addEventListener("morphon:active-section", syncActiveSection);
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("resize", syncHash);
    window.addEventListener("scroll", requestHeaderThemeSync, { passive: true });
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("morphon:active-section", syncActiveSection);
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("resize", syncHash);
      window.removeEventListener("scroll", requestHeaderThemeSync);
    };
  }, []);

  return (
    <header className={`site-header${isLightHeader ? " site-header--light" : ""}`}>
      <a className="wordmark" href="#top" aria-label="MORPHON inicio" onClick={(event) => navigateToHash(event, "#top")}>
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
            onClick={(event) => navigateToHash(event, href)}
          >
            <ScrambleText text={label} trigger={scramble.href === href ? scramble.tick : 0} />
          </a>
        ))}
      </nav>
      <a className="header-cta" href="#contacto" onClick={(event) => navigateToHash(event, "#contacto")}>
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
      <section className="section intro scene-section" id="diagnostico">
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
    <section className="section problem scene-section" id="sistema">
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

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(media.matches);

    syncPreference();
    media.addEventListener?.("change", syncPreference);

    return () => media.removeEventListener?.("change", syncPreference);
  }, []);

  return reducedMotion;
}

function PipelineStepper({ stages, activeIndex, onSelect }) {
  return (
    <div className="pipeline-stepper" aria-label="Etapas de Planeación Digital">
      {stages.map((stage, index) => (
        <Fragment key={stage.key}>
          <button
            className={`pipeline-step${activeIndex === index ? " is-active" : ""}`}
            type="button"
            aria-current={activeIndex === index ? "step" : undefined}
            onClick={() => onSelect(index)}
          >
            <span className="pipeline-step__index">{String(index + 1).padStart(2, "0")}</span>
            <span>
              <strong>{stage.title}</strong>
              <span>{stage.text}</span>
            </span>
          </button>
          {index < stages.length - 1 && <span className="pipeline-stepper__arrow" aria-hidden="true" />}
        </Fragment>
      ))}
    </div>
  );
}

function FlagshipOfferSection() {
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef(null);
  const isSectionActiveRef = useRef(false);
  const [activeStage, setActiveStage] = useState(0);
  const [isAnimationReady, setIsAnimationReady] = useState(false);
  const [isSectionActive, setIsSectionActive] = useState(false);
  const [hasAnimationStarted, setHasAnimationStarted] = useState(false);
  const [playbackKey, setPlaybackKey] = useState(0);
  const activeStageIndex = Math.min(activeStage, flagshipStages.length - 1);
  const handleAnimationReady = useCallback(() => {
    setIsAnimationReady(true);
  }, []);
  const restartAnimation = useCallback(() => {
    setActiveStage(0);
    setHasAnimationStarted(true);
    setPlaybackKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const syncSectionActivity = (active) => {
      if (isSectionActiveRef.current === active) return;
      isSectionActiveRef.current = active;
      setIsSectionActive(active);

      if (active) {
        restartAnimation();
      }
    };
    const sectionContainsActivationLine = () => {
      const section = sectionRef.current;
      if (!section) return false;

      const rect = section.getBoundingClientRect();
      const activationLine = Math.min(window.innerHeight * 0.38, 320);
      return rect.top <= activationLine && rect.bottom >= activationLine;
    };
    const handleActiveSection = (event) => {
      syncSectionActivity(event.detail?.hash === "#oferta-insignia");
    };

    window.addEventListener("morphon:active-section", handleActiveSection);
    syncSectionActivity(window.location.hash === "#oferta-insignia" || sectionContainsActivationLine());

    return () => window.removeEventListener("morphon:active-section", handleActiveSection);
  }, [restartAnimation]);

  useEffect(() => {
    if (!isAnimationReady || !isSectionActive || !hasAnimationStarted || reducedMotion) return undefined;

    const timeoutId = window.setTimeout(() => {
      setActiveStage((stage) => (Math.min(stage, flagshipStages.length - 1) + 1) % flagshipStages.length);
    }, flagshipStageDurations[activeStageIndex]);

    return () => window.clearTimeout(timeoutId);
  }, [activeStageIndex, hasAnimationStarted, isAnimationReady, isSectionActive, reducedMotion]);

  return (
    <section className="flagship-offer scene-section" id="oferta-insignia" ref={sectionRef}>
      <SectionTransition />
      <HeroNoiseCanvas />
      <div className="flagship-offer__frame reveal scene-content">
        <span className="flagship-offer__corner flagship-offer__corner--tl" aria-hidden="true" />
        <span className="flagship-offer__corner flagship-offer__corner--tr" aria-hidden="true" />
        <span className="flagship-offer__corner flagship-offer__corner--br" aria-hidden="true" />
        <span className="flagship-offer__corner flagship-offer__corner--bl" aria-hidden="true" />
        <div className="flagship-offer__layout">
          <div className="flagship-offer__copy">
            <h3 className="section-label">02 / Oferta Insignia</h3>
            <h2 className="flagship-offer__title">
              <span>Planeación</span>
              <span>Digital</span>
            </h2>
            <p className="flagship-offer__subtitle">Del diseño al entregable técnico desde un solo modelo.</p>
          </div>
          <div className="flagship-offer__visual" aria-label="Modelo técnico animado de Planeación Digital">
            <Suspense fallback={<div className="model-animation model-animation--loading">Modelo vivo</div>}>
              <ParametricModelAnimation
                activeStage={activeStageIndex}
                isPlaying={isSectionActive && hasAnimationStarted}
                reducedMotion={reducedMotion}
                restartKey={playbackKey}
                onReady={handleAnimationReady}
              />
            </Suspense>
          </div>
          <p className="flagship-offer__text">
            Desarrollamos modelos paramétricos BIM que conectan diseño, ingeniería, análisis,
            cuantificación, documentación ejecutiva, planos de taller y coordinación técnica.
          </p>
        </div>
        <PipelineStepper stages={flagshipStages} activeIndex={activeStageIndex} onSelect={setActiveStage} />
      </div>
    </section>
  );
}

function ServiceMark() {
  return (
    <span className="service-card__mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function ServiceCard({ service }) {
  return (
    <article className="service-card">
      <div className="service-card__top">
        <span>{service.index}</span>
        <span className="service-card__arrow" aria-hidden="true" />
      </div>
      <div className="service-card__body">
        <ServiceMark />
        <h3>
          {(service.titleLines || [service.title]).map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h3>
        <p>{service.subtitle}</p>
      </div>
      <div className="service-card__tags" aria-label={`Entregables de ${service.title}`}>
        {service.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  );
}

function ServicesSection() {
  return (
    <section className="services-section scene-section" id="servicios">
      <SectionTransition />
      <HeroNoiseCanvas />
      <div className="services-section__inner reveal scene-content">
        <div className="services-section__intro">
          <h3 className="section-label">03 / Servicios</h3>
          <h2>Servicios específicos para etapas críticas del proyecto.</h2>
          <p>
            Podemos desarrollar soluciones puntuales para coordinar, automatizar, documentar o
            capacitar equipos AEC.
          </p>
        </div>
        <div className="services-grid">
          {pillars.map((service) => (
            <ServiceCard service={service} key={service.title} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);

    return (
      <section className="section contact scene-section" id="contacto">
        <SectionTransition />
        <div className="contact__copy reveal scene-content">
        <h3 className="section-label">04 / Contacto</h3>
        <h2>TRAE UN PROYECTO COMPLEJO. MORPHON PUEDE CONVERTIRLO EN SISTEMA.</h2>
        <p>
          Fachada, estructura ligera, configurador, flujo BIM o paquete de fabricación: empecemos
          con el problema técnico que necesitas controlar.
        </p>
      </div>
      <form
        className="contact-form reveal scene-content"
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
        <FlagshipOfferSection />
        <ServicesSection />
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
