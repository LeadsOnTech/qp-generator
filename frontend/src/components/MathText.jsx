import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Automatically formats chemical formulas like H2SO4, CaCO3, KMnO4 into HTML with <sub> tags.
 */
function formatChemicals(text) {
  if (!text) return '';
  return text.replace(/\b([A-Z][a-z]?\d+)+\b/g, (match) => {
    return match.replace(/([A-Z][a-z]?)(\d+)/g, '$1<sub>$2</sub>');
  });
}

/**
 * Component that parses LaTeX math ($...$ or $$...$$) and renders sharp KaTeX typography,
 * falling back gracefully to clean text if any syntax is invalid.
 */
export default function MathText({ text, style = {}, className = '' }) {
  if (text == null) return null;
  const str = String(text);

  // If text contains no math delimiter, render chemical-formatted text directly
  if (!str.includes('$')) {
    const chemHtml = formatChemicals(str);
    return (
      <span
        style={style}
        className={className}
        dangerouslySetInnerHTML={{ __html: chemHtml }}
      />
    );
  }

  // Split by inline $...$ or display $$...$$
  const parts = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: str.substring(lastIndex, match.index),
      });
    }

    const rawToken = match[0];
    const isDisplay = rawToken.startsWith('$$') && rawToken.endsWith('$$');
    const mathContent = isDisplay ? rawToken.slice(2, -2) : rawToken.slice(1, -1);

    try {
      const renderedHtml = katex.renderToString(mathContent, {
        displayMode: isDisplay,
        throwOnError: false,
      });
      parts.push({
        type: 'math',
        html: renderedHtml,
      });
    } catch {
      parts.push({
        type: 'text',
        value: mathContent,
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push({
      type: 'text',
      value: str.substring(lastIndex),
    });
  }

  return (
    <span style={style} className={className}>
      {parts.map((p, idx) => {
        if (p.type === 'math') {
          return (
            <span
              key={idx}
              dangerouslySetInnerHTML={{ __html: p.html }}
              style={{ margin: '0 2px' }}
            />
          );
        }
        return (
          <span
            key={idx}
            dangerouslySetInnerHTML={{ __html: formatChemicals(p.value) }}
          />
        );
      })}
    </span>
  );
}
