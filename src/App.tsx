import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Viewport,
} from "@xyflow/react";
import { DorkPanel } from "./DorkPanel";
import { LinkHarvestPanel } from "./LinkHarvestPanel";
import { SocialLinksPanel } from "./SocialLinksPanel";
import { DorkNode } from "./nodes/DorkNode";
import { LinkNode } from "./nodes/LinkNode";
import { NoteNode } from "./nodes/NoteNode";
import { PhotoNode } from "./nodes/PhotoNode";
import {
  createInvestigation,
  decryptGraph,
  deleteInvestigation,
  encryptGraph,
  getInvestigations,
  loadInvestigationData,
  renameInvestigation,
  saveInvestigationData,
  type Investigation,
  type StoredGraph,
} from "./storage";
import { login, logout, register, getSessionUser } from "./auth";
import { FileAnalyzer } from "./FileAnalyzer";

import type { AppEdge, AppNode, AppNodeData, LinkMapItem, PhotoData } from "./types";

const nodeTypes = {
  note: NoteNode,
  photo: PhotoNode,
  dork: DorkNode,
  link: LinkNode,
};

type FlowApi = {
  addDorkFromPanel: (title: string, query: string) => void;
  addLinkNodes: (items: LinkMapItem[]) => void;
};

function FlowApiBinder(props: {
  apiRef: MutableRefObject<FlowApi | null>;
  setNodes: ReturnType<typeof useNodesState<AppNode>>[1];
  onSelect: (id: string | null) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const { apiRef, setNodes, onSelect } = props;

  useLayoutEffect(() => {
    apiRef.current = {
      addDorkFromPanel: (title, query) => {
        const id = crypto.randomUUID();
        const pos = screenToFlowPosition({
          x: window.innerWidth * 0.52,
          y: window.innerHeight * 0.42,
        });
        setNodes((nds) =>
          nds.concat({
            id,
            type: "dork",
            position: pos,
            data: { kind: "dork", title, query },
          }),
        );
        onSelect(id);
      },
      addLinkNodes: (items) => {
        if (!items.length) return;
        const base = screenToFlowPosition({
          x: window.innerWidth * 0.5,
          y: window.innerHeight * 0.36,
        });
        const additions: AppNode[] = items.map((entry, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          let fallback = "link";
          try {
            fallback = new URL(entry.url).hostname.replace(/^www\./, "");
          } catch {
            /* ignore */
          }
          const title = entry.title?.trim() || fallback;
          return {
            id: crypto.randomUUID(),
            type: "link" as const,
            position: { x: base.x + col * 220, y: base.y + row * 100 },
            data: { kind: "link" as const, url: entry.url, title },
          };
        });
        setNodes((nds) => nds.concat(additions));
        onSelect(additions[additions.length - 1]!.id);
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, onSelect, screenToFlowPosition, setNodes]);

  return null;
}

function TopTools(props: {
  investigationId: string;
  nodes: AppNode[];
  edges: AppEdge[];
  setNodes: ReturnType<typeof useNodesState<AppNode>>[1];
  setEdges: ReturnType<typeof useEdgesState<AppEdge>>[1];
  onSelect: (id: string | null) => void;
}) {
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();

  const place = useCallback(() => {
    return screenToFlowPosition({
      x: window.innerWidth * 0.52,
      y: window.innerHeight * 0.42,
    });
  }, [screenToFlowPosition]);

  const snapshot = useCallback((): StoredGraph => {
    const vp = getViewport();
    return {
      nodes: JSON.parse(JSON.stringify(props.nodes)) as unknown[],
      edges: JSON.parse(JSON.stringify(props.edges)) as unknown[],
      viewport: { x: vp.x, y: vp.y, zoom: vp.zoom },
    };
  }, [getViewport, props.edges, props.nodes]);

  const addNote = useCallback(() => {
    const id = crypto.randomUUID();
    props.setNodes((nds) =>
      nds.concat({
        id,
        type: "note",
        position: place(),
        data: { kind: "note", title: "Notatka", body: "" },
      }),
    );
    props.onSelect(id);
  }, [place, props]);

  const addPhoto = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const id = crypto.randomUUID();
      props.setNodes((nds) =>
        nds.concat({
          id,
          type: "photo",
          position: place(),
          data: { kind: "photo", title: file.name, src },
        }),
      );
      props.onSelect(id);
    };
    reader.readAsDataURL(file);
  }, [place, props]);

  const addDork = useCallback(() => {
    const id = crypto.randomUUID();
    props.setNodes((nds) =>
      nds.concat({
        id,
        type: "dork",
        position: place(),
        data: { kind: "dork", title: "Dork", query: "" },
      }),
    );
    props.onSelect(id);
  }, [place, props]);

  const addLink = useCallback(() => {
    const url = window.prompt("Wpisz adres URL:", "https://");
    if (!url) return;
    
    const id = crypto.randomUUID();
    let title = "Link";
    try {
      title = new URL(url).hostname.replace(/^www\./, "");
    } catch { /* ignore */ }

    props.setNodes((nds) =>
      nds.concat({
        id,
        type: "link",
        position: place(),
        data: { kind: "link", title, url },
      }),
    );
    props.onSelect(id);
  }, [place, props]);

  const onSavePlain = useCallback(() => {
    saveInvestigationData(props.investigationId, JSON.stringify(snapshot()), false);
    window.alert("Zapisano zmiany w śledztwie.");
  }, [props.investigationId, snapshot]);

  const onSaveEncrypted = useCallback(async () => {
    const pass = window.prompt("Hasło do zaszyfrowania zapisu (min. 8 znaków):");
    if (!pass || pass.length < 8) return;
    const again = window.prompt("Powtórz hasło:");
    if (pass !== again) {
      window.alert("Hasła się nie zgadzają.");
      return;
    }
    const blob = await encryptGraph(pass, snapshot());
    saveInvestigationData(props.investigationId, blob, true);
    window.alert("Zapisano zaszyfrowane śledztwo.");
  }, [props.investigationId, snapshot]);

  const onExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mind-dork-${props.investigationId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [props.investigationId, snapshot]);

  const onImport = useCallback(
    async (file: File) => {
      const text = await file.text();
      const data = JSON.parse(text) as StoredGraph;
      props.setNodes((data.nodes ?? []) as AppNode[]);
      props.setEdges((data.edges ?? []) as AppEdge[]);
      if (data.viewport) void setViewport(data.viewport as Viewport);
    },
    [props, setViewport],
  );

  const onClearVault = useCallback(() => {
    if (!window.confirm("Czy na pewno chcesz wyczyścić tę mapę? Zmiany nie zostaną automatycznie zapisane.")) return;
    props.setNodes([]);
    props.setEdges([]);
    props.onSelect(null);
  }, [props]);

  return (
    <Panel position="top-left" className="toolbar">
      <button type="button" onClick={addNote}>
        + Notatka
      </button>
      <label className="tool-button">
        + Zdjęcie
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) addPhoto(f);
            e.target.value = "";
          }}
        />
      </label>
      <button type="button" onClick={addDork}>
        + Dork
      </button>
      <button type="button" onClick={addLink}>
        + Link
      </button>
      <button type="button" onClick={onSavePlain}>
        Zapisz
      </button>
      <button type="button" onClick={() => void onSaveEncrypted()}>
        Zaszyfruj AES
      </button>
      <button type="button" onClick={onExport}>
        Eksport JSON
      </button>
      <label className="tool-button" style={{ fontSize: "0.72rem" }}>
        Import
        <input
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = "";
          }}
        />
      </label>
      <button type="button" onClick={onClearVault}>
        Wyczyść mapę
      </button>
    </Panel>
  );
}

