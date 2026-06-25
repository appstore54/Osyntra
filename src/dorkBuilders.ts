/**
 * Buduje zapytania pod zwykłe wyszukiwanie Google (jak wpisanie frazy w pole),
 * z wariantami w cudzysłowach i OR — bez agresywnego intext:, który często
 * obcina wyniki do zera albo źle współgra z innymi operatorami.
 */
function quote(s: string): string {
  return `"${String(s).replace(/\\/g, "").replace(/"/g, "").trim()}"`;
}

function orQuoted(parts: string[]): string {
  return [...new Set(parts.map((p) => p.trim()).filter(Boolean))]
    .map(quote)
    .join(" OR ");
}

/**
 * Kierunkowy (np. 48) + dokładnie 9 cyfr numeru krajowego (np. 601234567).
 */
export function buildPhoneDorkQuery(prefixRaw: string, nineDigitsRaw: string): string | null {
  let prefix = prefixRaw.replace(/\D/g, "");
  if (prefix.startsWith("00")) prefix = prefix.slice(2);
  const nine = nineDigitsRaw.replace(/\D/g, "");
  if (!prefix || nine.length !== 9) return null;

  const a = nine.slice(0, 3);
  const b = nine.slice(3, 6);
  const c = nine.slice(6, 9);
  const spaced = `${a} ${b} ${c}`;
  const dashed = `${a}-${b}-${c}`;
  const intlPlus = `+${prefix}${nine}`;
  const intlPlain = `${prefix}${nine}`;
  const intl00 = `00${prefix}${nine}`;
  const intlPlusSpaced = `+${prefix} ${spaced}`;
  const intlPlainSpaced = `${prefix} ${spaced}`;

  return orQuoted([nine, spaced, dashed, intlPlus, intlPlain, intl00, intlPlusSpaced, intlPlainSpaced]);
}

/** Pełny adres e-mail — warianty jako frazy (bez wymuszania AND na słowach). */
export function buildEmailDorkQuery(raw: string): string | null {
  const email = raw.trim();
  if (!email.includes("@")) return null;
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at).trim();
  const domain = email.slice(at + 1).trim();
  if (!local || !domain) return null;

  const full = `${local}@${domain}`;
  const parts = [full, `@${domain}`, `mailto:${full}`];
  const lower = full.toLowerCase();
  if (lower !== full) parts.push(lower);

  return orQuoted(parts);
}

/** Fraza dowolna — pełna treść + ewentualnie pojedyncze słowa (szersze trafienia). */
export function buildPhraseDorkQuery(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  const collapsed = t.replace(/\s+/g, " ").trim();
  const variants: string[] = [t];
  if (collapsed !== t) variants.push(collapsed);

  const tokens = collapsed.split(" ").filter((x) => x.length >= 2);
  if (tokens.length > 1) {
    let n = 0;
    for (const tok of tokens) {
      if (n++ >= 8) break;
      if (!variants.includes(tok)) variants.push(tok);
    }
  }

  return orQuoted(variants);
}

/** NIP — 10 cyfr + typowe formaty zapisu. */
export function buildNipDorkQuery(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 10) return null;
  const dash = `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
  const space = `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
  return orQuoted([d, dash, space]);
}

/** REGON — 9 lub 14 cyfr + proste formaty. */
export function buildRegonDorkQuery(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 9 && d.length !== 14) return null;
  const variants: string[] = [d];
  if (d.length === 9) {
    variants.push(`${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 9)}`);
    variants.push(`${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`);
  } else {
    variants.push(`${d.slice(0, 9)} ${d.slice(9, 14)}`);
    variants.push(`${d.slice(0, 9)}-${d.slice(9, 14)}`);
  }
  return orQuoted(variants);
}
