"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export type SelectOption = { value: string; label: string };
export type SelectFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: SelectOption[];
  onValueChange(value: string): void;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  errorText?: string;
};

function normalizeLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SelectField({
  id,
  label,
  placeholder,
  value,
  options,
  onValueChange,
  disabled = false,
  helperText,
  errorText,
  className = "",
}: SelectFieldProps) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ query: "", lastTyped: 0 });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const choices = [{ value: "", label: placeholder }, ...options];
  const selectedIndex = Math.max(
    0,
    choices.findIndex((option) => option.value === value),
  );
  const isOpen = open && !disabled;
  const descriptionId =
    helperText || errorText ? `${id}-description` : undefined;
  const listId = `${id}-list`;
  const activeId = `${id}-option-${activeIndex}`;

  useEffect(() => {
    if (!isOpen) return;
    const dismissOutside = (event: Event) => {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const positionList = () => {
      if (!trigger.current || !list.current || !root.current) return;
      const bounds = trigger.current.getBoundingClientRect();
      const width = Math.min(
        Math.max(bounds.width, 256),
        window.innerWidth - 32,
      );
      const left = Math.max(
        16,
        Math.min(bounds.left, window.innerWidth - width - 16),
      );
      const below = window.innerHeight - bounds.bottom - 16;
      const above = bounds.top - 16;
      const expectedHeight = Math.min(choices.length * 44 + 14, 288);
      const opensAbove = below < expectedHeight && above > below;
      const popup = list.current;
      popup.style.width = `${width}px`;
      popup.style.left = `${left - bounds.left}px`;
      popup.style.maxHeight = `${Math.max(44, Math.min(288, opensAbove ? above : below))}px`;
      popup.style.top = opensAbove
        ? "auto"
        : `${trigger.current.offsetTop + bounds.height + 8}px`;
      popup.style.bottom = opensAbove
        ? `${root.current.clientHeight - trigger.current.offsetTop + 8}px`
        : "auto";
    };
    positionList();
    window.addEventListener("resize", positionList);
    window.addEventListener("scroll", positionList, true);
    return () => {
      window.removeEventListener("resize", positionList);
      window.removeEventListener("scroll", positionList, true);
    };
  }, [isOpen, choices.length]);

  useLayoutEffect(() => {
    if (isOpen)
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeId]);

  const showList = (index = selectedIndex) => {
    typeahead.current.query = "";
    setActiveIndex(index);
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = choices[index];
    if (option && option.value !== value) onValueChange(option.value);
    setOpen(false);
    typeahead.current.query = "";
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = choices.length - 1;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) showList();
        else if (event.altKey && event.key === "ArrowUp") choose(activeIndex);
        else
          setActiveIndex(
            Math.max(
              0,
              Math.min(
                last,
                activeIndex + (event.key === "ArrowDown" ? 1 : -1),
              ),
            ),
          );
        return;
      case "Home":
      case "End":
        event.preventDefault();
        showList(event.key === "Home" ? 0 : last);
        return;
      case "PageUp":
      case "PageDown":
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(
            Math.max(
              0,
              Math.min(
                last,
                activeIndex + (event.key === "PageDown" ? 10 : -10),
              ),
            ),
          );
        }
        return;
      case "Enter":
        event.preventDefault();
        if (isOpen) choose(activeIndex);
        else showList();
        return;
      case "Escape":
        if (isOpen) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        return;
      case "Tab":
        if (isOpen) choose(activeIndex);
        return;
      case " ":
        if (
          !isOpen ||
          !typeahead.current.query ||
          Date.now() - typeahead.current.lastTyped > 700
        ) {
          event.preventDefault();
          if (isOpen) choose(activeIndex);
          else showList();
          return;
        }
    }
    if (
      event.key.length !== 1 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const now = Date.now();
    const previous =
      isOpen && now - typeahead.current.lastTyped <= 700
        ? typeahead.current.query
        : "";
    const query = normalizeLabel(previous + event.key);
    typeahead.current = { query, lastTyped: now };
    const repeated = [...query].every((char) => char === query[0]);
    const prefix = repeated ? query[0] : query;
    const start =
      previous && !repeated
        ? activeIndex
        : (isOpen ? activeIndex : selectedIndex) + 1;
    let nextIndex = isOpen ? activeIndex : selectedIndex;
    for (let offset = 0; offset < choices.length; offset++) {
      const index = (start + offset) % choices.length;
      if (normalizeLabel(choices[index].label).startsWith(prefix)) {
        nextIndex = index;
        break;
      }
    }
    setActiveIndex(nextIndex);
    setOpen(true);
  };

  return (
    <div ref={root} className={`select-field relative min-w-0 ${className}`}>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        value={value}
        disabled={disabled}
        aria-labelledby={`${id}-label`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listId : undefined}
        aria-activedescendant={isOpen ? activeId : undefined}
        aria-invalid={errorText ? true : undefined}
        aria-describedby={descriptionId}
        className={`select-trigger flex min-h-[58px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-surface-subtle px-3 py-[10px] text-left transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:hover:border-border-subtle ${errorText ? "border-status-error" : isOpen ? "border-action-primary" : "border-border-subtle"}`}
        onClick={() => {
          if (isOpen) setOpen(false);
          else showList();
        }}
        onKeyDown={onKeyDown}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            id={`${id}-label`}
            className="text-quick-label text-text-primary"
          >
            {label}
          </span>
          <span className="select-value text-quick-value text-text-tertiary">
            {choices[selectedIndex].label}
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {isOpen && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="select-popup absolute z-30 overflow-y-auto overscroll-contain rounded-control border border-border-subtle bg-surface p-[6px] shadow-[0_12px_32px_#00000024]"
          onPointerDown={(event) => event.preventDefault()}
        >
          {choices.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-[10px] text-[14px] leading-5 text-text-primary ${index === activeIndex ? "bg-action-soft ring-1 ring-inset ring-action-primary" : "hover:bg-surface-subtle"}`}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => {
                choose(index);
                trigger.current?.focus({ preventScroll: true });
              }}
            >
              <span className="min-w-0 break-words">{option.label}</span>
              {option.value === value && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-4 w-4 shrink-0 text-action-text"
                  fill="none"
                >
                  <path
                    d="m3 8 3 3 7-7"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
      {(errorText || helperText) && (
        <p
          id={descriptionId}
          className={`mt-1 text-xs ${errorText ? "text-status-error" : "text-text-secondary"}`}
        >
          {errorText || helperText}
        </p>
      )}
    </div>
  );
}
