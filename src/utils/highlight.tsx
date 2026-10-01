import React from 'react';

interface HighlightTextProps {
  text: string | number | null | undefined;
  query?: string | null;
  className?: string;
  highlightClassName?: string;
}

export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Компонент подсветки найденных фрагментов текста при поиске
 */
export const HighlightText: React.FC<HighlightTextProps> = React.memo(({
  text,
  query,
  className,
  highlightClassName = 'bg-amber-300 dark:bg-amber-500/40 text-slate-950 dark:text-amber-100 font-semibold px-0.5 rounded-xs ring-1 ring-amber-400/60 dark:ring-amber-400/50 inline align-baseline',
}) => {
  if (text === null || text === undefined) {
    return null;
  }

  const strText = String(text);
  if (!query || !query.trim() || !strText) {
    return className ? <span className={className}>{strText}</span> : <>{strText}</>;
  }

  const terms = Array.from(new Set(query.trim().split(/\s+/).filter(Boolean)));
  if (terms.length === 0) {
    return className ? <span className={className}>{strText}</span> : <>{strText}</>;
  }

  try {
    const pattern = `(${terms.map(escapeRegExp).join('|')})`;
    const regex = new RegExp(pattern, 'gi');
    const parts = strText.split(regex);

    if (parts.length <= 1) {
      return className ? <span className={className}>{strText}</span> : <>{strText}</>;
    }

    const lowerTerms = terms.map((t) => t.toLowerCase());

    const content = parts.map((part, index) => {
      const isMatch = lowerTerms.includes(part.toLowerCase());
      if (isMatch) {
        return (
          <mark key={index} className={highlightClassName}>
            {part}
          </mark>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });

    return className ? <span className={className}>{content}</span> : <>{content}</>;
  } catch {
    return className ? <span className={className}>{strText}</span> : <>{strText}</>;
  }
});

export const highlight = (
  text: string | number | null | undefined,
  query?: string | null,
  highlightClassName?: string
): React.ReactNode => {
  if (text === null || text === undefined) return null;
  return <HighlightText text={text} query={query} highlightClassName={highlightClassName} />;
};
