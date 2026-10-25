import Link from "next/link";
import Image from "next/image";
import { DesktopNavigation } from "./desktop-navigation";
import { HeaderActions } from "./header-actions";

export function Header() {
  return (
    <header className="h-20 border-b border-[#1F2937] bg-[#0B0F19]">
      <div className="mx-auto flex h-full max-w-277.5 items-center px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="mr-10 flex shrink-0 items-center"
          aria-label="CGV"
        >
          <Image
            src="/images/cgvlogo.png"
            alt="CGV"
            width={78}
            height={42}
            loading="eager"
            className="w-19.5 h-auto"
          />
        </Link>
        <DesktopNavigation />
        <HeaderActions />
      </div>
    </header>
  );
}
