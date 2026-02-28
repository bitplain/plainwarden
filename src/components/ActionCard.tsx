"use client";

interface ActionCardProps {
  title: string;
  description: string;
  changes?: string[];
  onApply: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export default function ActionCard({
  title,
  description,
  changes,
  onApply,
  onCancel,
  disabled = false,
}: ActionCardProps) {
  return (
    <div
      style={{
        background: "var(--color-card-bg, #111)",
        border: "1px solid var(--color-border, #333)",
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 14,
          color: "var(--color-text, #ededed)",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--color-muted, #aaa)",
          marginBottom: 8,
        }}
      >
        {description}
      </div>

      {changes && changes.length > 0 && (
        <ul
          style={{
            margin: "0 0 8px 0",
            padding: "0 0 0 16px",
            fontSize: 12,
            color: "var(--color-muted, #999)",
          }}
        >
          {changes.map((change, i) => (
            <li key={i}>{change}</li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onApply}
          disabled={disabled}
          aria-label="Apply action"
          style={{
            padding: "6px 14px",
            background: "var(--color-accent, #6366f1)",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 12,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          aria-label="Cancel action"
          style={{
            padding: "6px 14px",
            background: "transparent",
            color: "var(--color-muted, #aaa)",
            border: "1px solid var(--color-border, #333)",
            borderRadius: 4,
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 12,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