function FlowCanvas(props: {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: ReturnType<typeof useNodesState<AppNode>>[2];
  onEdgesChange: ReturnType<typeof useEdgesState<AppEdge>>[2];
  onConnect: (c: Connection) => void;
  onSelectionChange: (id: string | null) => void;
  setNodes: ReturnType<typeof useNodesState<AppNode>>[1];
  setEdges: ReturnType<typeof useEdgesState<AppEdge>>[1];
  apiRef: MutableRefObject<FlowApi | null>;
  initialViewport?: { x: number; y: number; zoom: number };
}) {
  return (
    <ReactFlow
      nodes={props.nodes}
      edges={props.edges}
      onNodesChange={props.onNodesChange}
      onEdgesChange={props.onEdgesChange}
      onConnect={props.onConnect}
      nodeTypes={nodeTypes}
      defaultViewport={props.initialViewport ?? { x: 0, y: 0, zoom: 1 }}
      minZoom={0.15}
      maxZoom={1.8}
      onSelectionChange={({ nodes: sel }) => {
        props.onSelectionChange(sel[0]?.id ?? null);
      }}
      deleteKeyCode={["Backspace", "Delete"]}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#333" gap={18} size={1} variant={BackgroundVariant.Dots} />
      <MiniMap
        pannable
        zoomable
        nodeStrokeWidth={3}
        maskColor="rgba(10,10,10,0.85)"
        style={{ background: "#0a0a0a" }}
      />
      <Controls />
    </ReactFlow>
  );
}

