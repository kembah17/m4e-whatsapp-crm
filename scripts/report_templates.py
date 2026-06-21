#!/usr/bin/env python3
"""
M4E Campaign Report Generator - PDF Templates
===============================================

ReportLab-based PDF generation with Marketing4Effect branding.
Midnight Indigo backgrounds, Champagne Gold accents, DejaVu Sans fonts.

Author: Marketing4Effect (M4E)
Version: 1.0.0
"""

import math
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# ---------------------------------------------------------------------------
# M4E Brand colours
# ---------------------------------------------------------------------------
MIDNIGHT_INDIGO = HexColor("#1a1a2e")
DEEP_INDIGO = HexColor("#16213e")
DARK_PANEL = HexColor("#0f3460")
CHAMPAGNE_GOLD = HexColor("#d4af37")
SOFT_GOLD = HexColor("#f0d78c")
WHITE = HexColor("#ffffff")
LIGHT_GRAY = HexColor("#e0e0e0")
MUTED_TEXT = HexColor("#a0a0b0")
ROW_ALT = HexColor("#1e2a4a")

# Traffic-light colours
GREEN = HexColor("#2ecc71")
YELLOW = HexColor("#f39c12")
RED = HexColor("#e74c3c")

LIGHT_MAP = {"green": GREEN, "yellow": YELLOW, "red": RED}

# Tier colours
TIER_COLORS = {
    "Delighted": HexColor("#27ae60"),
    "Satisfied": HexColor("#2ecc71"),
    "Neutral": HexColor("#f39c12"),
    "At-Risk": HexColor("#e67e22"),
    "Unhappy": HexColor("#e74c3c"),
}

# Priority colours
PRIORITY_COLORS = {
    "HIGH": RED,
    "MEDIUM": YELLOW,
    "LOW": GREEN,
}

# ---------------------------------------------------------------------------
# Font registration
# ---------------------------------------------------------------------------
_FONT_REGISTERED = False
FONT_NORMAL = "Helvetica"
FONT_BOLD = "Helvetica-Bold"


def _register_fonts() -> None:
    global _FONT_REGISTERED, FONT_NORMAL, FONT_BOLD
    if _FONT_REGISTERED:
        return
    _FONT_REGISTERED = True
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    if all(os.path.exists(p) for p in paths):
        try:
            pdfmetrics.registerFont(TTFont("DejaVuSans", paths[0]))
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", paths[1]))
            FONT_NORMAL = "DejaVuSans"
            FONT_BOLD = "DejaVuSans-Bold"
        except Exception:
            pass  # fall back to Helvetica


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------
def _fmt_currency(amount: float, symbol: str = "\u20a6") -> str:
    if amount >= 1_000_000:
        return f"{symbol}{amount:,.0f}"
    elif amount >= 1000:
        return f"{symbol}{amount:,.0f}"
    else:
        return f"{symbol}{amount:,.2f}"


def _fmt_pct(value: float) -> str:
    return f"{value:.1f}%"


def _fmt_num(value: int) -> str:
    return f"{value:,}"


# ---------------------------------------------------------------------------
# Core PDF builder
# ---------------------------------------------------------------------------
PAGE_W, PAGE_H = A4  # 595.27 x 841.89 pt
MARGIN_L = 50
MARGIN_R = 50
MARGIN_T = 60
MARGIN_B = 60
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R


