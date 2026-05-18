export default function CodePreview({ previews, onAccept, onReject }) {
  if (!previews || previews.length === 0) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 100, padding: 24
    }}>
      <div style={{
        width: "100%", maxWidth: 720, maxHeight: "85vh", background: "#111118",
        border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden",
        display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #1e1e2e",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
              Review Changes
            </span>
            <span style={{
              marginLeft: 10, fontSize: 11, padding: "2px 8px", borderRadius: 4,
              background: "#00ff9d15", border: "1px solid #00ff9d30", color: "#00ff9d"
            }}>
              {previews.length} file{previews.length > 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onAccept} style={{
              padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer",
              background: "#00ff9d", color: "#000", fontWeight: 700, fontSize: 12
            }}>✅ Apply All</button>
            <button onClick={onReject} style={{
              padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontSize: 12,
              background: "transparent", border: "1px solid #1e1e2e", color: "#4a5568"
            }}>✕ Reject</button>
          </div>
        </div>

        {/* Files */}
        <div style={{ overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {previews.map((p, i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                  background: p.isNew ? "#00ff9d15" : "#3b82f615",
                  border: `1px solid ${p.isNew ? "#00ff9d30" : "#3b82f630"}`,
                  color: p.isNew ? "#00ff9d" : "#3b82f6"
                }}>
                  {p.isNew ? "✨ NEW" : "✏️ MODIFIED"}
                </span>
                <code style={{ fontSize: 12, color: "#a0aec0" }}>{p.file_path}</code>
              </div>
              <pre style={{
                fontFamily: "monospace", fontSize: 12, lineHeight: 1.7, margin: 0,
                background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 8,
                padding: 16, color: "#a8d8a8", overflow: "auto", maxHeight: 300,
                whiteSpace: "pre-wrap", wordBreak: "break-word"
              }}>
                {p.code || p.updated_code}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}