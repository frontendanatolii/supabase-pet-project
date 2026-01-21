import OnboardingPage from "@/components/Onboarding";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OnboardingPage />
    </Suspense>
  );
}