class M4EReportPDF:
    """Low-level PDF builder with M4E branding."""

    def __init__(
        self,
        filepath: str,
        title: str,
        subtitle: str = "",
        report_date: str = "",
    ) -> None:
        _register_fonts()
        self.filepath = filepath
        self.title = title
        self.subtitle = subtitle
        self.report_date = report_date or datetime.now().strftime("%B %Y")
        self.c = canvas.Canvas(filepath, pagesize=A4)
        self.c.setTitle(title)
        self.page_num = 0
        self.y = PAGE_H - MARGIN_T
        self._start_page()

    # -- page management ---------------------------------------------------

    def _start_page(self) -> None:
        self.page_num += 1
        self._draw_background()
        self._draw_header()
        self._draw_footer()
        self.y = PAGE_H - MARGIN_T - 50  # below header

    def _draw_background(self) -> None:
        self.c.setFillColor(MIDNIGHT_INDIGO)
        self.c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    def _draw_header(self) -> None:
        c = self.c
        # Gold line
        c.setStrokeColor(CHAMPAGNE_GOLD)
        c.setLineWidth(1.5)
        c.line(MARGIN_L, PAGE_H - 45, PAGE_W - MARGIN_R, PAGE_H - 45)
        # Title
        c.setFillColor(CHAMPAGNE_GOLD)
        c.setFont(FONT_BOLD, 10)
        c.drawString(MARGIN_L, PAGE_H - 30, "MARKETING4EFFECT")
        # Report title right-aligned
        c.setFillColor(MUTED_TEXT)
        c.setFont(FONT_NORMAL, 8)
        c.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 30, self.report_date)

    def _draw_footer(self) -> None:
        c = self.c
        c.setStrokeColor(CHAMPAGNE_GOLD)
        c.setLineWidth(0.5)
        c.line(MARGIN_L, MARGIN_B - 10, PAGE_W - MARGIN_R, MARGIN_B - 10)
        c.setFillColor(MUTED_TEXT)
        c.setFont(FONT_NORMAL, 7)
        c.drawString(
            MARGIN_L,
            MARGIN_B - 25,
            "CONFIDENTIAL \u2014 Prepared by Marketing4Effect for authorised recipients only.",
        )
        c.drawRightString(
            PAGE_W - MARGIN_R, MARGIN_B - 25, f"Page {self.page_num}"
        )

    def new_page(self) -> None:
        self.c.showPage()
        self._start_page()

    def check_space(self, needed: float) -> None:
        """Start a new page if fewer than *needed* points remain."""
        if self.y - needed < MARGIN_B + 10:
            self.new_page()

    # -- drawing primitives ------------------------------------------------

    def draw_cover(self) -> None:
        """Draw a branded cover page."""
        c = self.c
        # Large title
        c.setFillColor(CHAMPAGNE_GOLD)
        c.setFont(FONT_BOLD, 28)
        self._draw_centered_text(self.title, PAGE_H * 0.55, FONT_BOLD, 28, CHAMPAGNE_GOLD)
        # Subtitle
        if self.subtitle:
            c.setFillColor(WHITE)
            c.setFont(FONT_NORMAL, 14)
            self._draw_centered_text(self.subtitle, PAGE_H * 0.55 - 40, FONT_NORMAL, 14, WHITE)
        # Date
        c.setFillColor(MUTED_TEXT)
        c.setFont(FONT_NORMAL, 11)
        self._draw_centered_text(self.report_date, PAGE_H * 0.55 - 70, FONT_NORMAL, 11, MUTED_TEXT)
        # Decorative line
        c.setStrokeColor(CHAMPAGNE_GOLD)
        c.setLineWidth(2)
        c.line(PAGE_W * 0.3, PAGE_H * 0.55 - 90, PAGE_W * 0.7, PAGE_H * 0.55 - 90)
        # Footer branding
        c.setFillColor(MUTED_TEXT)
        c.setFont(FONT_NORMAL, 9)
        self._draw_centered_text(
            "Prepared by Marketing4Effect", MARGIN_B + 40, FONT_NORMAL, 9, MUTED_TEXT
        )
        self._draw_centered_text(
            "www.marketing4effect.com", MARGIN_B + 25, FONT_NORMAL, 8, CHAMPAGNE_GOLD
        )
        self.new_page()

    def _draw_centered_text(
        self, text: str, y: float, font: str, size: float, color: Any
    ) -> None:
        self.c.setFillColor(color)
        self.c.setFont(font, size)
        w = self.c.stringWidth(text, font, size)
        self.c.drawString((PAGE_W - w) / 2, y, text)

    def draw_section_title(self, title: str, number: Optional[int] = None) -> None:
        self.check_space(50)
        c = self.c
        self.y -= 20
        # Gold bar
        c.setFillColor(CHAMPAGNE_GOLD)
        c.rect(MARGIN_L, self.y - 2, CONTENT_W, 2, fill=1, stroke=0)
        self.y -= 8
        label = f"Section {number}: {title}" if number else title
        c.setFillColor(CHAMPAGNE_GOLD)
        c.setFont(FONT_BOLD, 14)
        c.drawString(MARGIN_L, self.y, label)
        self.y -= 22

    def draw_subsection_title(self, title: str) -> None:
        self.check_space(30)
        self.y -= 10
        self.c.setFillColor(SOFT_GOLD)
        self.c.setFont(FONT_BOLD, 11)
        self.c.drawString(MARGIN_L + 10, self.y, title)
        self.y -= 18

    def draw_paragraph(self, text: str, color: Any = None, indent: float = 0) -> None:
        """Draw wrapped paragraph text."""
        if not text:
            return
        color = color or WHITE
        self.c.setFillColor(color)
        self.c.setFont(FONT_NORMAL, 9)
        max_w = CONTENT_W - indent
        lines = self._wrap_text(text, FONT_NORMAL, 9, max_w)
        for line in lines:
            self.check_space(14)
            self.c.drawString(MARGIN_L + indent, self.y, line)
            self.y -= 13
        self.y -= 4

    def _wrap_text(self, text: str, font: str, size: float, max_w: float) -> List[str]:
        """Simple word-wrap."""
        words = text.split()
        lines: List[str] = []
        current = ""
        for word in words:
            test = f"{current} {word}".strip()
            if self.c.stringWidth(test, font, size) <= max_w:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines or [""]

    # -- metric cards ------------------------------------------------------

    def draw_metric_card(
        self,
        label: str,
        value: str,
        traffic_light: Optional[str] = None,
        x: float = 0,
        width: float = 0,
    ) -> None:
        """Draw a single metric card at position (x, self.y)."""
        c = self.c
        w = width or CONTENT_W / 3 - 8
        h = 55
        # Card background
        c.setFillColor(DEEP_INDIGO)
        c.roundRect(x, self.y - h, w, h, 5, fill=1, stroke=0)
        # Traffic light dot
        if traffic_light and traffic_light in LIGHT_MAP:
            c.setFillColor(LIGHT_MAP[traffic_light])
            c.circle(x + w - 15, self.y - 15, 5, fill=1, stroke=0)
        # Value
        c.setFillColor(WHITE)
        c.setFont(FONT_BOLD, 16)
        c.drawString(x + 12, self.y - 25, str(value))
        # Label
        c.setFillColor(MUTED_TEXT)
        c.setFont(FONT_NORMAL, 8)
        c.drawString(x + 12, self.y - 42, label)

    def draw_metric_row(self, metrics: List[Dict[str, Any]]) -> None:
        """Draw a row of up to 3 metric cards."""
        self.check_space(70)
        n = min(len(metrics), 3)
        card_w = (CONTENT_W - (n - 1) * 8) / n
        for i, m in enumerate(metrics[:3]):
            x = MARGIN_L + i * (card_w + 8)
            self.draw_metric_card(
                label=m.get("label", ""),
                value=m.get("value", ""),
                traffic_light=m.get("light"),
                x=x,
                width=card_w,
            )
        self.y -= 65

    # -- tables ------------------------------------------------------------

    def draw_table(
        self,
        headers: List[str],
        rows: List[List[str]],
        col_widths: Optional[List[float]] = None,
    ) -> None:
        """Draw a styled table with alternating row colours."""
        if not headers:
            return
        n_cols = len(headers)
        if col_widths is None:
            col_widths = [CONTENT_W / n_cols] * n_cols

        row_h = 20
        header_h = 22

        # Header
        self.check_space(header_h + row_h * min(len(rows), 3) + 10)
        c = self.c
        x0 = MARGIN_L
        # Header background
        c.setFillColor(DARK_PANEL)
        c.rect(x0, self.y - header_h, CONTENT_W, header_h, fill=1, stroke=0)
        c.setFillColor(CHAMPAGNE_GOLD)
        c.setFont(FONT_BOLD, 8)
        cx = x0
        for i, h in enumerate(headers):
            c.drawString(cx + 5, self.y - header_h + 6, h)
            cx += col_widths[i]
        self.y -= header_h

        # Rows
        for ri, row in enumerate(rows):
            self.check_space(row_h + 5)
            bg = ROW_ALT if ri % 2 == 0 else MIDNIGHT_INDIGO
            c.setFillColor(bg)
            c.rect(x0, self.y - row_h, CONTENT_W, row_h, fill=1, stroke=0)
            c.setFillColor(WHITE)
            c.setFont(FONT_NORMAL, 8)
            cx = x0
            for i, cell in enumerate(row):
                text = str(cell)[:40]  # truncate
                c.drawString(cx + 5, self.y - row_h + 6, text)
                cx += col_widths[i]
            self.y -= row_h
        self.y -= 8

    # -- charts ------------------------------------------------------------

    def draw_horizontal_bar_chart(
        self,
        data: List[Tuple[str, float]],
        title: str = "",
        max_val: Optional[float] = None,
        bar_color: Any = None,
    ) -> None:
        """Draw a simple horizontal bar chart."""
        if not data:
            return
        bar_h = 18
        label_w = 120
        chart_h = len(data) * (bar_h + 6) + 30
        self.check_space(chart_h)

        c = self.c
        if title:
            c.setFillColor(SOFT_GOLD)
            c.setFont(FONT_BOLD, 9)
            c.drawString(MARGIN_L, self.y, title)
            self.y -= 18

        max_v = max_val or max(v for _, v in data) or 1
        bar_area = CONTENT_W - label_w - 60

        for label, value in data:
            self.check_space(bar_h + 8)
            # Label
            c.setFillColor(MUTED_TEXT)
            c.setFont(FONT_NORMAL, 8)
            c.drawString(MARGIN_L, self.y - 4, label[:20])
            # Bar
            bw = (value / max_v) * bar_area if max_v else 0
            bx = MARGIN_L + label_w
            c.setFillColor(bar_color or CHAMPAGNE_GOLD)
            c.roundRect(bx, self.y - bar_h + 6, max(bw, 2), bar_h - 4, 3, fill=1, stroke=0)
            # Value label
            c.setFillColor(WHITE)
            c.setFont(FONT_NORMAL, 8)
            c.drawString(bx + bw + 5, self.y - 4, str(round(value, 1)))
            self.y -= bar_h + 4
        self.y -= 8

    def draw_tier_distribution(self, tiers: List[Dict[str, Any]]) -> None:
        """Draw satisfaction tier distribution as stacked bar + legend."""
        if not tiers:
            self.draw_paragraph("No satisfaction data available.")
            return
        self.check_space(100)
        c = self.c

        # Stacked horizontal bar
        bar_x = MARGIN_L
        bar_y = self.y - 30
        bar_h = 28
        total_pct = sum(t.get("percentage", 0) for t in tiers) or 100

        cx = bar_x
        for t in tiers:
            pct = t.get("percentage", 0)
            w = (pct / total_pct) * CONTENT_W if total_pct else 0
            color = TIER_COLORS.get(t["tier"], MUTED_TEXT)
            c.setFillColor(color)
            c.rect(cx, bar_y, max(w, 1), bar_h, fill=1, stroke=0)
            # Label inside bar if wide enough
            if w > 40:
                c.setFillColor(WHITE)
                c.setFont(FONT_BOLD, 8)
                c.drawCentredString(cx + w / 2, bar_y + 10, f"{pct:.0f}%")
            cx += w

        self.y = bar_y - 15

        # Legend
        lx = MARGIN_L
        for t in tiers:
            color = TIER_COLORS.get(t["tier"], MUTED_TEXT)
            c.setFillColor(color)
            c.rect(lx, self.y - 2, 10, 10, fill=1, stroke=0)
            c.setFillColor(WHITE)
            c.setFont(FONT_NORMAL, 8)
            label = f"{t['tier']} ({t.get('count', 0)}) - {_fmt_currency(t.get('revenue', 0))}"
            c.drawString(lx + 14, self.y, label)
            lx += CONTENT_W / 3
            if lx > PAGE_W - MARGIN_R - 50:
                lx = MARGIN_L
                self.y -= 16
        self.y -= 20

    def draw_trend_line(
        self,
        data_points: List[float],
        labels: List[str],
        title: str = "",
        y_suffix: str = "",
    ) -> None:
        """Draw a simple line chart."""
        if not data_points or len(data_points) < 2:
            return
        chart_h = 100
        chart_w = CONTENT_W - 40
        self.check_space(chart_h + 40)

        c = self.c
        if title:
            c.setFillColor(SOFT_GOLD)
            c.setFont(FONT_BOLD, 9)
            c.drawString(MARGIN_L, self.y, title)
            self.y -= 15

        ox = MARGIN_L + 30  # origin x
        oy = self.y - chart_h  # origin y

        # Axes
        c.setStrokeColor(MUTED_TEXT)
        c.setLineWidth(0.5)
        c.line(ox, oy, ox + chart_w, oy)  # x-axis
        c.line(ox, oy, ox, self.y)  # y-axis

        # Scale
        min_v = min(data_points)
        max_v = max(data_points)
        v_range = max_v - min_v if max_v != min_v else 1

        # Plot points
        n = len(data_points)
        step_x = chart_w / max(n - 1, 1)
        points = []
        for i, v in enumerate(data_points):
            px = ox + i * step_x
            py = oy + ((v - min_v) / v_range) * (chart_h - 10)
            points.append((px, py))

        # Line
        c.setStrokeColor(CHAMPAGNE_GOLD)
        c.setLineWidth(2)
        path = c.beginPath()
        path.moveTo(points[0][0], points[0][1])
        for px, py in points[1:]:
            path.lineTo(px, py)
        c.drawPath(path, stroke=1, fill=0)

        # Dots and labels
        for i, (px, py) in enumerate(points):
            c.setFillColor(CHAMPAGNE_GOLD)
            c.circle(px, py, 3, fill=1, stroke=0)
            # Value label
            c.setFillColor(WHITE)
            c.setFont(FONT_NORMAL, 7)
            c.drawCentredString(px, py + 8, f"{data_points[i]:.1f}{y_suffix}")
            # X-axis label
            if i < len(labels):
                c.setFillColor(MUTED_TEXT)
                c.setFont(FONT_NORMAL, 7)
                c.drawCentredString(px, oy - 12, labels[i][:6])

        self.y = oy - 25

    def draw_recommendation_card(
        self,
        priority: str,
        title: str,
        description: str,
        impact: str = "",
    ) -> None:
        """Draw a styled recommendation card."""
        lines = self._wrap_text(description, FONT_NORMAL, 8, CONTENT_W - 40)
        card_h = 50 + len(lines) * 12
        self.check_space(card_h + 5)

        c = self.c
        x = MARGIN_L
        # Card background
        c.setFillColor(DEEP_INDIGO)
        c.roundRect(x, self.y - card_h, CONTENT_W, card_h, 5, fill=1, stroke=0)
        # Priority badge
        badge_color = PRIORITY_COLORS.get(priority, MUTED_TEXT)
        c.setFillColor(badge_color)
        c.roundRect(x + 8, self.y - 20, 45, 14, 3, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT_BOLD, 7)
        c.drawCentredString(x + 30, self.y - 17, priority)
        # Title
        c.setFillColor(WHITE)
        c.setFont(FONT_BOLD, 10)
        c.drawString(x + 60, self.y - 18, title)
        # Description
        c.setFillColor(LIGHT_GRAY)
        c.setFont(FONT_NORMAL, 8)
        dy = self.y - 35
        for line in lines:
            c.drawString(x + 15, dy, line)
            dy -= 12
        # Impact
        if impact:
            c.setFillColor(SOFT_GOLD)
            c.setFont(FONT_NORMAL, 8)
            c.drawString(x + 15, dy - 2, f"Impact: {impact}")
        self.y -= card_h + 8

    def draw_comparison_row(
        self,
        dimension: str,
        sat_value: str,
        dis_value: str,
    ) -> None:
        """Draw a single comparison row (satisfied vs disappointed)."""
        self.check_space(22)
        c = self.c
        half = CONTENT_W / 2
        # Dimension label
        c.setFillColor(MUTED_TEXT)
        c.setFont(FONT_NORMAL, 8)
        c.drawString(MARGIN_L, self.y, dimension)
        # Satisfied value
        c.setFillColor(GREEN)
        c.setFont(FONT_BOLD, 9)
        c.drawString(MARGIN_L + half - 60, self.y, str(sat_value))
        # Disappointed value
        c.setFillColor(RED)
        c.setFont(FONT_BOLD, 9)
        c.drawString(MARGIN_L + half + 60, self.y, str(dis_value))
        self.y -= 16

    # -- save --------------------------------------------------------------

    def save(self) -> str:
        self.c.save()
        return self.filepath


