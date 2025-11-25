'use client';

interface HtmlContentProps {
  html: string;
  className?: string;
}

/**
 * Component to safely render HTML content
 * Note: In production, use a library like DOMPurify to sanitize HTML
 */
export function HtmlContent({ html, className = '' }: HtmlContentProps) {
  // Basic sanitization - remove script tags
  const sanitizedHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '');

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
