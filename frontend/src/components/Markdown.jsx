import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

// Minimal, XSS-safe Markdown renderer for AI tutor replies.
// Supports fenced code, headings, lists, blockquotes, **bold**, *italic*, `code` and links.
// Everything is rendered as React elements; no HTML strings are injected.

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="group relative my-2 overflow-hidden rounded-lg border border-base-300 bg-base-300/60">
      <div className="flex items-center justify-between border-b border-base-300 px-3 py-1 text-xs text-base-content/60">
        <span className="font-mono">{lang || 'code'}</span>
        <button className="btn btn-ghost btn-xs" onClick={copy} aria-label="Copy code">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="scroll-thin overflow-x-auto p-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text, keyPrefix) {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1)
      return (
        <code key={key} className="rounded bg-base-300 px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link && /^https?:\/\//i.test(link[2]))
      return (
        <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer" className="link link-primary">
          {link[1]}
        </a>
      );
    return part;
  });
}

export default function Markdown({ text = '' }) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^\s*```(\w+)?/);
    if (fence) {
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence
      blocks.push(<CodeBlock key={blocks.length} lang={fence[1]} code={body.join('\n')} />);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)/);
    if (heading) {
      const size = ['text-lg', 'text-base', 'text-sm', 'text-sm'][heading[1].length - 1];
      blocks.push(
        <p key={blocks.length} className={`mt-3 mb-1 font-semibold ${size}`}>
          {inline(heading[2], blocks.length)}
        </p>
      );
      i++;
      continue;
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''));
        i++;
      }
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={blocks.length} className={`my-1 ml-5 space-y-0.5 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${blocks.length}-${j}`)}</li>
          ))}
        </Tag>
      );
      continue;
    }

    if (/^\s*>/.test(line)) {
      blocks.push(
        <blockquote key={blocks.length} className="my-1 border-l-2 border-primary/60 pl-3 text-base-content/70">
          {inline(line.replace(/^\s*>\s?/, ''), blocks.length)}
        </blockquote>
      );
      i++;
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph: merge consecutive plain lines.
    const para = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(```|#{1,4}\s|([-*+]|\d+\.)\s+|>)/.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push(
      <p key={blocks.length} className="my-1 leading-relaxed">
        {inline(para.join(' '), blocks.length)}
      </p>
    );
  }

  return <div className="text-sm">{blocks}</div>;
}