# ---------------------------------------------------------------------------
# High-level report generators
# ---------------------------------------------------------------------------

def generate_monthly_report(
    metrics: Dict[str, Any],
    output_path: str,
    account_name: str = "Client",
    month_str: str = "",
) -> str:
    """Generate a complete monthly PDF report. Returns filepath."""
    os.makedirs(output_path, exist_ok=True)
    safe_name = account_name.replace(" ", "_")[:30]
    filename = f"M4E_Monthly_Report_{safe_name}_{month_str or 'report'}.pdf"
    filepath = os.path.join(output_path, filename)

    pdf = M4EReportPDF(
        filepath=filepath,
        title="Monthly Campaign Report",
        subtitle=account_name,
        report_date=month_str or datetime.now().strftime("%B %Y"),
    )
    pdf.draw_cover()

    es = metrics.get("executive_summary", {})
    dist = metrics.get("distribution", [])
    comp = metrics.get("comparison", {})
    insights = metrics.get("insights", [])
    gam = metrics.get("gamification", {})
    camp = metrics.get("campaign_performance", {})
    pipe = metrics.get("pipeline_summary", [])
    prod = metrics.get("product_performance", [])
    recs = metrics.get("recommendations", [])

    # ---- Section 1: Executive Summary ------------------------------------
    pdf.draw_section_title("Executive Summary", 1)
    pdf.draw_paragraph(
        "This section provides a high-level overview of your customer reactivation "
        "campaign performance for the reporting period. Traffic-light indicators show "
        "performance against benchmarks: green (on target), yellow (needs attention), "
        "red (action required)."
    )
    pdf.draw_metric_row([
        {"label": "Active Customers", "value": f"{es.get('active_customers', 0):,} / {es.get('total_contacts', 0):,}", "light": es.get("active_light")},
        {"label": "Satisfaction Score", "value": f"{es.get('satisfaction_avg', 0):.1f} / 100", "light": es.get("satisfaction_light")},
        {"label": "Delighted Customers", "value": _fmt_pct(es.get("delighted_pct", 0)), "light": es.get("delighted_light")},
    ])
    pdf.draw_metric_row([
        {"label": "Unhappy Customers", "value": _fmt_pct(es.get("unhappy_pct", 0)), "light": es.get("unhappy_light")},
        {"label": "Revenue from Satisfied", "value": _fmt_currency(es.get("revenue_from_satisfied", 0)), "light": es.get("revenue_satisfied_light")},
        {"label": "Recovery Rate", "value": _fmt_pct(es.get("recovery_rate", 0)), "light": es.get("recovery_light")},
    ])
    pdf.draw_paragraph(
        f"In plain terms: {es.get('active_customers', 0):,} out of {es.get('total_contacts', 0):,} "
        f"contacts actively engaged this month ({_fmt_pct(es.get('active_pct', 0))}). "
        f"The average satisfaction score is {es.get('satisfaction_avg', 0):.1f}/100. "
        f"Revenue from satisfied customers (score 60+) totals {_fmt_currency(es.get('revenue_from_satisfied', 0))}, "
        f"representing {_fmt_pct(es.get('revenue_satisfied_pct', 0))} of total revenue.",
        color=MUTED_TEXT,
    )

    # ---- Section 2: Satisfaction Distribution ----------------------------
    pdf.draw_section_title("Satisfaction Distribution", 2)
    pdf.draw_paragraph(
        "Contacts are scored 0-100 based on engagement, purchase behaviour, complaint history, "
        "positive indicators, and pipeline stage. They are grouped into five tiers."
    )
    pdf.draw_tier_distribution(dist)
    if dist:
        pdf.draw_table(
            headers=["Tier", "Range", "Count", "Percentage", "Revenue", "Rev %"],
            rows=[
                [
                    d["tier"], d["range"], str(d["count"]),
                    _fmt_pct(d["percentage"]),
                    _fmt_currency(d["revenue"]),
                    _fmt_pct(d["revenue_pct"]),
                ]
                for d in dist
            ],
            col_widths=[80, 55, 50, 70, 100, 60],
        )

    # ---- Section 3: Satisfied vs Disappointed ----------------------------
    pdf.draw_section_title("Satisfied vs Disappointed Deep Comparison", 3)
    sat = comp.get("satisfied", {})
    dis = comp.get("disappointed", {})
    pdf.draw_paragraph(
        f"Comparing {sat.get('count', 0)} satisfied contacts (score 60-100) against "
        f"{dis.get('count', 0)} disappointed contacts (score 0-39) across key dimensions."
    )
    # Comparison header
    pdf.check_space(30)
    c = pdf.c
    half = CONTENT_W / 2
    c.setFillColor(GREEN)
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_L + half - 80, pdf.y, "Satisfied (60-100)")
    c.setFillColor(RED)
    c.drawString(MARGIN_L + half + 40, pdf.y, "Disappointed (0-39)")
    pdf.y -= 20

    dimensions = [
        ("Contact Count", _fmt_num(sat.get("count", 0)), _fmt_num(dis.get("count", 0))),
        ("Total Spend", _fmt_currency(sat.get("total_spend", 0)), _fmt_currency(dis.get("total_spend", 0))),
        ("Avg Spend", _fmt_currency(sat.get("avg_spend", 0)), _fmt_currency(dis.get("avg_spend", 0))),
        ("Avg Messages Sent", f"{sat.get('avg_messages_sent', 0):.1f}", f"{dis.get('avg_messages_sent', 0):.1f}"),
        ("Avg Messages Received", f"{sat.get('avg_messages_received', 0):.1f}", f"{dis.get('avg_messages_received', 0):.1f}"),
        ("Avg Purchase Count", f"{sat.get('avg_purchase_count', 0):.1f}", f"{dis.get('avg_purchase_count', 0):.1f}"),
        ("Avg Order Value", _fmt_currency(sat.get("avg_order_value", 0)), _fmt_currency(dis.get("avg_order_value", 0))),
    ]
    for dim, sv, dv in dimensions:
        pdf.draw_comparison_row(dim, sv, dv)

    # Top tags
    pdf.draw_subsection_title("Top Tags")
    sat_tags = ", ".join(sat.get("top_tags", [])) or "None"
    dis_tags = ", ".join(dis.get("top_tags", [])) or "None"
    pdf.draw_paragraph(f"Satisfied: {sat_tags}", color=GREEN)
    pdf.draw_paragraph(f"Disappointed: {dis_tags}", color=RED)

    # ---- Section 4: Actionable Insights ----------------------------------
    pdf.draw_section_title("Actionable Insights", 4)
    pdf.draw_paragraph(
        "These insights are automatically generated from your data patterns. "
        "Each insight identifies a trend and suggests a response."
    )
    for i, insight in enumerate(insights, 1):
        pdf.draw_paragraph(f"{i}. {insight}")

    # ---- Section 5: Gamification -----------------------------------------
    pdf.draw_section_title("Gamification Report", 5)
    note = gam.get("note", "")
    if note:
        pdf.draw_paragraph(note, color=MUTED_TEXT)
    pdf.draw_metric_row([
        {"label": "Raffle Entries", "value": _fmt_num(gam.get("raffle_entries", 0))},
        {"label": "Loyalty Points Issued", "value": _fmt_num(gam.get("loyalty_points_issued", 0))},
        {"label": "Badges Awarded", "value": _fmt_num(gam.get("badges_awarded", 0))},
    ])
    pdf.draw_paragraph(
        f"Top Customer: {gam.get('top_customer', 'N/A')}",
        color=CHAMPAGNE_GOLD,
    )

    # ---- Section 6: Campaign Performance ---------------------------------
    pdf.draw_section_title("Campaign Performance", 6)
    if camp.get("total_campaigns", 0) == 0:
        pdf.draw_paragraph("No broadcast campaigns were sent during this period.")
    else:
        pdf.draw_paragraph(
            f"{camp['total_campaigns']} campaigns sent to {_fmt_num(camp.get('total_sent', 0))} recipients. "
            f"Delivery rate: {_fmt_pct(camp.get('delivery_rate', 0))}, "
            f"Read rate: {_fmt_pct(camp.get('read_rate', 0))}, "
            f"Response rate: {_fmt_pct(camp.get('response_rate', 0))}."
        )
        pdf.draw_metric_row([
            {"label": "Delivery Rate", "value": _fmt_pct(camp.get("delivery_rate", 0))},
            {"label": "Read Rate", "value": _fmt_pct(camp.get("read_rate", 0))},
            {"label": "Response Rate", "value": _fmt_pct(camp.get("response_rate", 0))},
        ])
        campaigns = camp.get("campaigns", [])
        if campaigns:
            pdf.draw_table(
                headers=["Campaign", "Sent", "Delivered", "Read", "Replied", "Del %", "Read %"],
                rows=[
                    [
                        c_item["name"][:25], str(c_item["sent"]),
                        str(c_item["delivered"]), str(c_item["read"]),
                        str(c_item["replied"]),
                        _fmt_pct(c_item["delivery_rate"]),
                        _fmt_pct(c_item["read_rate"]),
                    ]
                    for c_item in campaigns
                ],
                col_widths=[110, 50, 60, 50, 50, 55, 55],
            )

    # ---- Section 7: Pipeline Summary -------------------------------------
    pdf.draw_section_title("Pipeline Summary", 7)
    if not pipe:
        pdf.draw_paragraph("No pipeline data available for this period.")
    else:
        pdf.draw_paragraph(
            "Overview of deals across pipeline stages, showing volume, value, and conversion rates."
        )
        pdf.draw_table(
            headers=["Stage", "Deals", "Total Value", "Avg Value", "Won", "Conv %"],
            rows=[
                [
                    s["stage"], str(s["deal_count"]),
                    _fmt_currency(s["total_value"]),
                    _fmt_currency(s["avg_value"]),
                    str(s["won_count"]),
                    _fmt_pct(s["conversion_rate"]),
                ]
                for s in pipe
            ],
            col_widths=[100, 50, 90, 80, 45, 55],
        )
        # Bar chart of deal values
        chart_data = [(s["stage"], s["total_value"]) for s in pipe if s["total_value"] > 0]
        if chart_data:
            pdf.draw_horizontal_bar_chart(chart_data, title="Deal Value by Stage")

    # ---- Section 8: Product Performance ----------------------------------
    pdf.draw_section_title("Product Performance", 8)
    if not prod:
        pdf.draw_paragraph("No purchase data available for this period.")
    else:
        pdf.draw_paragraph(
            "Product-level performance showing purchases, revenue, and average pricing."
        )
        pdf.draw_table(
            headers=["Product", "Category", "Purchases", "Qty Sold", "Revenue", "Avg Price"],
            rows=[
                [
                    p["name"][:25], p["category"][:15],
                    str(p["purchases"]), str(p["quantity_sold"]),
                    _fmt_currency(p["revenue"]),
                    _fmt_currency(p["avg_price"]),
                ]
                for p in prod[:15]  # top 15
            ],
            col_widths=[110, 70, 60, 55, 80, 70],
        )

    # ---- Section 9: Recommendations --------------------------------------
    pdf.draw_section_title("Next Month Recommendations", 9)
    pdf.draw_paragraph(
        "Prioritised actions for the coming month based on this period\u2019s data."
    )
    if isinstance(recs, list) and recs:
        if isinstance(recs[0], dict):
            for rec in recs:
                pdf.draw_recommendation_card(
                    priority=rec.get("priority", "LOW"),
                    title=rec.get("title", ""),
                    description=rec.get("description", ""),
                    impact=rec.get("impact", ""),
                )
        else:
            for r in recs:
                pdf.draw_paragraph(f"\u2022 {r}")

    pdf.save()
    return filepath


