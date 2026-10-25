import type { ReactNode } from "react";

/** Hiển thị **in đậm** và gạch đầu dòng mà mô hình hay trả về, không cần thư viện markdown */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-bold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function ChatText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="select-none">•</span>
              <span>{inline(bullet[1])}</span>
            </div>
          );
        }
        return line.trim() === "" ? <div key={i} className="h-1" /> : <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
