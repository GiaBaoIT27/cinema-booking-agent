import { PreferenceControls } from "@/features/preferences/controls";
import { ShellHeading } from "@/features/preferences/shell-heading";

export default function HomeShell() {
  return <main className="shell-page">
    <header className="shell-header"><span>Cinema</span><PreferenceControls /></header>
    <section className="shell-content"><ShellHeading /></section>
  </main>;
}