function MindDork(props: { 
  investigationId: string;
  boot: StoredGraph; 
  onBack: () => void; 
  onLogout: () => void;
  onAnalyzePhoto?: (file: File) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const apiRef = useRef<FlowApi | null>(null);

  useEffect(() => {
    setNodes((props.boot.nodes ?? []) as AppNode[]);
    setEdges((props.boot.edges ?? []) as AppEdge[]);
  }, [props.boot, setEdges, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);

  const updateSelectedData = useCallback(
    (patch: Partial<AppNodeData>) => {
      if (!selectedId) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== selectedId) return n;
          return { ...n, data: { ...n.data, ...patch } as AppNodeData };
        }),
      );
    },
    [selectedId, setNodes],
  );

  return (
    <div className="app-shell">
      <div className="user-bar">
        <button type="button" onClick={props.onBack} style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
          ← Wróć do listy śledztw
        </button>
        <button type="button" onClick={props.onLogout} style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
          Wyloguj
        </button>
      </div>
      <aside className="panel">
        <DorkPanel
          onAddDorkNode={(title, query) => {
            apiRef.current?.addDorkFromPanel(title, query);
          }}
        />
        <div className="divider" />
        <LinkHarvestPanel
          onAddLinksToMap={(items) => {
            apiRef.current?.addLinkNodes(items);
          }}
        />
        <div className="divider" />
        <SocialLinksPanel
          onAddLinksToMap={(items) => {
            apiRef.current?.addLinkNodes(items);
          }}
        />
        <div className="divider" />
        <div className="panel-header">Wybrany węzeł</div>
        <div className="panel-body">
          {!selected && <p className="hint">Kliknij węzeł na mapie, aby edytować tytuł, treść lub zdjęcie.</p>}
          {selected?.type === "note" && selected.data.kind === "note" && (
            <>
              <label className="field">
                Tytuł
                <input
                  autoFocus
                  value={selected.data.title}
                  onChange={(e) => updateSelectedData({ title: e.target.value })}
                />
              </label>
              <label className="field">
                Treść
                <textarea
                  value={selected.data.body}
                  onChange={(e) => updateSelectedData({ body: e.target.value })}
                />
              </label>
            </>
          )}
          {selected?.type === "photo" && selected.data.kind === "photo" && (
          <>
            <label className="field">
              Tytuł
              <input
                autoFocus
                value={selected.data.title}
                onChange={(e) => updateSelectedData({ title: e.target.value })}
              />
            </label>
            <label className="field">
              Plik graficzny
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const src = typeof reader.result === "string" ? reader.result : "";
                    updateSelectedData({ src });
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {(selected.data as PhotoData).src ? (
              <>
                <img
                  src={(selected.data as PhotoData).src}
                  alt=""
                  style={{ width: "100%", filter: "grayscale(1)", border: "1px solid #2a2a2a", borderRadius: 4 }}
                />
                <button
                  type="button"
                  style={{ marginTop: "1rem", width: "100%", fontSize: "0.75rem" }}
                  onClick={() => {
                    if (!(selected.data as PhotoData).src) return;
                    // Convert base64 to File object
                    fetch((selected.data as PhotoData).src)
                      .then(res => res.blob())
                      .then(blob => {
                        // Infer MIME type from file extension
                        const ext = (selected.data as PhotoData).title.toLowerCase().split('.').pop() || '';
                        let mimeType = blob.type;
                        if (!mimeType) {
                          const mimeMap: Record<string, string> = {
                            'jpg': 'image/jpeg',
                            'jpeg': 'image/jpeg',
                            'png': 'image/png',
                            'gif': 'image/gif',
                            'bmp': 'image/bmp',
                            'webp': 'image/webp',
                            'tiff': 'image/tiff',
                            'tif': 'image/tiff'
                          };
                          mimeType = mimeMap[ext] || 'application/octet-stream';
                        }
                        const file = new File([blob], (selected.data as PhotoData).title || 'image.png', { type: mimeType });
                        props.onAnalyzePhoto?.(file);
                      });
                  }}
                >
                  🔍 Analizuj metadane (EXIF)
                </button>
              </>
            ) : null}
          </>
        )}
          {selected?.type === "dork" && selected.data.kind === "dork" && (
            <>
              <label className="field">
                Etykieta
                <input
                  autoFocus
                  value={selected.data.title}
                  onChange={(e) => updateSelectedData({ title: e.target.value })}
                />
              </label>
              <label className="field">
                Zapytanie
                <textarea
                  value={selected.data.query}
                  onChange={(e) => updateSelectedData({ query: e.target.value })}
                />
              </label>
            </>
          )}
          {selected?.type === "link" && selected.data.kind === "link" && (
            <>
              <label className="field">
                Etykieta (np. domena)
                <input
                  autoFocus
                  value={selected.data.title}
                  onChange={(e) => updateSelectedData({ title: e.target.value })}
                />
              </label>
              <label className="field">
                Adres URL
                <textarea
                  value={selected.data.url}
                  onChange={(e) => updateSelectedData({ url: e.target.value })}
                  style={{ minHeight: 72 }}
                />
              </label>
            </>
          )}
        </div>
      </aside>
      <div className="canvas-wrap">
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={setSelectedId}
          setNodes={setNodes}
          setEdges={setEdges}
          apiRef={apiRef}
          initialViewport={props.boot.viewport}
        />
        <FlowApiBinder apiRef={apiRef} setNodes={setNodes} onSelect={setSelectedId} />
        <TopTools
          investigationId={props.investigationId}
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          setEdges={setEdges}
          onSelect={setSelectedId}
        />
      </div>
    </div>
  );
}

