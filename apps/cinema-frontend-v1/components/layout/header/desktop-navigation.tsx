import Link from "next/link";
import { customerNavigation } from "@/config/navigation";

export function DesktopNavigation() {
  return (
    <nav className="hidden items-center gap-7 lg:flex">
      {customerNavigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="
            font-(family-name:--font-body)
            text-[12px]
            font-medium
            text-[#9CA3AF]
            transition
            hover:text-white
          "
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