def generate_campaign_report(
    metrics: Dict[str, Any],
    campaign_data: Dict[str, Any],
    monthly_metrics_list: List[Dict[str, Any]],
    output_path: str,
    account_name: str = "Client",
    campaign_start: str = "",
    campaign_end: str = "",
) -> str:
    """Generate end-of-campaign PDF report. Returns filepath."""
    os.makedirs(output_path, exist_ok=True)
    safe_name = account_name.replace(" ", "_")[:30]
    filename = f"M4E_Campaign_Report_{safe_name}_{campaign_start}_to_{campaign_end}.pdf"
    filepath = os.path.join(output_path, filename)

    pdf = M4EReportPDF(
        filepath=filepath,
        title="End-of-Campaign Report",
        subtitle=f"{account_name} \u2014 {campaign_start} to {campaign_end}",
        report_date=f"{campaign_start} to {campaign_end}",
    )
    pdf.draw_cover()

    # ---- All 9 monthly sections (using latest month metrics) -------------
    es = metrics.get("executive_summary", {})
    dist = metrics.get("distribution", [])
    comp = metrics.get("comparison", {})
    insights = metrics.get("insights", [])
    gam = metrics.get("gamification", {})
    camp_perf = metrics.get("campaign_performance", {})
    pipe = metrics.get("pipeline_summary", [])
    prod = metrics.get("product_performance", [])
    recs = metrics.get("recommendations", [])

    # Section 1-9 (same as monthly but labelled as campaign summary)
    pdf.draw_section_title("Campaign Executive Summary", 1)
    pdf.draw_paragraph(
        "Aggregate performance across the entire campaign period. "
        "These metrics reflect the final state at campaign close."
    )
    pdf.draw_metric_row([
        {"label": "Active Customers", "value": f"{es.get('active_customers', 0):,} / {es.get('total_contacts', 0):,}", "light": es.get("active_light")},
        {"label": "Satisfaction Score", "value": f"{es.get('satisfaction_avg', 0):.1f} / 100", "light": es.get("satisfaction_light")},
        {"label": "Delighted Customers", "value": _fmt_pct(es.get("delighted_pct", 0)), "light": es.get("delighted_light")},
    ])
    pdf.draw_metric_row([
        {"label": "Unhappy Customers", "value": _fmt_pct(es.get("unhappy_pct", 0)), "light": es.get("unhappy_light")},
        {"label": "Revenue from Satisfied", "value": _fmt_currency(es.get("revenue_from_satisfied", 0)), "light": es.get("revenue_satisfied_light")},
        {"label": "Recovery Rate", "value": _fmt_pct(es.get("recovery_rate", 0)), "light": es.get("recovery_light")},
    ])

    # Sections 2-9 abbreviated
    pdf.draw_section_title("Satisfaction Distribution", 2)
    pdf.draw_tier_distribution(dist)

    pdf.draw_section_title("Satisfied vs Disappointed", 3)
    sat = comp.get("satisfied", {})
    dis_d = comp.get("disappointed", {})
    dims = [
        ("Count", _fmt_num(sat.get("count", 0)), _fmt_num(dis_d.get("count", 0))),
        ("Total Spend", _fmt_currency(sat.get("total_spend", 0)), _fmt_currency(dis_d.get("total_spend", 0))),
        ("Avg Spend", _fmt_currency(sat.get("avg_spend", 0)), _fmt_currency(dis_d.get("avg_spend", 0))),
    ]
    for dim, sv, dv in dims:
        pdf.draw_comparison_row(dim, sv, dv)

    pdf.draw_section_title("Insights", 4)
    for i, ins in enumerate(insights[:5], 1):
        pdf.draw_paragraph(f"{i}. {ins}")

    pdf.draw_section_title("Campaign Performance", 6)
    if camp_perf.get("total_campaigns", 0) > 0:
        pdf.draw_metric_row([
            {"label": "Delivery Rate", "value": _fmt_pct(camp_perf.get("delivery_rate", 0))},
            {"label": "Read Rate", "value": _fmt_pct(camp_perf.get("read_rate", 0))},
            {"label": "Response Rate", "value": _fmt_pct(camp_perf.get("response_rate", 0))},
        ])
    else:
        pdf.draw_paragraph("No broadcast campaigns during this period.")

    pdf.draw_section_title("Pipeline Summary", 7)
    if pipe:
        pdf.draw_table(
            headers=["Stage", "Deals", "Value", "Won", "Conv %"],
            rows=[
                [s["stage"], str(s["deal_count"]), _fmt_currency(s["total_value"]),
                 str(s["won_count"]), _fmt_pct(s["conversion_rate"])]
                for s in pipe
            ],
            col_widths=[110, 60, 110, 60, 70],
        )
    else:
        pdf.draw_paragraph("No pipeline data available.")

    # ---- Additional Section A: Campaign Timeline -------------------------
    pdf.new_page()
    timeline = campaign_data.get("timeline", [])
    pdf.draw_section_title("Campaign Timeline & Milestones", number=None)
    pdf.draw_paragraph("A. CAMPAIGN TIMELINE", color=CHAMPAGNE_GOLD)
    if timeline:
        pdf.draw_table(
            headers=["Month", "Active", "Satisfaction", "Revenue", "Recovery %"],
            rows=[
                [
                    f"Month {t['month_index']}",
                    str(t["active_customers"]),
                    f"{t['satisfaction_avg']:.1f}",
                    _fmt_currency(t["total_revenue"]),
                    _fmt_pct(t["recovery_rate"]),
                ]
                for t in timeline
            ],
            col_widths=[70, 70, 80, 110, 80],
        )
    else:
        pdf.draw_paragraph("Timeline data not available.")

    # ---- Additional Section B: Trend Analysis ----------------------------
    trends = campaign_data.get("trends", {})
    pdf.draw_section_title("Trend Analysis", number=None)
    pdf.draw_paragraph("B. MONTH-OVER-MONTH TRENDS", color=CHAMPAGNE_GOLD)
    month_labels = [f"M{i+1}" for i in range(len(timeline))]

    if trends.get("satisfaction_avg") and len(trends["satisfaction_avg"]) >= 2:
        pdf.draw_trend_line(
            trends["satisfaction_avg"], month_labels,
            title="Satisfaction Score Trend",
        )
    if trends.get("active_pct") and len(trends["active_pct"]) >= 2:
        pdf.draw_trend_line(
            trends["active_pct"], month_labels,
            title="Active Customer % Trend", y_suffix="%",
        )
    if trends.get("total_revenue") and len(trends["total_revenue"]) >= 2:
        pdf.draw_trend_line(
            trends["total_revenue"], month_labels,
            title="Revenue Trend",
        )

    # ---- Additional Section C: Detailed Analysis -------------------------
    analysis = campaign_data.get("analysis", {})
    pdf.draw_section_title("Detailed Analysis & Deductions", number=None)
    pdf.draw_paragraph("C. WHAT WORKED AND WHAT DIDN\u2019T", color=CHAMPAGNE_GOLD)

    pdf.draw_paragraph(
        f"Campaign period: {analysis.get('campaign_period', 'N/A')} "
        f"({analysis.get('total_months', 0)} months)"
    )
    pdf.draw_metric_row([
        {"label": "Satisfaction Change", "value": f"{analysis.get('satisfaction_change', 0):+.1f} pts"},
        {"label": "Revenue Change", "value": _fmt_currency(analysis.get("revenue_change", 0))},
        {"label": "Active % Change", "value": f"{analysis.get('active_change', 0):+.1f}pp"},
    ])

    pdf.draw_subsection_title("What Worked")
    for item in analysis.get("what_worked", []):
        pdf.draw_paragraph(f"\u2713 {item}", color=GREEN)

    pdf.draw_subsection_title("What Didn\u2019t Work")
    for item in analysis.get("what_didnt_work", []):
        pdf.draw_paragraph(f"\u2717 {item}", color=RED)

    # ---- Additional Section D: Practical Recommendations -----------------
    practical = campaign_data.get("practical_recommendations", [])
    pdf.draw_section_title("Practical Recommendations", number=None)
    pdf.draw_paragraph("D. REPEAT, CHANGE, STOP", color=CHAMPAGNE_GOLD)
    for cat in practical:
        pdf.draw_subsection_title(cat.get("category", ""))
        for item in cat.get("items", []):
            pdf.draw_paragraph(f"\u2022 {item}")

    # ---- Additional Section E: ROI Summary -------------------------------
    roi = campaign_data.get("roi_summary", {})
    pdf.draw_section_title("ROI Summary", number=None)
    pdf.draw_paragraph("E. RETURN ON INVESTMENT", color=CHAMPAGNE_GOLD)
    pdf.draw_metric_row([
        {"label": "Total Revenue Generated", "value": _fmt_currency(roi.get("total_revenue_generated", 0))},
        {"label": "Campaign Duration", "value": f"{roi.get('campaign_duration_months', 0)} months"},
        {"label": "Avg Monthly Revenue", "value": _fmt_currency(roi.get("avg_monthly_revenue", 0))},
    ])
    pdf.draw_metric_row([
        {"label": "Total Contacts Reached", "value": _fmt_num(roi.get("total_contacts_reached", 0))},
        {"label": "Final Satisfaction", "value": f"{roi.get('final_satisfaction', 0):.1f}/100"},
        {"label": "Satisfaction Improvement", "value": f"{roi.get('satisfaction_improvement', 0):+.1f} pts"},
    ])
    pdf.draw_paragraph(
        f"Over {roi.get('campaign_duration_months', 0)} months, the campaign generated "
        f"{_fmt_currency(roi.get('total_revenue_generated', 0))} in revenue from "
        f"{_fmt_num(roi.get('total_contacts_reached', 0))} contacts. "
        f"Customer satisfaction {'improved' if roi.get('satisfaction_improvement', 0) > 0 else 'changed'} "
        f"by {roi.get('satisfaction_improvement', 0):+.1f} points.",
        color=MUTED_TEXT,
    )

    # Final recommendations
    pdf.draw_section_title("Recommendations for Next Campaign", 9)
    if isinstance(recs, list) and recs:
        if isinstance(recs[0], dict):
            for rec in recs:
                pdf.draw_recommendation_card(
                    priority=rec.get("priority", "LOW"),
                    title=rec.get("title", ""),
                    description=rec.get("description", ""),
                    impact=rec.get("impact", ""),
                )
        else:
            for r in recs:
                pdf.draw_paragraph(f"\u2022 {r}")

    pdf.save()
    return filepath
