import { memo, useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import type { DorkData } from "../types";
import { buildGoogleUrl } from "../types";

function DorkNodeInner(props: NodeProps) {
  const { id, data: rawData } = props;
  const data = rawData as DorkData;
  const { setNodes } = useReactFlow();

  const update = useCallback((patch: Partial<DorkData>) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        return { ...n, data: { ...n.data, ...patch } };
      })
    );
  }, [id, setNodes]);

  const url = buildGoogleUrl(data.query);
  return (
    <div
      className="nowheel"
      style={{
        minWidth: 220,
        maxWidth: 300,
        border: "1px solid #ffffff",
        background: "#000000",
        color: "#ffffff",
        borderRadius: 6,
        padding: "0.55rem 0.65rem",
        fontSize: 11,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <input
        className="nodrag"
        value={data.title}
        placeholder="Zapytanie..."
        onChange={(e) => update({ title: e.target.value })}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 6,
          color: "inherit",
          fontSize: "inherit",
          outline: "none",
          width: "100%",
        }}
      />
      <textarea
        className="nodrag"
        value={data.query}
        placeholder="Wpisz dork..."
        onChange={(e) => update({ query: e.target.value })}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          color: "#cfcfcf",
          fontSize: "inherit",
          outline: "none",
          width: "100%",
          resize: "none",
          minHeight: 40,
          fontFamily: "inherit",
          wordBreak: "break-word",
          marginBottom: 8,
        }}
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          style={{ fontSize: 10, padding: "0.25rem 0.45rem" }}
          onClick={() => void navigator.clipboard.writeText(data.query)}
        >
          Kopiuj
        </button>
        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 10, alignSelf: "center", color: "#fff" }}>
          Google →
        </a>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const DorkNode = memo(DorkNodeInner);
