import { memo, useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import type { NoteData } from "../types";

function NoteNodeInner(props: NodeProps) {
  const { id, data: rawData } = props;
  const data = rawData as NoteData;
  const { setNodes } = useReactFlow();

  const update = useCallback((patch: Partial<NoteData>) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        return { ...n, data: { ...n.data, ...patch } };
      })
    );
  }, [id, setNodes]);

  return (
    <div
      className="nowheel"
      style={{
        minWidth: 200,
        maxWidth: 280,
        border: "1px solid #eaeaea",
        background: "#0f0f0f",
        color: "#f5f5f5",
        borderRadius: 6,
        padding: "0.55rem 0.65rem",
        fontSize: 12,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <input
        className="nodrag"
        value={data.title}
        placeholder="Tytuł..."
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
        }}
      />
      <textarea
        className="nodrag"
        value={data.body}
        placeholder="Treść notatki..."
        onChange={(e) => update({ body: e.target.value })}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          color: "#bdbdbd",
          fontSize: "inherit",
          outline: "none",
          width: "100%",
          resize: "none",
          minHeight: 40,
          fontFamily: "inherit",
        }}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const NoteNode = memo(NoteNodeInner);
