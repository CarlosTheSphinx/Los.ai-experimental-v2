import { useFeatureFlags } from "@/hooks/use-feature-flags";
import AdminDashboardV1 from "./dashboard-v1";
import DealsV2 from "../deals-v2";

export default function AdminDashboardRouter() {
  const { isEnabled } = useFeatureFlags();
  return isEnabled("phase1.deals") ? <DealsV2 /> : <AdminDashboardV1 />;
}
