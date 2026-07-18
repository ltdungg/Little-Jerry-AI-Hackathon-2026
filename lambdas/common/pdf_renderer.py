"""Markdown -> PDF rendering for the report export feature
(docs/REPORT-EXPORT-SPEC.md mục 10). Uses WeasyPrint since the Lambda already
ships as a container image (no 250MB zip-layer limit for its native libs —
see lambdas/Dockerfile), so a headless-Chromium layer isn't needed.
"""
import html as html_escape

import markdown
from weasyprint import HTML

_CSS = """
body { font-family: 'DejaVu Sans', Arial, sans-serif; color: #1e293b; font-size: 12px; line-height: 1.5; }
h1 { font-size: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
h2 { font-size: 15px; color: #2563eb; margin-top: 20px; }
h3 { font-size: 13px; margin-top: 14px; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; }
th, td { border: 1px solid #cbd5e1; padding: 4px 8px; text-align: left; }
.report-header { margin-bottom: 16px; }
.report-header .meta { color: #64748b; font-size: 11px; }
.report-footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #cbd5e1; color: #94a3b8; font-size: 10px; }
"""


def render_report_pdf(
    title: str,
    subtitle: str,
    content_markdown: str,
    generated_by: str = "Trợ lý AI",
    edited: bool = False,
) -> bytes:
    """Render a report to PDF bytes. `edited` controls the transparency
    footer note (mục 10 — cho biết nội dung có bị người dùng sửa hay chưa)."""
    body_html = markdown.markdown(content_markdown or "", extensions=["tables", "fenced_code"])

    if edited:
        footer_note = "Nội dung đã được người dùng chỉnh sửa sau khi AI tạo bản nháp."
    else:
        footer_note = f"Tạo bởi {html_escape.escape(generated_by)} — chưa qua chỉnh sửa thủ công."

    html = f"""
    <html>
    <head><meta charset="utf-8"><style>{_CSS}</style></head>
    <body>
      <div class="report-header">
        <h1>{html_escape.escape(title)}</h1>
        <div class="meta">{html_escape.escape(subtitle)}</div>
      </div>
      {body_html}
      <div class="report-footer">{footer_note}</div>
    </body>
    </html>
    """

    return HTML(string=html).write_pdf()
