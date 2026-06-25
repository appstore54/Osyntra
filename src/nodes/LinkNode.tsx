import { memo, useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import type { LinkData } from "../types";

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

function LinkNodeInner(props: NodeProps) {
  const { id, data: rawData } = props;
  const data = rawData as LinkData;
  const { setNodes } = useReactFlow();

  const update = useCallback((patch: Partial<LinkData>) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        return { ...n, data: { ...n.data, ...patch } };
      })
    );
  }, [id, setNodes]);

  const label = data.title?.trim() || hostLabel(data.url);

  return (
    <div
      className="nowheel"
      style={{
        minWidth: 180,
        maxWidth: 260,
        border: "1px solid #bdbdbd",
        background: "#0c0c0c",
        color: "#f0f0f0",
        borderRadius: 6,
        padding: "0.45rem 0.55rem",
        fontSize: 11,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <input
        className="nodrag"
        value={data.title}
        placeholder={label}
        onChange={(e) => update({ title: e.target.value })}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          fontWeight: 700,
          marginBottom: 4,
          color: "inherit",
          fontSize: "inherit",
          outline: "none",
          width: "100%",
          letterSpacing: "0.03em",
        }}
      />
      <textarea
        className="nodrag"
        value={data.url}
        placeholder="https://..."
        onChange={(e) => update({ url: e.target.value })}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          color: "#9a9a9a",
          fontSize: "inherit",
          outline: "none",
          width: "100%",
          resize: "none",
          minHeight: 20,
          fontFamily: "inherit",
          wordBreak: "break-all",
          marginBottom: 8,
        }}
      />
      <a href={data.url} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", fontSize: 11 }}>
        Otwórz →
      </a>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const LinkNode = memo(LinkNodeInner);
