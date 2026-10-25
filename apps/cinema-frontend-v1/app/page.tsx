"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header/header";
import { Footer } from "@/components/layout/footer/footer";
import {
  HeroBannerContainer,
  PromoSection,
  QuickBookingBar,
} from "@/features/home";

import { MovieTabsSection } from "@/features/movie";
import { AIFloatingButton, AIAssistantModal } from "@/features/ai-agent";

export default function HomePage() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");

  const handleOpenAIModal = (prompt?: string) => {
    setInitialPrompt(prompt || "");
    setIsAIOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#080C15] text-white">
      {/* Header cố định */}
      <Header />

      {/* 1. Hero Banner */}
      <HeroBannerContainer />

      {/* 2. Thanh Đặt Vé Nhanh (Tích hợp Đặt vé thủ công & Trợ lý AI) */}
      <QuickBookingBar onOpenAIModal={handleOpenAIModal} />

      {/* 3. Danh Sách Phim (Đang Chiếu / Sắp Chiếu) */}
      <MovieTabsSection />

      {/* 4. Chương Trình Khuyến Mãi */}
      <PromoSection />

      {/* Footer cố định */}
      <Footer />

      {/* Nút Trợ lý AI nổi ở góc phải màn hình */}
      <AIFloatingButton isOpen={isAIOpen} onClick={() => handleOpenAIModal()} />

      {/* Modal / Panel Chat với Trợ lý AI Agent */}
      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        initialPrompt={initialPrompt}
      />
    </div>
  );
}
