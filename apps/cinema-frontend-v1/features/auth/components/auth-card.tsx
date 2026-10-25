import { AuthTabs } from "./auth-tabs";

interface AuthCardProps {
  children: React.ReactNode;
  showTabs?: boolean;
}

export function AuthCard({ children, showTabs = true }: AuthCardProps) {
  return (
    <div className="w-full max-w-110 rounded-xl border border-[#1F2937] bg-[#111827] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] md:p-8">
      {showTabs && <AuthTabs />}
      {children}
    </div>
  );
}
