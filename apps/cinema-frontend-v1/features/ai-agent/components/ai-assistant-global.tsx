"use client";

import { useState } from "react";
import { AIFloatingButton } from "./ai-floating-button";
import { AIAssistantModal } from "./ai-assistant-modal";

export function AIAssistantGlobal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AIFloatingButton isOpen={isOpen} onClick={() => setIsOpen(true)} />
      <AIAssistantModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
