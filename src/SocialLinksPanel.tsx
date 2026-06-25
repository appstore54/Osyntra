import { useCallback, useMemo, useState } from "react";
import { buildSocialPlatformLinks, sanitizeHandle } from "./socialUrls";
import type { LinkMapItem } from "./types";

type Props = {
  onAddLinksToMap: (items: LinkMapItem[]) => void;
};

export function SocialLinksPanel({ onAddLinksToMap }: Props) {
  const [handle, setHandle] = useState("");
  const [rows, setRows] = useState<{ title: string; url: string }[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const valid = useMemo(() => Boolean(sanitizeHandle(handle)), [handle]);

  const generate = useCallback(() => {
    const list = buildSocialPlatformLinks(handle);
    setRows(list);
    setPicked(Object.fromEntries(list.map((r) => [r.url, true])));
  }, [handle]);

  const selected = useMemo(() => rows.filter((r) => picked[r.url]), [picked, rows]);

  const toggle = useCallback((url: string) => {
    setPicked((p) => ({ ...p, [url]: !p[url] }));
  }, []);

  const selectAll = useCallback(() => {
    setPicked(Object.fromEntries(rows.map((r) => [r.url, true])));
  }, [rows]);

  const selectNone = useCallback(() => {
    setPicked(Object.fromEntries(rows.map((r) => [r.url, false])));
  }, [rows]);

  return (
    <>
      <div className="panel-header">Social / GitHub / Reddit / inne</div>
      <div className="panel-body">
        <p className="hint" style={{ marginTop: 0 }}>
          Wpisz nick (jak w URL, bez spacji). Narzędzie <strong>nie pobiera treści</strong> z API — generuje listę linków do profili i wyszukiwarek; Ty
          otwierasz je w przeglądarce lub dodajesz jako węzły na mapie. Używaj legalnie i zgodnie z regulaminami serwisów.
        </p>
        <label className="field">
          Nick / handle
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="np. octocat lub jan.kowalski"
            autoComplete="off"
          />
        </label>
        <div className="row">
          <button type="button" onClick={generate} disabled={!valid}>
            Generuj linki
          </button>
          <button type="button" onClick={selectAll} disabled={!rows.length}>
            Zaznacz wszystkie
          </button>
          <button type="button" onClick={selectNone} disabled={!rows.length}>
            Odznacz
          </button>
        </div>
        {!valid && handle.trim() ? <p className="hint">Dozwolone: litery, cyfry, . _ - (max 64 znaki), opcjonalnie @ na początku.</p> : null}
        {rows.length > 0 && (
          <>
            <div className="hint">Propozycji: {rows.length}</div>
            <ul className="link-harvest-list">
              {rows.map((r) => (
                <li key={r.url}>
                  <label className="link-harvest-row">
                    <input type="checkbox" checked={picked[r.url] ?? false} onChange={() => toggle(r.url)} />
                    <span className="link-harvest-url" title={r.url}>
                      <strong style={{ color: "#ccc", display: "block", marginBottom: 2 }}>{r.title}</strong>
                      {r.url}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                if (!selected.length) return;
                onAddLinksToMap(selected.map((r) => ({ url: r.url, title: r.title })));
              }}
              disabled={!selected.length}
            >
              Dodaj zaznaczone na mapę ({selected.length})
            </button>
          </>
        )}
      </div>
    </>
  );
}
