import { useFeatureFlags } from "@/hooks/use-feature-flags";
import AdminDealDetailV1 from "./deal-detail-v1";
import DealDetailV2 from "../deal-detail-v2";

export default function AdminDealDetailRouter() {
  const { isEnabled } = useFeatureFlags();
  return isEnabled("phase1.dealDetail") ? <DealDetailV2 /> : <AdminDealDetailV1 />;
}
