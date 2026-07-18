/**
 * Xuất PDF phía client bằng dialog in của trình duyệt (Save as PDF).
 *
 * Đây là bản triển khai frontend-only cho demo/mock: pipeline "thật" mô tả
 * trong docs/REPORT-EXPORT-SPEC.md dùng WeasyPrint phía server để đảm bảo
 * file PDF lưu S3 khớp 100% với nội dung đã duyệt. Không có backend/PDF
 * service trong repo này nên ta dùng window.print() làm phương án tương
 * đương phía trình duyệt — không cần thêm dependency.
 */

/** Chuyển markdown đơn giản (#, ##, **bold**, danh sách "- ") sang HTML. Đủ dùng cho nội dung do buildReportMarkdown sinh ra, không phải parser markdown đầy đủ. */
function markdownToHtml(markdown: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = markdown.split('\n');
  const html: string[] = [];
  let inList = false;

  function closeList() {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  }

  function inline(text: string): string {
    return escape(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('## ')) {
      closeList();
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      closeList();
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (line === '') {
      closeList();
    } else {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return html.join('\n');
}

export function printReportAsPdf(title: string, markdown: string): void {
  const win = window.open('', '_blank', 'width=800,height=1000');
  if (!win) return;

  win.document.write(`<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1e293b; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.6; }
  h1 { font-size: 22px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
  h2 { font-size: 16px; color: #334155; margin-top: 24px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; }
  p { margin: 6px 0; }
</style>
</head>
<body>
${markdownToHtml(markdown)}
</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
}
