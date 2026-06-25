const GOOGLE_FALLBACK = "https://www.google.com/";

function unwrapGoogleRedirect(href: string): string | null {
  try {
    const u = new URL(href, GOOGLE_FALLBACK);
    const isGoogle = u.hostname === "google.com" || u.hostname.endsWith(".google.com") || u.hostname === "google.pl" || u.hostname.endsWith(".google.pl");
    if (u.pathname === "/url" || (isGoogle && u.pathname.includes("/url"))) {
      const q = u.searchParams.get("q") ?? u.searchParams.get("url");
      if (q && /^https?:\/\//i.test(q)) return q;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function resolveHref(href: string, baseUrl?: string): string | null {
  let trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("javascript:") || trimmed.startsWith("#")) return null;
  if (trimmed.startsWith("//")) trimmed = `https:${trimmed}`;
  const fromGoogle = unwrapGoogleRedirect(trimmed);
  if (fromGoogle) return fromGoogle;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!baseUrl) return null;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return null;
  }
}

function normalizeUrl(href: string): string {
  try {
    const u = new URL(href);
    u.hash = "";
    return u.href;
  } catch {
    return href;
  }
}

function isNoiseUrl(href: string): boolean {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "google.com" && u.pathname.startsWith("/search")) return true;
    if (host === "google.pl" && u.pathname.startsWith("/search")) return true;
    return false;
  } catch {
    return true;
  }
}

const PLAIN_URL_RE = /\bhttps?:\/\/[^\s"'<>()]+/gi;

/**
 * Wyciąga adresy http(s) z wklejonego HTML lub zwykłego tekstu.
 * Rozpakowuje typowe przekierowania Google `/url?q=…`.
 * `baseUrl` pomaga zbudować adres z linków względnych (np. z widoku źródła strony).
 */
export function extractHttpUrls(raw: string, options?: { baseUrl?: string; max?: number }): string[] {
  const max = options?.max ?? 200;
  const base = options?.baseUrl?.trim() || undefined;
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (href: string) => {
    const resolved = resolveHref(href, base);
    if (!resolved || !/^https?:\/\//i.test(resolved)) return;
    if (isNoiseUrl(resolved)) return;
    const key = normalizeUrl(resolved);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  try {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    doc.querySelectorAll("a[href]").forEach((a) => {
      const h = a.getAttribute("href");
      if (h) push(h);
    });
  } catch {
    /* ignore */
  }

  const plain = raw.match(PLAIN_URL_RE) ?? [];
  for (let m of plain) {
    m = m.replace(/[).]+$/g, "");
    push(m);
  }

  return out.slice(0, max);
}