function MindDorkManager(props: { onBack: () => void; onLogout: () => void; onAnalyzePhoto: (file: File) => void }) {
  const [list, setList] = useState<Investigation[]>([]);
  const [activeInv, setActiveInv] = useState<Investigation | null>(null);
  const [boot, setBoot] = useState<StoredGraph | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setList(getInvestigations());
  }, []);

  const refreshList = () => setList(getInvestigations());

  const handleCreate = () => {
    const name = window.prompt("Nazwa śledztwa:", "Nowe śledztwo");
    if (name === null) return;
    createInvestigation(name);
    refreshList();
  };

  const handleRename = (id: string) => {
    const name = window.prompt("Nowa nazwa:");
    if (!name) return;
    renameInvestigation(id, name);
    refreshList();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Usunąć to śledztwo bezpowrotnie?")) return;
    deleteInvestigation(id);
    refreshList();
  };

  const handleOpen = async (inv: Investigation) => {
    const raw = loadInvestigationData(inv.id);
    if (!raw) {
      setBoot({ nodes: [], edges: [] });
      setActiveInv(inv);
      return;
    }

    if (inv.encrypted) {
      setLocked(true);
      setActiveInv(inv);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setBoot(parsed);
      setActiveInv(inv);
    } catch {
      alert("Błąd wczytywania danych.");
    }
  };

  const handleUnlock = (g: StoredGraph) => {
    setBoot(g);
    setLocked(false);
  };

  if (activeInv && boot && !locked) {
    return (
      <ReactFlowProvider>
        <MindDork
          investigationId={activeInv.id}
          boot={boot}
          onBack={() => {
            setActiveInv(null);
            setBoot(null);
            refreshList();
          }}
          onLogout={props.onLogout}
          onAnalyzePhoto={props.onAnalyzePhoto}
        />
      </ReactFlowProvider>
    );
  }

  if (activeInv && locked) {
    return (
      <UnlockGate
        investigationId={activeInv.id}
        onUnlock={handleUnlock}
        onBack={() => {
          setActiveInv(null);
          setLocked(false);
        }}
      />
    );
  }

  return (
    <div className="dashboard-container">
      <div className="user-bar">
        <button type="button" onClick={props.onBack} style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
          ← Wróć do menu
        </button>
        <button type="button" onClick={props.onLogout} style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
          Wyloguj
        </button>
      </div>
      <h1>Twoje śledztwa</h1>
      <button onClick={handleCreate} style={{ marginBottom: "1rem" }}>+ Utwórz nowe śledztwo</button>
      <div className="tool-grid">
        {list.length === 0 && <p className="hint">Brak zapisanych śledztw.</p>}
        {list.map((inv) => (
          <div key={inv.id} className="tool-card" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <div onClick={() => handleOpen(inv)} style={{ flex: 1, cursor: "pointer" }}>
              <h3 style={{ margin: 0 }}>{inv.name} {inv.encrypted ? "🔒" : ""}</h3>
              <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.6 }}>Ostatnia zmiana: {new Date(inv.updatedAt).toLocaleString()}</p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => handleRename(inv.id)} style={{ fontSize: "0.65rem", padding: "0.2rem 0.4rem" }}>Zmień nazwę</button>
              <button onClick={() => handleDelete(inv.id)} style={{ fontSize: "0.65rem", padding: "0.2rem 0.4rem", background: "#441111" }}>Usuń</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthPage(props: { onLogin: (user: string) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (isRegister) {
      const res = register(user, pass);
      if (res.success) setIsRegister(false);
      else setErr(res.message);
    } else {
      const res = login(user, pass);
      if (res.success) props.onLogin(res.user!);
      else setErr(res.message);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>{isRegister ? "Utwórz konto" : "Zaloguj się"}</h1>
        <label className="field">
          Użytkownik
          <input value={user} onChange={(e) => setUser(e.target.value)} required />
        </label>
        <label className="field">
          Hasło
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
        </label>
        {err && <p className="hint" style={{ color: "#ff4444" }}>{err}</p>}
        <button type="submit">{isRegister ? "Zarejestruj" : "Zaloguj"}</button>
        <p className="hint" style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Masz już konto? Zaloguj się" : "Nie masz konta? Zarejestruj się"}
        </p>
      </form>
    </div>
  );
}

function Dashboard(props: { user: string; onSelectTool: (tool: string) => void; onLogout: () => void }) {
  return (
    <div className="dashboard-container">
      <div className="user-bar">
        <span>Użytkownik: <strong>{props.user}</strong></span>
        <button type="button" onClick={props.onLogout} style={{ fontSize: "0.75rem" }}>Wyloguj</button>
      </div>
      
      <h1>Wybierz narzędzie</h1>
      <div className="tool-grid">
        <div className="tool-card" onClick={() => props.onSelectTool("mind-dork")}>
          <h3>🧠 MindDork Tool</h3>
          <p>Wizualna mapa dorków, linków i notatek do białego wywiadu.</p>
        </div>
        <div className="tool-card" onClick={() => props.onSelectTool("analyzer")}>
          <h3>🔍 Analizator plików i metadanych</h3>
          <p>Podgląd plików, analiza EXIF i wyciąganie wniosków z metadanych.</p>
        </div>
      </div>
    </div>
  );
}

function UnlockGate(props: { investigationId: string; onUnlock: (g: StoredGraph) => void; onBack: () => void }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const data = loadInvestigationData(props.investigationId);
    if (!data) return;
    try {
      const g = await decryptGraph(pass, data);
      props.onUnlock(g);
    } catch {
      setErr("Nie udało się odszyfrować. Sprawdź hasło.");
    }
  }, [pass, props]);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Odszyfruj śledztwo</h2>
        <p className="hint">To śledztwo jest zaszyfrowane. Podaj hasło.</p>
        <label className="field">
          Hasło
          <input
            type="password"
            autoFocus
            value={pass}
            onChange={(e) => {
              setErr(null);
              setPass(e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
          />
        </label>
        {err && <p className="hint" style={{ color: "#ff4444" }}>{err}</p>}
        <div className="row">
          <button type="button" onClick={() => void submit()}>
            Odblokuj
          </button>
          <button type="button" onClick={props.onBack}>
            Wróć
          </button>
        </div>
      </div>
    </div>
  );}


export function App() {
  const [user, setUser] = useState<string | null>(getSessionUser());
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [sharedFile, setSharedFile] = useState<File | null>(null);

  const handleLogout = useCallback(() => {
    logout();
    setUser(null);
    setCurrentTool(null);
  }, []);

  if (!user) {
    return <AuthPage onLogin={setUser} />;
  }

  if (!currentTool) {
    return (
      <Dashboard
        user={user}
        onSelectTool={setCurrentTool}
        onLogout={handleLogout}
      />
    );
  }

  if (currentTool === "mind-dork") {
    return (
      <MindDorkManager 
        onBack={() => {
          setSharedFile(null);
          setCurrentTool(null);
        }} 
        onLogout={handleLogout}
        onAnalyzePhoto={(file) => {
          setSharedFile(file);
          setCurrentTool("analyzer");
        }}
      />
    );
  }

  if (currentTool === "analyzer") {
    return (
      <FileAnalyzer 
        initialFile={sharedFile}
        mode="analyzer"
        onBack={() => {
          setSharedFile(null);
          setCurrentTool(null);
        }} 
        onLogout={handleLogout} 
      />
    );
  }

  return null;
}
