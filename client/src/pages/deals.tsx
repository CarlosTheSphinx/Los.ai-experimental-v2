import { useFeatureFlags } from "@/hooks/use-feature-flags";
import DealsV1 from "./deals-v1";
import DealsV2 from "./deals-v2";

export default function DealsRouter() {
  const { isEnabled } = useFeatureFlags();
  return isEnabled("phase1.deals") ? <DealsV2 /> : <DealsV1 />;
}
