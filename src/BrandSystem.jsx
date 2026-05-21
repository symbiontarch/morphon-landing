const colorTokens = [
  {
    name: "MORPHON Blue",
    value: "#03439B",
    role: "Identidad, CTA, titulares técnicos, navegación y estados institucionales.",
  },
  {
    name: "Deep Blueprint",
    value: "#020912",
    role: "Fondos técnicos, hero, HUD, WebGL y escenas de modelo.",
  },
  {
    name: "Light Interface",
    value: "#F6F9FC",
    role: "Secciones claras, formularios, cards de servicios y documentos.",
  },
  {
    name: "Technical Green",
    value: "#31FF5C",
    role: "Estado activo, precisión, parámetros vivos y selección.",
  },
  {
    name: "Electric Blue",
    value: "#2A9DFF",
    role: "Líneas BIM, contornos WebGL, cotas y acentos de interfaz.",
  },
  {
    name: "Diagnostic Red",
    value: "#FF3B4F",
    role: "Diagnóstico, fricción, pérdida de utilidad y alertas puntuales.",
  },
  {
    name: "Copper Glass",
    value: "#C98F5A",
    role: "Materialidad del modelo, vidrio tintado y diferenciación BIM.",
  },
];

const typeRows = [
  ["Hero / H1", "JetBrains Mono", "clamp(48px, 8vw, 112px)", "800", "Monumental, pocas líneas, sin ornamento."],
  ["Section title", "JetBrains Mono", "clamp(34px, 4vw, 64px)", "800", "Técnico, compacto, con ritmo editorial."],
  ["Body technical", "JetBrains Mono", "13-16px", "700", "Claro, sobrio, útil para decisión."],
  ["HUD / Labels", "JetBrains Mono", "8-12px", "800-900", "Mayúsculas, compacto, funcional."],
];

const components = [
  {
    title: "Header técnico",
    text: "Marca, navegación central, CTA y frame con esquinas. Cambia a versión clara en contacto.",
    tags: ["Nav", "CTA", "Frame"],
  },
  {
    title: "Section Label",
    text: "Formato 00 / LABEL para orientar la narrativa sin competir con el headline.",
    tags: ["00 / Label", "Mono", "Sistema"],
  },
  {
    title: "HUD / Métricas",
    text: "Paneles compactos con datos del modelo, parámetros vivos y lectura de proceso.",
    tags: ["Datos", "WebGL", "BIM"],
  },
  {
    title: "Cards de servicio",
    text: "Módulos técnicos con número, flecha, descripción breve y entregables agrupados.",
    tags: ["Entregables", "Borde fino", "Hover"],
  },
  {
    title: "Formulario diagnóstico",
    text: "Interfaz de revisión técnica para convertir un reto del proyecto en ruta de trabajo.",
    tags: ["Diagnóstico", "Proyecto AEC", "Focus"],
  },
];

const rules = [
  ["Sí", "Usar lenguaje AEC preciso, bordes finos, jerarquía clara y acentos verdes medidos."],
  ["Sí", "Separar Planeación Digital como oferta insignia y servicios como módulos contratables."],
  ["No", "Convertir el sitio en una estética gamer, crypto, SaaS genérico o exceso de glow."],
  ["No", "Usar badges decorativos, claims exagerados o cards sin propósito técnico."],
];

function BrandSection({ eyebrow, title, children }) {
  return (
    <section className="brand-system-section">
      <div className="brand-system-section__head">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function BrandSystemPage() {
  return (
    <div className="brand-system-page">
      <header className="brand-system-header">
        <a href="./#top" className="brand-system-header__brand">MORPHON</a>
        <nav aria-label="Brand system navigation">
          <a href="#colors">Color</a>
          <a href="#typography">Tipografía</a>
          <a href="#components">Componentes</a>
          <a href="#rules">Reglas</a>
        </nav>
        <a className="brand-system-header__link" href="./MORPHON_Design_System.pdf">PDF</a>
      </header>

      <main>
        <section className="brand-system-hero">
          <div className="brand-system-hero__grid" aria-hidden="true" />
          <div className="brand-system-hero__content">
            <p>Design System / Brand Guidelines</p>
            <h1>
              <span>Sistema visual</span>
              <span>MORPHON</span>
            </h1>
            <div className="brand-system-hero__copy">
              <p>
                Guía compacta para mantener consistencia en web, propuestas, documentación técnica
                e interfaces AEC. El sistema combina precisión CAD/BIM, jerarquía institucional y
                movimiento paramétrico controlado.
              </p>
            </div>
          </div>
        </section>

        <BrandSection eyebrow="01 / Fundamento" title="Precisión técnica, no decoración.">
          <div className="brand-system-principles">
            <p>
              MORPHON debe sentirse como una interfaz técnica de alto nivel: sobria, legible,
              estructurada y capaz de convertir geometría compleja en sistemas controlables.
            </p>
            <ul>
              <li>Claridad técnica antes que copy promocional.</li>
              <li>Datos, modelos y entregables como evidencia visual.</li>
              <li>Espacio negativo con intención, no vacío accidental.</li>
              <li>Movimiento corto, suave y funcional.</li>
            </ul>
          </div>
        </BrandSection>

        <BrandSection eyebrow="02 / Color" title="Paleta institucional y técnica." id="colors">
          <div className="brand-color-grid" id="colors">
            {colorTokens.map((token) => (
              <article className="brand-color-card" key={token.name}>
                <span className="brand-color-card__swatch" style={{ background: token.value }} />
                <div>
                  <strong>{token.name}</strong>
                  <code>{token.value}</code>
                  <p>{token.role}</p>
                </div>
              </article>
            ))}
          </div>
        </BrandSection>

        <BrandSection eyebrow="03 / Tipografía" title="Mono técnico como voz principal.">
          <div className="brand-type-table" id="typography">
            {typeRows.map(([use, family, size, weight, note]) => (
              <article key={use}>
                <span>{use}</span>
                <strong>{family}</strong>
                <code>{size}</code>
                <code>{weight}</code>
                <p>{note}</p>
              </article>
            ))}
          </div>
        </BrandSection>

        <BrandSection eyebrow="04 / Componentes" title="Módulos de interfaz MORPHON.">
          <div className="brand-component-grid" id="components">
            {components.map((component) => (
              <article className="brand-component-card" key={component.title}>
                <span className="brand-component-card__corner" aria-hidden="true" />
                <h3>{component.title}</h3>
                <p>{component.text}</p>
                <div>
                  {component.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </BrandSection>

        <BrandSection eyebrow="05 / Movimiento" title="Transiciones precisas y contenidas.">
          <div className="brand-motion-panel">
            <div>
              <span>Section Entry</span>
              <strong>y: 24 → 0 / opacity: 0 → 1</strong>
            </div>
            <div>
              <span>Soft Snap</span>
              <strong>Desktop y tablet, después de scroll idle</strong>
            </div>
            <div>
              <span>WebGL Loop</span>
              <strong>Proceso continuo, etapas coordinadas con UI</strong>
            </div>
          </div>
        </BrandSection>

        <BrandSection eyebrow="06 / Reglas" title="Qué sí y qué no.">
          <div className="brand-rules" id="rules">
            {rules.map(([label, text]) => (
              <article className={label === "Sí" ? "is-do" : "is-dont"} key={text}>
                <span>{label}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </BrandSection>
      </main>
    </div>
  );
}

export default BrandSystemPage;
