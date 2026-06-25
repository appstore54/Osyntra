import type { Node, Edge } from "@xyflow/react";

export type NoteData = {
  kind: "note";
  title: string;
  body: string;
};

export type PhotoData = {
  kind: "photo";
  title: string;
  src: string;
};

export type DorkData = {
  kind: "dork";
  title: string;
  query: string;
};

export type LinkData = {
  kind: "link";
  url: string;
  title: string;
};

export type AppNodeData = NoteData | PhotoData | DorkData | LinkData;

export type AppNode = Node<AppNodeData>;

export type AppEdge = Edge;

/** Węzeł link na mapie — URL + krótki tytuł (np. etykieta serwisu). */
export type LinkMapItem = { url: string; title: string };

export type DorkPreset = { label: string; snippet: string; hint?: string };

export type DorkCategory = { title: string; hint?: string; items: DorkPreset[] };

/** Szablony wstawiane na końcu pola zapytania — dopasuj fragmenty (np. zamień przykładowe cyfry). */
export const DORK_CATEGORIES: DorkCategory[] = [
  {
    title: "Ogólne",
    items: [
      { label: "site:", snippet: "site:example.com " },
      { label: "filetype:PDF", snippet: "filetype:pdf " },
      { label: "intitle:", snippet: "intitle:\"\" " },
      { label: "inurl:", snippet: "inurl:admin " },
      { label: "intext:", snippet: "intext:\"\" " },
      { label: "cache:", snippet: "cache: " },
      { label: "related:", snippet: "related: " },
      { label: "images", snippet: "site:instagram.com OR site:flickr.com " },
    ],
  },
  {
    title: "Telefon",
    hint: "Użyj sekcji „Szybkie dane” powyżej: kierunkowy + 9 cyfr — program złoży formaty.",
    items: [
      { label: "PDF/XLS", snippet: "(filetype:pdf OR filetype:xls OR filetype:xlsx) " },
      { label: "site: FB", snippet: "site:facebook.com " },
      { label: "site: LinkedIn", snippet: "site:linkedin.com " },
    ],
  },
  {
    title: "E-mail",
    hint: "Wpisz pełny adres w „Szybkie dane” — program złoży warianty intext.",
    items: [
      { label: "PDF/DOC + @", snippet: "(filetype:pdf OR filetype:doc OR filetype:docx) " },
      { label: "kontakt w URL", snippet: "inurl:kontakt OR inurl:contact OR inurl:email " },
    ],
  },
  {
    title: "CEIDG / biznes.gov.pl",
    hint: "NIP i REGON: wpisz cyfry w „Szybkie dane”, potem „+ biznes.gov” albo presety poniżej.",
    items: [
      { label: "site: biznes.gov", snippet: "site:biznes.gov.pl " },
      { label: "ścieżka /firma/", snippet: "site:biznes.gov.pl inurl:/pl/firma/ " },
      { label: "PDF NIP/REGON", snippet: "(filetype:pdf OR filetype:xls) " },
    ],
  },
];

/** Spłaszczone — dla kompatybilności; preferuj DORK_CATEGORIES w UI. */
export const DORK_PRESETS: DorkPreset[] = DORK_CATEGORIES.flatMap((c) => c.items);

export function buildGoogleUrl(query: string): string {
  const q = query.trim();
  if (!q) return "https://www.google.com/";
  return `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=pl`;
}
