import { useCallback, useMemo, useState } from "react";
import { extractHttpUrls } from "./extractLinks";
import type { LinkMapItem } from "./types";

type Props = {
  onAddLinksToMap: (items: LinkMapItem[]) => void;
};

function titleFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

export function LinkHarvestPanel({ onAddLinksToMap }: Props) {
  const [raw, setRaw] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [found, setFound] = useState<string[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const runExtract = useCallback(() => {
    const urls = extractHttpUrls(raw, { baseUrl: baseUrl || undefined });
    setFound(urls);
    const next: Record<string, boolean> = {};
    for (const u of urls) next[u] = true;
    setPicked(next);
  }, [baseUrl, raw]);

  const selectedUrls = useMemo(() => found.filter((u) => picked[u]), [found, picked]);

  const toggle = useCallback((u: string) => {
    setPicked((p) => ({ ...p, [u]: !p[u] }));
  }, []);

  const selectAll = useCallback(() => {
    setPicked(Object.fromEntries(found.map((u) => [u, true])));
  }, [found]);

  const selectNone = useCallback(() => {
    setPicked(Object.fromEntries(found.map((u) => [u, false])));
  }, [found]);

  return (
    <>
      <div className="panel-header">Zbieranie linków z treści</div>
      <div className="panel-body">
        <p className="hint" style={{ marginTop: 0 }}>
          Wklej HTML lub tekst skopiowany ze strony (np. zaznaczenie wyników w przeglądarce → kopiuj). Aplikacja nie pobiera stron z sieci — tylko
          analizuje to, co wkleisz.
        </p>
        <label className="field">
          Opcjonalnie: bazowy URL strony
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://example.com/artykul/"
          />
        </label>
        <label className="field">
          Wklejona treść
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="HTML lub tekst z adresami URL…" style={{ minHeight: 120 }} />
        </label>
        <div className="row">
          <button type="button" onClick={runExtract}>
            Wydobądź linki
          </button>
          <button type="button" onClick={selectAll} disabled={!found.length}>
            Zaznacz wszystkie
          </button>
          <button type="button" onClick={selectNone} disabled={!found.length}>
            Odznacz
          </button>
        </div>
        {found.length > 0 && (
          <>
            <div className="hint">Znaleziono: {found.length}</div>
            <ul className="link-harvest-list">
              {found.map((u) => (
                <li key={u}>
                  <label className="link-harvest-row">
                    <input type="checkbox" checked={picked[u] ?? false} onChange={() => toggle(u)} />
                    <span className="link-harvest-url" title={u}>
                      {u}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                if (!selectedUrls.length) return;
                onAddLinksToMap(selectedUrls.map((url) => ({ url, title: titleFromUrl(url) })));
              }}
              disabled={!selectedUrls.length}
            >
              Dodaj zaznaczone na mapę ({selectedUrls.length})
            </button>
          </>
        )}
      </div>
    </>
  );
}
