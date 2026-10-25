import { Header } from "@/components/layout/header/header";
import { Footer } from "@/components/layout/footer/footer";
import { BookingProvider } from "@/features/booking/context/booking-context";
import { AIAssistantGlobal } from "@/features/ai-agent";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BookingProvider>
      <div className="relative flex min-h-screen flex-col bg-[#080C15] text-white selection:bg-red-600 selection:text-white">
        {/* Header cố định */}
        <Header />

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer cố định */}
        <Footer />

        {/* Global AI Assistant Floating Button & Modal */}
        <AIAssistantGlobal />
      </div>
    </BookingProvider>
  );
}
