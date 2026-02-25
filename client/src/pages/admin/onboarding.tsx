import { useFeatureFlags } from "@/hooks/use-feature-flags";
import OnboardingV1 from "./onboarding-v1";
import OnboardingV2 from "./onboarding-v2";

export default function OnboardingRouter() {
  const { isEnabled } = useFeatureFlags();
  return isEnabled("phase1.onboarding") ? <OnboardingV2 /> : <OnboardingV1 />;
}
