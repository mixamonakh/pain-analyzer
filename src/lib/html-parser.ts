import { load } from 'cheerio';

export function parseHTML(
  html: string,
  opts?: { stripScripts?: boolean; stripStyles?: boolean }
): string {
  const stripScripts = opts?.stripScripts !== false;
  const stripStyles = opts?.stripStyles !== false;

  const $ = load(html ?? '');

  if (stripScripts) $('script').remove();
  if (stripStyles) $('style').remove();

  // Prefer body text, but fall back to whole document if body is absent.
  const text = $('body').length > 0 ? $('body').text() : $.root().text();
  return text.replace(/\s+/g, ' ').trim();
}

