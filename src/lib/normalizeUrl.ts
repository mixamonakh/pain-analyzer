export function normalizeUrl(originalUrl: string): string | null {
  try {
    const url = new URL(originalUrl);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    url.hash = '';

    const keysToRemove = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'fbclid',
      'gclid',
      'yclid',
      'ysclid',
    ];

    keysToRemove.forEach((key) => {
      url.searchParams.delete(key);
    });

    const params = new URLSearchParams(url.search);
    const sortedParams = new URLSearchParams(
      Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    );
    url.search = sortedParams.toString();

    let pathname = url.pathname.replace(/\/+/g, '/');
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    return `${url.origin}${pathname}${url.search ? '?' + url.search : ''}`;
  } catch {
    return null;
  }
}
