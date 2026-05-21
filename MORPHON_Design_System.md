# MORPHON Design System

Version 1.0  
Source: MORPHON landing page  
Use: brand identity, web UI, presentation materials, technical proposals, and AEC product interfaces.

## 1. Brand Positioning

MORPHON designs parametric design-to-build systems for AEC teams. The brand should feel technical, precise, institutional, and controlled. The visual language is based on CAD/BIM interfaces, blueprint drawings, model coordination, parametric metrics, and executive documentation.

The tone should be sober and specific. Avoid generic innovation language, startup exaggeration, decorative tech cliches, or gamer-style effects.

## 2. Design Principles

- Precision over decoration.
- Technical clarity over marketing noise.
- Controlled systems over isolated deliverables.
- Thin lines, measured contrast, and structured information.
- Motion should clarify process, not distract.
- Spanish-first copy for the Mexican AEC market.

## 3. Color System

### Primary

- MORPHON Blue: `#03439B`
  - Use for institutional identity, section labels, buttons, links, card headings, and technical emphasis.
- Deep Blueprint: `#020912`
  - Use for dark technical scenes, hero background, WebGL panels, and HUD environments.
- Light Interface: `#F6F9FC`
  - Use for light sections, forms, service cards, and documents.
- White: `#FFFFFF`
  - Use for hero text, dark-panel labels, and high-contrast surfaces.

### Accents

- Technical Green: `#31FF5C`
  - Use sparingly for active states, selected pipeline steps, system readiness, parameters, and precision markers.
- Electric Blue: `#2A9DFF`
  - Use for WebGL outlines, HUD edges, drawing references, and active technical highlights.
- Diagnostic Red: `#FF3B4F`
  - Use only for diagnostic emphasis, friction points, or problem statements.
- Copper Glass: `#C98F5A`
  - Use only in model visualization for glazing or material differentiation.

### Usage Rules

- Dark sections should use blue-black backgrounds with white text and green/blue technical accents.
- Light sections should use blue typography, fine borders, and subtle grid overlays.
- Green must stay rare. It signals activation, precision, or a selected state.
- Red should not become a brand accent. It is reserved for diagnosis/problem language.

## 4. Typography

### Primary UI Font

`JetBrains Mono`, fallback monospace.

Use for:
- Navigation
- Section labels
- Headlines
- Cards
- Metrics
- Form labels
- Buttons
- Technical captions

### Supporting Fonts

- `Inter`, fallback sans-serif for clean UI support when needed.
- `Roboto`, fallback sans-serif for editorial support only when required.

### Typographic Rules

- Use uppercase for labels, buttons, HUD titles, chips, and technical tags.
- Do not use negative letter spacing.
- Headings should be compact, strong, and monospaced.
- Body copy should be concise, practical, and project-specific.
- Avoid decorative type or expressive display fonts.

## 5. UI Language

### Core Motifs

- Thin technical borders.
- Corner registration marks.
- Blueprint grids.
- HUD panels.
- Small uppercase labels.
- Modular cards.
- Pipeline steps.
- Data metrics and parameter readouts.
- Subtle scanlines and grain.

### Cards

Cards should feel like technical modules, not marketing tiles.

Card rules:
- Border radius: `0`.
- Base border: subtle blue or white transparency.
- Background: light technical surface or dark HUD panel.
- Hover: slightly stronger border, subtle glow, small arrow movement.
- Avoid large shadows unless the section is light and needs depth.

### Chips And Tags

Tags represent deliverables, capabilities, or technical categories.

Rules:
- Use uppercase.
- Keep small and compact.
- Use fine borders.
- Avoid pill-shaped marketing badges.
- Group under a label such as `ENTREGABLES`, `PARÁMETROS`, or `RETOS FRECUENTES`.

## 6. Motion System

Motion should feel like a technical interface settling into place.

Use:
- Short section-entry fades.
- Controlled vertical movement.
- Smooth Lenis scrolling.
- Soft snapping on desktop/tablet only.
- Subtle hover transitions.
- Continuous WebGL animation loops.

Avoid:
- Heavy cinematic transitions.
- Bouncy easing.
- Excessive parallax.
- Flickering UI states.
- Gamer-style glows.

## 7. Component Inventory

### Header

- Left brand text: `MORPHON`.
- Center nav links.
- Right CTA.
- Technical frame/corner marks.
- Light/dark theme adaptation depending on section.

### Section Label

Format: `00 / LABEL`.

Examples:
- `00 / Diagnóstico`
- `02 / Oferta Insignia`
- `03 / Servicios`
- `04 / Contacto`

### Flagship Offer

The Planeación Digital section is the main product narrative. It should remain more immersive and technically rich than the service cards.

Required sequence:
- Modelo Paramétrico
- Análisis
- Coordinación BIM
- Documentación

### Service Card

Structure:
- Number.
- Arrow.
- Title.
- Short description.
- `ENTREGABLES` module.
- Tags.

### Contact Form

The form should feel like a diagnostic interface.

Tone:
- Professional.
- Direct.
- Natural for Mexico.
- No exaggerated promises.

## 8. Copy Rules

Use Spanish as the primary language. English may appear only in technical or global brand contexts, such as the footer line.

Preferred language:
- "Hablemos de tu proyecto."
- "Solicitar diagnóstico" or "Iniciar diagnóstico."
- "Planeación Digital."
- "Coordinación BIM."
- "Documentación ejecutiva."
- "Flujos paramétricos."

Avoid:
- "Revolucionamos."
- "Disruptivo."
- "Innovación sin límites."
- "Transformamos tu futuro."
- Generic SaaS phrases.

## 9. Do / Don't

### Do

- Use precise AEC language.
- Keep layouts structured.
- Let WebGL and model logic carry the premium moment.
- Use technical detail where it helps decision-making.
- Keep service offerings clearly separate from Planeación Digital.

### Don't

- Turn every section into a card grid.
- Overuse gradients or glow.
- Make the brand feel like gaming, crypto, or generic AI.
- Use decorative icons without technical purpose.
- Let text overflow or sit loosely without hierarchy.

## 10. Current Tokens

```css
:root {
  --bg: #f6f9fc;
  --ink: #222222;
  --blue: #03439b;
  --hero-dark: #020912;
  --blue-soft: #ecf3fb;
  --white: #ffffff;
  --border: rgba(0, 0, 0, 0.13);
  --font-mono: "JetBrains Mono", monospace;
  --font-editorial: "Roboto", sans-serif;
  --font-sans: "Inter", sans-serif;
}
```

## 11. Production Use

Use this system as the source for:
- Website sections.
- Proposal decks.
- BIM/product documentation.
- Product dashboards.
- Internal tools.
- Client-facing technical reports.

When adding new UI, start from the existing MORPHON motifs: thin border, clear hierarchy, compact mono labels, technical accent, restrained motion, and enough negative space for the interface to breathe.
