/** Lightweight markdown → HTML for internal docs (no extra dependency) */
export function renderSimpleMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inCode = false;
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inline = (s: string) =>
    escape(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#c41e20] underline">$1</a>');

  for (const line of lines) {
    if (line.startsWith("```")) {
      closeList();
      if (!inCode) {
        out.push('<pre class="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">');
        inCode = true;
      } else {
        out.push("</pre>");
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      out.push(escape(line));
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      out.push(`<h3 class="mt-6 mb-2 text-lg font-semibold">${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      out.push(`<h2 class="mt-8 mb-3 text-xl font-bold text-[#1a2b4c]">${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      out.push(`<h1 class="mb-4 text-3xl font-bold text-[#1a2b4c]">${inline(line.slice(2))}</h1>`);
      continue;
    }

    if (/^-\s+/.test(line) || /^\*\s+/.test(line)) {
      if (!inList) {
        out.push('<ul class="my-3 list-disc space-y-1 pl-6">');
        inList = true;
      }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      closeList();
      out.push(`<p class="my-2 pl-4">${inline(line)}</p>`);
      continue;
    }

    if (line.trim() === "") {
      closeList();
      continue;
    }

    closeList();
    out.push(`<p class="my-3 leading-relaxed text-gray-700">${inline(line)}</p>`);
  }

  closeList();
  if (inCode) out.push("</pre>");

  return out.join("\n");
}
