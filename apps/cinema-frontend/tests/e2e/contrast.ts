import type { Locator } from "@playwright/test";

/** Measure rendered opaque text against its actual ancestor background. Disabled controls are excluded. */
export async function contrast(locator: Locator, pseudo?: string) {
  return locator.evaluate((element, pseudo) => {
    if (element.matches(":disabled"))
      throw new Error(
        "Disabled controls are outside the enabled contrast audit",
      );
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const style = getComputedStyle(element, pseudo);
    const foreground = rgb(style.color);
    let ancestor: Element | null = element;
    let background: number[] = [];
    while (ancestor) {
      const color = rgb(getComputedStyle(ancestor).backgroundColor);
      if (color.length === 3 || color[3] === 1) {
        background = color;
        break;
      }
      if (color[3] !== 0)
        throw new Error("Translucent backgrounds require compositing");
      ancestor = ancestor.parentElement;
    }
    if (!background.length) throw new Error("No opaque background found");
    const luminance = (color: number[]) =>
      color
        .slice(0, 3)
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(foreground),
      b = luminance(background);
    return {
      foreground: style.color,
      background: `rgb(${background.slice(0, 3).join(", ")})`,
      ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
    };
  }, pseudo);
}
