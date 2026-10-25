import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function LoginPage() {
  return (
    <main className="relative isolate overflow-hidden">
      {/* Cinematic ambient light */}
      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          left-1/2
          top-0
          -z-10
          h-125
          w-200
          -translate-x-1/2
          rounded-full
          bg-red-500/[0.035]
          blur-[120px]
        "
      />

      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          -right-45
          top-25
          -z-10
          h-100
          w-100
          rounded-full
          bg-red-950/20
          blur-[100px]
        "
      />

      <section
        className="
          mx-auto
          flex
          min-h-[calc(100vh-80px)]
          max-w-7xl
          flex-col
          items-center
          justify-center
          px-4
          py-16
          md:px-6
        "
      >
        {/* Page heading */}
        <div className="mb-8 text-center">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#EF4444]">
            Cinema Member
          </p>
          <h1
            className="
              font-(family-name:--font-heading)
              text-[28px]
              font-bold
              tracking-[-0.03em]
              text-white
              md:text-[32px]
            "
          >
            Đăng ký
          </h1>

          <p className="mt-2 text-[14px] leading-6 text-[#9CA3AF]">
            Trở thành thành viên Cinema để nhận được nhiều ưu đãi hấp dẫn <br />
            và trải nghiệm dịch vụ tốt nhất.
          </p>
        </div>

        <AuthCard showTabs={true}>
          <RegisterForm />
        </AuthCard>
      </section>
    </main>
  );
}
