export function FooterBottom() {
  return (
    <div className="border-t border-[#424751] pt-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-155">
          <p className="mb-2 text-[10px] font-semibold uppercase text-[#F04449]">
            CÔNG TY TNHH CJ CGV VIỆT NAM
          </p>

          <p className="text-[10px] leading-[1.7] text-[#777E8A]">
            Giấy Chứng nhận đăng ký doanh nghiệp: 0303675393 đăng ký lần đầu
            ngày 31/7/2000, được cấp bởi Sở Kế hoạch và Đầu tư Thành phố Hồ Chí
            Minh.
          </p>

          <p className="text-[10px] leading-[1.7] text-[#777E8A]">
            Địa chỉ: Lầu 2, số 27-29, đường Nguyễn Thi, phường Đa Kao, Thành phố
            Hồ Chí Minh, Việt Nam.
          </p>

          <p className="mt-1 text-[10px] text-[#777E8A]">
            © 2025 CGV VIET NAM. All rights reserved.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PaymentLogo>momo</PaymentLogo>
          <PaymentLogo>V</PaymentLogo>
          <PaymentLogo>◉</PaymentLogo>
          <span className="text-[14px] font-bold text-[#31539A]">VISA</span>
        </div>
      </div>
    </div>
  );
}

function PaymentLogo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[8px] font-bold text-[#111]">
      {children}
    </div>
  );
}
