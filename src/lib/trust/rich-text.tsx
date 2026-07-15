import React from "react";

/**
 * Safe renderer for policy body text. Content is stored as PLAIN TEXT with a
 * tiny, well-defined markdown subset. We never use dangerouslySetInnerHTML, so
 * arbitrary HTML can never be injected — this eliminates stored-XSS risk while
 * still allowing readable formatting from the admin editor.
 *
 * Supported syntax:
 *   - Blank line            -> new paragraph
 *   - Lines starting "- "   -> bullet list
 *   - Lines starting "1. "  -> numbered list
 *   - **bold**              -> <strong>
 *   - [text](https://url)   -> safe external/internal link
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Tokenize on **bold** and [text](url) — process links first, then bold.
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  const pushWithBold = (chunk: string, kp: string) => {
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let li = 0;
    let bm: RegExpExecArray | null;
    let bi = 0;
    while ((bm = boldRegex.exec(chunk)) !== null) {
      if (bm.index > li) nodes.push(chunk.slice(li, bm.index));
      nodes.push(<strong key={`${kp}-b${bi++}`}>{bm[1]}</strong>);
      li = bm.index + bm[0].length;
    }
    if (li < chunk.length) nodes.push(chunk.slice(li));
  };

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushWithBold(text.slice(lastIndex, match.index), `${keyPrefix}-t${idx}`);
    }
    const href = match[2];
    const isExternal = /^https?:\/\//i.test(href);
    nodes.push(
      <a
        key={`${keyPrefix}-l${idx++}`}
        href={href}
        className="text-[#c41e20] underline hover:text-[#1a2b4c]"
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    pushWithBold(text.slice(lastIndex), `${keyPrefix}-tend`);
  }
  return nodes;
}

export function RichText({ text }: { text: string }): React.ReactElement {
  const clean = (text || "").replace(/\r\n/g, "\n").trim();
  const blocks = clean.split(/\n{2,}/);

  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const isBullet = lines.length > 0 && lines.every((l) => l.startsWith("- "));
        const isNumbered = lines.length > 0 && lines.every((l) => /^\d+\.\s/.test(l));

        if (isBullet) {
          return (
            <ul key={`ul-${bi}`} className="my-3 list-disc space-y-1.5 pl-5">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^-\s+/, ""), `ul${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        if (isNumbered) {
          return (
            <ol key={`ol-${bi}`} className="my-3 list-decimal space-y-1.5 pl-5">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\d+\.\s+/, ""), `ol${bi}-${li}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={`p-${bi}`} className="my-3 leading-relaxed">
            {renderInline(block.replace(/\n/g, " "), `p${bi}`)}
          </p>
        );
      })}
    </>
  );
}
