"use client";

import { useDictionary } from "./provider";

export function ShellHeading() {
  const dictionary = useDictionary();
  return <h1>{dictionary.shellHeading}</h1>;
}
