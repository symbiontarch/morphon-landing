from pathlib import Path
from shutil import copyfile

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "MORPHON_Design_System.pdf"
PUBLIC_OUTPUT = ROOT / "public" / "MORPHON_Design_System.pdf"

BLUE = colors.HexColor("#03439B")
DEEP = colors.HexColor("#020912")
LIGHT = colors.HexColor("#F6F9FC")
GREEN = colors.HexColor("#31FF5C")
ELECTRIC = colors.HexColor("#2A9DFF")
RED = colors.HexColor("#FF3B4F")
COPPER = colors.HexColor("#C98F5A")
INK = colors.HexColor("#222222")
MUTED = colors.HexColor("#5E6F82")


def register_fonts():
    font_paths = {
        "MorphonMono": [
            Path("C:/Windows/Fonts/consola.ttf"),
            Path("C:/Windows/Fonts/lucon.ttf"),
        ],
        "MorphonMonoBold": [
            Path("C:/Windows/Fonts/consolab.ttf"),
            Path("C:/Windows/Fonts/consola.ttf"),
        ],
    }

    for font_name, candidates in font_paths.items():
        for candidate in candidates:
            if candidate.exists():
                pdfmetrics.registerFont(TTFont(font_name, str(candidate)))
                break
        else:
            return "Helvetica", "Helvetica-Bold"
    return "MorphonMono", "MorphonMonoBold"


FONT, FONT_BOLD = register_fonts()


class ColorSwatch(Flowable):
    def __init__(self, color, width=34 * mm, height=14 * mm):
        super().__init__()
        self.color = color
        self.width = width
        self.height = height

    def draw(self):
        self.canv.setStrokeColor(colors.Color(0.02, 0.09, 0.18, alpha=0.24))
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=1)


def make_styles():
    base = getSampleStyleSheet()
    base.add(
        ParagraphStyle(
            name="HeroLabel",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=11,
            textColor=GREEN,
            uppercase=True,
            spaceAfter=8,
        )
    )
    base.add(
        ParagraphStyle(
            name="HeroTitle",
            parent=base["Title"],
            fontName=FONT_BOLD,
            fontSize=34,
            leading=38,
            textColor=colors.white,
            spaceAfter=16,
        )
    )
    base.add(
        ParagraphStyle(
            name="HeroBody",
            parent=base["BodyText"],
            fontName=FONT,
            fontSize=9.4,
            leading=15,
            textColor=colors.Color(1, 1, 1, alpha=0.78),
        )
    )
    base.add(
        ParagraphStyle(
            name="Label",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.4,
            leading=10,
            textColor=BLUE,
            spaceBefore=10,
            spaceAfter=8,
        )
    )
    base.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=base["Heading1"],
            fontName=FONT_BOLD,
            fontSize=20,
            leading=24,
            textColor=BLUE,
            spaceAfter=12,
        )
    )
    base.add(
        ParagraphStyle(
            name="Body",
            parent=base["BodyText"],
            fontName=FONT,
            fontSize=8.6,
            leading=13.4,
            textColor=colors.HexColor("#24364B"),
            spaceAfter=8,
        )
    )
    base.add(
        ParagraphStyle(
            name="Small",
            parent=base["BodyText"],
            fontName=FONT,
            fontSize=7.4,
            leading=11,
            textColor=MUTED,
        )
    )
    base.add(
        ParagraphStyle(
            name="CardTitle",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=9,
            leading=12,
            textColor=BLUE,
            spaceAfter=5,
        )
    )
    return base


styles = make_styles()


