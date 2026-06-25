import { useCallback, useMemo, useState } from "react";
import {
  buildEmailDorkQuery,
  buildNipDorkQuery,
  buildPhoneDorkQuery,
  buildPhraseDorkQuery,
  buildRegonDorkQuery,
} from "./dorkBuilders";
import { DORK_CATEGORIES, buildGoogleUrl } from "./types";

type Props = {
  onAddDorkNode: (title: string, query: string) => void;
};

export function DorkPanel({ onAddDorkNode }: Props) {
  const [base, setBase] = useState("");

  const [phonePrefix, setPhonePrefix] = useState("48");
  const [phoneNine, setPhoneNine] = useState("");
  const [email, setEmail] = useState("");
  const [nip, setNip] = useState("");
  const [regon, setRegon] = useState("");
  const [phrase, setPhrase] = useState("");

  const composed = useMemo(() => base.trim(), [base]);

  const appendToBase = useCallback((fragment: string) => {
    const f = fragment.trim();
    if (!f) return;
    setBase((b) => {
      const t = b.trimEnd();
      return t ? `${t} ${f}` : f;
    });
  }, []);

  const appendPreset = useCallback(
    (snippet: string) => {
      appendToBase(snippet);
    },
    [appendToBase],
  );

  const phoneOk = phoneNine.replace(/\D/g, "").length === 9 && phonePrefix.replace(/\D/g, "").length > 0;
  const nipOk = nip.replace(/\D/g, "").length === 10;
  const regonDigits = regon.replace(/\D/g, "");
  const regonOk = regonDigits.length === 9 || regonDigits.length === 14;
  const emailTrim = email.trim();
  const emailParts = emailTrim.split("@");
  const emailOk =
    emailParts.length === 2 &&
    emailParts[0]!.length > 0 &&
    emailParts[1]!.length > 0 &&
    emailParts[1]!.includes(".");

  return (
    <>
      <div className="panel-header">Konstruktor zapytania</div>
      <div className="panel-body">
        <div className="hint" style={{ fontWeight: 600, color: "#d4d4d4", marginBottom: 8 }}>
          Szybkie dane
        </div>

        <fieldset className="dork-fieldset">
          <legend>Telefon</legend>
          <div className="dork-quick-row">
            <label className="field" style={{ flex: "0 0 5.5rem" }}>
              Kierunkowy
              <input
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={phonePrefix}
                onChange={(e) => setPhonePrefix(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="48"
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              9 cyfr numeru
              <input
                inputMode="numeric"
                autoComplete="off"
                maxLength={9}
                value={phoneNine}
                onChange={(e) => setPhoneNine(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="np. 601234567"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={!phoneOk}
            onClick={() => {
              const q = buildPhoneDorkQuery(phonePrefix, phoneNine);
              if (q) appendToBase(q);
            }}
          >
            Wstaw zapytanie o numer
          </button>
        </fieldset>

        <fieldset className="dork-fieldset">
          <legend>E-mail</legend>
          <label className="field">
            Pełny adres
            <input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan.kowalski@example.com" />
          </label>
          <button
            type="button"
            disabled={!emailOk}
            onClick={() => {
              const q = buildEmailDorkQuery(email);
              if (q) appendToBase(q);
            }}
          >
            Wstaw zapytanie o e-mail
          </button>
        </fieldset>

        <fieldset className="dork-fieldset">
          <legend>Inna fraza</legend>
          <label className="field">
            Tekst (imię i nazwisko, nick, fragment dokumentu…)
            <input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder='np. "Firma ABC" Sp. z o.o.' />
          </label>
          <button
            type="button"
            disabled={!phrase.trim()}
            onClick={() => {
              const q = buildPhraseDorkQuery(phrase);
              if (q) appendToBase(q);
            }}
          >
            Wstaw warianty frazy
          </button>
        </fieldset>

        <fieldset className="dork-fieldset">
          <legend>NIP / REGON (CEIDG)</legend>
          <div className="dork-quick-row">
            <label className="field" style={{ flex: 1 }}>
              NIP (10 cyfr)
              <input
                inputMode="numeric"
                autoComplete="off"
                value={nip}
                onChange={(e) => setNip(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="1234567890"
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              REGON (9 lub 14)
              <input
                inputMode="numeric"
                autoComplete="off"
                value={regon}
                onChange={(e) => setRegon(e.target.value.replace(/\D/g, "").slice(0, 14))}
                placeholder="123456789"
              />
            </label>
          </div>
          <div className="dork-quick-actions">
            <button
              type="button"
              disabled={!nipOk}
              onClick={() => {
                const q = buildNipDorkQuery(nip);
                if (q) appendToBase(q);
              }}
            >
              Wstaw NIP (formaty)
            </button>
            <button
              type="button"
              disabled={!nipOk}
              onClick={() => {
                const q = buildNipDorkQuery(nip);
                if (q) appendToBase(`site:biznes.gov.pl ${q}`);
              }}
            >
              NIP + biznes.gov
            </button>
            <button
              type="button"
              disabled={!regonOk}
              onClick={() => {
                const q = buildRegonDorkQuery(regon);
                if (q) appendToBase(q);
              }}
            >
              Wstaw REGON (formaty)
            </button>
            <button
              type="button"
              disabled={!regonOk}
              onClick={() => {
                const q = buildRegonDorkQuery(regon);
                if (q) appendToBase(`site:biznes.gov.pl ${q}`);
              }}
            >
              REGON + biznes.gov
            </button>
          </div>
        </fieldset>

        <label className="field">
          Zapytanie (możesz edytować ręcznie)
          <textarea
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="Tu trafia złożone zapytanie — dopisz słowa kluczowe lub użyj presetów poniżej."
          />
        </label>

        {DORK_CATEGORIES.map((cat) => (
          <div key={cat.title}>
            <div className="hint" style={{ marginBottom: 6, fontWeight: 600, color: "#d4d4d4" }}>
              {cat.title}
            </div>
            {cat.hint ? <p className="hint" style={{ marginTop: 0, marginBottom: 8 }}>{cat.hint}</p> : null}
            <div className="chips" style={{ marginBottom: 10 }}>
              {cat.items.map((p) => (
                <button
                  key={`${cat.title}-${p.label}`}
                  type="button"
                  className="chip"
                  onClick={() => appendPreset(p.snippet)}
                  title={p.hint ?? p.snippet}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div>
          <div className="hint" style={{ marginBottom: 6 }}>
            Podgląd pełnego zapytania
          </div>
          <div className="query-preview">{composed || "—"}</div>
        </div>
        <div className="row">
          <button
            type="button"
            onClick={() => {
              if (!composed) return;
              void navigator.clipboard.writeText(composed);
            }}
            disabled={!composed}
          >
            Kopiuj zapytanie
          </button>
          <button
            type="button"
            onClick={() => {
              if (!composed) return;
              window.open(buildGoogleUrl(composed), "_blank", "noopener,noreferrer");
            }}
            disabled={!composed}
          >
            Otwórz Google
          </button>
        </div>
        <div className="divider" />
        <button
          type="button"
          onClick={() => {
            if (!composed) return;
            onAddDorkNode("Zapytanie", composed);
          }}
          disabled={!composed}
        >
          Dodaj węzeł „dork” na mapę
        </button>
      </div>
    </>
  );
}
