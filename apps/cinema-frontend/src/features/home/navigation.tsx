import { useDictionary } from "@/features/preferences/provider";
import { Button } from "@/components/ui/button";
import { PreferenceControls } from "@/features/preferences/controls";
import type { HomeIntent } from "./model";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Dialog } from "@/components/ui/dialog";

export function Navigation({ openIntent, onFocusFallback }: { openIntent(intent: HomeIntent): void; onFocusFallback(element: HTMLElement | null): void }) {
 const d = useDictionary();
 const [menuOpen, setMenuOpen] = useState(false);
 const menuButton = useRef<HTMLButtonElement>(null);
 const [brand, setBrand] = useState<HTMLAnchorElement | null>(null);
 useEffect(() => {
   const desktop = window.matchMedia("(min-width: 1024px)");
   const update = () => {
     onFocusFallback(desktop.matches ? brand : menuButton.current);
     if (desktop.matches) setMenuOpen(false);
   };
   update();
   const onResize = () => flushSync(update);
   desktop.addEventListener("change", onResize);
   return () => desktop.removeEventListener("change", onResize);
 }, [brand, onFocusFallback]);
 const handoff = (intent: HomeIntent) => {
   // Close the menu and let its native focus restoration finish before showModal.
   flushSync(() => setMenuOpen(false));
   openIntent(intent);
 };
 return <header id="top" className="home-container">
      <div className="home-utility"><PreferenceControls /></div>
      <nav className="home-nav" aria-label={d.navigation.home}>
        <a ref={setBrand} href="#top" className="home-brand"><span className="text-movie-title">{d.brand}</span><span>{d.tagline}</span></a>
        <div className="home-nav-links">
          <a href="#top" aria-current="page">{d.navigation.home}</a>
          <a href="#now-showing">{d.navigation.nowShowing}</a>
          <button type="button" onClick={() => openIntent({ kind: "cinema-directory" })}>{d.navigation.cinemas}</button>
          <button type="button" onClick={() => openIntent({ kind: "my-tickets" })}>{d.navigation.myTickets}</button>
        </div>
        <div className="home-nav-actions"><Button variant="secondary" onClick={() => openIntent({ kind: "ai-assistant" })}>{d.navigation.aiAssistant}</Button><Button onClick={() => openIntent({ kind: "login" })}>{d.navigation.login}</Button></div>
        <Button ref={menuButton} className="home-menu-trigger" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>Menu</Button>
      </nav>
      <Dialog open={menuOpen} title="Menu" onClose={() => setMenuOpen(false)} returnFocusTo={brand}>
        <nav className="mobile-menu" aria-label={d.navigation.home}>
          <a href="#top" aria-current="page" onClick={() => setMenuOpen(false)}>{d.navigation.home}</a>
          <a href="#now-showing" onClick={() => setMenuOpen(false)}>{d.navigation.nowShowing}</a>
          <Button variant="tertiary" onClick={() => handoff({ kind: "cinema-directory" })}>{d.navigation.cinemas}</Button>
          <Button variant="tertiary" onClick={() => handoff({ kind: "my-tickets" })}>{d.navigation.myTickets}</Button>
          <Button variant="secondary" onClick={() => handoff({ kind: "ai-assistant" })}>{d.navigation.aiAssistant}</Button>
          <Button onClick={() => handoff({ kind: "login" })}>{d.navigation.login}</Button>
          <Button variant="tertiary" onClick={() => setMenuOpen(false)}>{d.home.close}</Button>
        </nav>
      </Dialog>
    </header>
;
}
