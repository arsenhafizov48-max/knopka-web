import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F7FF]">
      <div className="mx-auto w-full max-w-[1240px] px-6 py-4">{children}</div>
    </div>
  );
}