def page_background(canvas, doc):
    canvas.saveState()
    if doc.page == 1:
        canvas.setFillColor(DEEP)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.setStrokeColor(colors.Color(1, 1, 1, alpha=0.055))
        step = 14 * mm
        x = 0
        while x < A4[0]:
            canvas.line(x, 0, x, A4[1])
            x += step
        y = 0
        while y < A4[1]:
            canvas.line(0, y, A4[0], y)
            y += step
        canvas.setFillColor(BLUE)
        canvas.setFillAlpha(0.2)
        canvas.circle(A4[0] * 0.78, A4[1] * 0.82, 64 * mm, fill=1, stroke=0)
    else:
        canvas.setFillColor(LIGHT)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.setStrokeColor(colors.Color(0.0, 0.34, 0.72, alpha=0.06))
        step = 12 * mm
        x = 0
        while x < A4[0]:
            canvas.line(x, 0, x, A4[1])
            x += step
        y = 0
        while y < A4[1]:
            canvas.line(0, y, A4[0], y)
            y += step
        canvas.setFont(FONT_BOLD, 7)
        canvas.setFillColor(colors.Color(0.01, 0.26, 0.61, alpha=0.62))
        canvas.drawString(18 * mm, 12 * mm, "MORPHON DESIGN SYSTEM")
        canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, f"{doc.page:02d}")
    canvas.restoreState()


def p(text, style="Body"):
    return Paragraph(text, styles[style])


def section(label, title):
    return [p(label, "Label"), p(title, "SectionTitle")]


