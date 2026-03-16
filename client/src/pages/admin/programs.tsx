import { useFeatureFlags } from "@/hooks/use-feature-flags";
import ProgramsV1 from "./programs-v1";
import ProgramsV2 from "./programs-v2";

export default function ProgramsRouter() {
  const { isEnabled } = useFeatureFlags();
  return isEnabled("phase1.programs") ? <ProgramsV2 /> : <ProgramsV1 />;
}
