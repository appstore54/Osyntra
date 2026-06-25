import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PhotoData } from "../types";

function PhotoNodeInner(props: NodeProps) {
  const data = props.data as PhotoData;
  return (
    <div
      style={{
        border: "1px solid #eaeaea",
        background: "#080808",
        borderRadius: 6,
        padding: 6,
        maxWidth: 240,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ color: "#f5f5f5", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
        {data.title || "Zdjęcie"}
      </div>
      {data.src ? (
        <img
          src={data.src}
          alt=""
          style={{ width: "100%", display: "block", filter: "grayscale(1)", borderRadius: 4 }}
        />
      ) : (
        <div style={{ color: "#777", fontSize: 11, padding: "0.5rem" }}>Brak pliku</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const PhotoNode = memo(PhotoNodeInner);
