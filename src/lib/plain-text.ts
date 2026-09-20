// Product descriptions are written with light markdown (**bold**, # headings, [links](url)). Search
// engines, Meta and link previews show the raw text, so strip the markup and any HTML before it is
// used in structured data, meta tags or feeds.
export function plainText(source: string | null | undefined, maxLength = 5000): string {
  return (source ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|\*|`)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
