import { useDictionary } from "@/features/preferences/provider";
import { Button } from "@/components/ui/button";
import { PreferenceControls } from "@/features/preferences/controls";
import type { HomeIntent } from "./model";

export function Navigation({ openIntent }: { openIntent(intent: HomeIntent): void }) {
 const d = useDictionary();
 return <header id="top" className="home-container">
      <div className="home-utility"><PreferenceControls /></div>
      <nav className="home-nav" aria-label={d.navigation.home}>
        <a href="#top" className="home-brand"><span className="text-movie-title">{d.brand}</span><span>{d.tagline}</span></a>
        <div className="home-nav-links">
          <a href="#top" aria-current="page">{d.navigation.home}</a>
          <a href="#now-showing">{d.navigation.nowShowing}</a>
          <button type="button" onClick={() => openIntent({ kind: "cinema-directory" })}>{d.navigation.cinemas}</button>
          <button type="button" onClick={() => openIntent({ kind: "my-tickets" })}>{d.navigation.myTickets}</button>
        </div>
        <div className="home-nav-actions"><Button variant="secondary" onClick={() => openIntent({ kind: "ai-assistant" })}>{d.navigation.aiAssistant}</Button><Button onClick={() => openIntent({ kind: "login" })}>{d.navigation.login}</Button></div>
      </nav>
    </header>
;
}
