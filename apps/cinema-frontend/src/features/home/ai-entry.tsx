import { Button } from "@/components/ui/button";
import { useDictionary } from "@/features/preferences/provider";

export function AIEntry({ onOpen }: { onOpen(): void }) {
  const d = useDictionary();
  return (
    <section
      className="ai-entry"
      data-testid="ai-entry"
      aria-labelledby="ai-title"
    >
      <div>
        <h2 id="ai-title" className="text-ai-title">
          {d.home.aiTitle}
        </h2>
        <p className="text-ai-body">{d.home.aiDescription}</p>
      </div>
      <Button variant="secondary" onClick={onOpen}>
        {d.navigation.aiAssistant}
      </Button>
    </section>
  );
}