def build_pdf():
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=20 * mm,
    )

    story = [
        Spacer(1, 82 * mm),
        p("DESIGN SYSTEM / BRAND GUIDELINES", "HeroLabel"),
        p("Sistema visual<br/>MORPHON", "HeroTitle"),
        p(
            "Guía compacta para mantener consistencia en web, propuestas, documentación técnica "
            "e interfaces AEC. El sistema combina precisión CAD/BIM, jerarquía institucional y "
            "movimiento paramétrico controlado.",
            "HeroBody",
        ),
        PageBreak(),
    ]

    story += section("01 / FUNDAMENTO", "Precisión técnica, no decoración.")
    story += [
        p(
            "MORPHON diseña sistemas paramétricos design-to-build para equipos AEC. La marca debe "
            "sentirse técnica, precisa, institucional y controlada.",
        ),
        p("Principios: claridad técnica, información estructurada, evidencia de modelo y movimiento funcional."),
        Spacer(1, 5 * mm),
    ]

    principle_rows = [
        ["Precisión", "La composición se apoya en líneas finas, retículas, métricas y orden visual."],
        ["Sobriedad", "Evitar lenguaje exagerado y efectos decorativos que no ayuden al proyecto."],
        ["Sistema", "Cada sección debe sentirse conectada a un flujo técnico y no como piezas aisladas."],
        ["AEC", "El vocabulario y la interfaz deben hablar de BIM, geometría, documentación y coordinación."],
    ]
    story.append(
        Table(
            [[p(a, "CardTitle"), p(b, "Small")] for a, b in principle_rows],
            colWidths=[38 * mm, 118 * mm],
            style=TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.Color(0, 0.34, 0.72, alpha=0.18)),
                    ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.Color(0, 0.34, 0.72, alpha=0.12)),
                    ("BACKGROUND", (0, 0), (-1, -1), colors.Color(1, 1, 1, alpha=0.5)),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            ),
        )
    )

    story += section("02 / COLOR", "Paleta institucional y técnica.")
    colors_data = [
        ("MORPHON Blue", "#03439B", BLUE, "Identidad, CTA, titulares técnicos y navegación."),
        ("Deep Blueprint", "#020912", DEEP, "Hero, HUD, WebGL y escenas de modelo."),
        ("Light Interface", "#F6F9FC", LIGHT, "Secciones claras, formularios y cards."),
        ("Technical Green", "#31FF5C", GREEN, "Estado activo, precisión y parámetros vivos."),
        ("Electric Blue", "#2A9DFF", ELECTRIC, "Contornos BIM, cotas y highlights técnicos."),
        ("Diagnostic Red", "#FF3B4F", RED, "Fricción y diagnóstico, uso puntual."),
        ("Copper Glass", "#C98F5A", COPPER, "Vidrio tintado y materialidad del modelo."),
    ]
    color_rows = [
        [ColorSwatch(color), p(name, "CardTitle"), p(hex_value, "Small"), p(role, "Small")]
        for name, hex_value, color, role in colors_data
    ]
    story.append(
        Table(
            color_rows,
            colWidths=[38 * mm, 42 * mm, 28 * mm, 58 * mm],
            style=TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.Color(0, 0.34, 0.72, alpha=0.16)),
                    ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.Color(0, 0.34, 0.72, alpha=0.1)),
                    ("BACKGROUND", (0, 0), (-1, -1), colors.Color(1, 1, 1, alpha=0.46)),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            ),
        )
    )

    story += section("03 / TIPOGRAFÍA", "Mono técnico como voz principal.")
    story.append(
        Table(
            [
                [p("Uso", "CardTitle"), p("Familia", "CardTitle"), p("Escala", "CardTitle"), p("Regla", "CardTitle")],
                [p("Hero / H1", "Small"), p("JetBrains Mono", "Small"), p("48-112px", "Small"), p("Monumental, pocas líneas, sin ornamento.", "Small")],
                [p("Section title", "Small"), p("JetBrains Mono", "Small"), p("34-64px", "Small"), p("Compacto, fuerte, con ritmo editorial.", "Small")],
                [p("Body technical", "Small"), p("JetBrains Mono", "Small"), p("13-16px", "Small"), p("Sobrio y útil para decisión.", "Small")],
                [p("HUD / Labels", "Small"), p("JetBrains Mono", "Small"), p("8-12px", "Small"), p("Mayúsculas, compacto, funcional.", "Small")],
            ],
            colWidths=[38 * mm, 44 * mm, 32 * mm, 52 * mm],
            style=TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.Color(0, 0.34, 0.72, alpha=0.16)),
                    ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.Color(0, 0.34, 0.72, alpha=0.1)),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0, 0.26, 0.61, alpha=0.08)),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.Color(1, 1, 1, alpha=0.46)),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            ),
        )
    )

    story += section("04 / COMPONENTES", "Módulos de interfaz MORPHON.")
    component_rows = [
        ["Header técnico", "Marca, navegación, CTA y frame con esquinas."],
        ["Section Label", "Formato 00 / LABEL para orientar la narrativa."],
        ["HUD / Métricas", "Datos del modelo, parámetros vivos y lectura de proceso."],
        ["Cards de servicio", "Número, flecha, descripción breve y entregables agrupados."],
        ["Formulario diagnóstico", "Interfaz de revisión técnica para proyectos AEC."],
    ]
    story.append(
        Table(
            [[p(a, "CardTitle"), p(b, "Small")] for a, b in component_rows],
            colWidths=[50 * mm, 116 * mm],
            style=TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.Color(0, 0.34, 0.72, alpha=0.16)),
                    ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.Color(0, 0.34, 0.72, alpha=0.1)),
                    ("BACKGROUND", (0, 0), (-1, -1), colors.Color(1, 1, 1, alpha=0.46)),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            ),
        )
    )

    story += section("05 / REGLAS", "Qué sí y qué no.")
    story += [
        p("Sí: usar lenguaje AEC preciso, bordes finos, jerarquía clara y acentos verdes medidos."),
        p("Sí: separar Planeación Digital como oferta insignia y servicios como módulos contratables."),
        p("No: convertir el sitio en una estética gamer, crypto, SaaS genérico o exceso de glow."),
        p("No: usar badges decorativos, claims exagerados o cards sin propósito técnico."),
    ]

    doc.build(story, onFirstPage=page_background, onLaterPages=page_background)
    PUBLIC_OUTPUT.parent.mkdir(exist_ok=True)
    copyfile(OUTPUT, PUBLIC_OUTPUT)


if __name__ == "__main__":
    build_pdf()
    print(f"Generated {OUTPUT}")
    print(f"Copied {PUBLIC_OUTPUT}")
