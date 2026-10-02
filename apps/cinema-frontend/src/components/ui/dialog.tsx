"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export type DialogProps = {
  open: boolean;
  title: string;
  onClose(): void;
  children: ReactNode;
  returnFocusTo?: HTMLElement | null;
};

function canReceiveFocus(element: HTMLElement | null | undefined): element is HTMLElement {
  if (!element?.isConnected || element.getClientRects().length === 0) return false;
  const style = getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none";
}

export function Dialog({ open, title, onClose, children, returnFocusTo }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const fallbackRef = useRef(returnFocusTo);
  const titleId = useId();
  useEffect(() => {
    onCloseRef.current = onClose;
    fallbackRef.current = returnFocusTo;
  }, [onClose, returnFocusTo]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const prior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]',
      )).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && canReceiveFocus(element));
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("keydown", onKeyDown);
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("keydown", onKeyDown);
      if (dialog.open) dialog.close();
      const target = canReceiveFocus(prior) ? prior : fallbackRef.current;
      if (canReceiveFocus(target)) target.focus();
    };
  }, [open]);

  return <dialog ref={dialogRef} aria-labelledby={titleId} className="m-auto w-[min(640px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-auto rounded-xl border border-border-subtle bg-surface p-6 text-text-primary shadow-2xl backdrop:bg-black/60">
    <h2 id={titleId} className="text-release-panel-title">{title}</h2>
    {children}
  </dialog>;
}
