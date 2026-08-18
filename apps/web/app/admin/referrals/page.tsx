import { getAdminReferrals } from "../../../lib/admin-api";
import { ReferralsContent } from "./ReferralsContent";

export default async function ReferralsPage() {
  const referralData = await getAdminReferrals();

  return (
    <>
      <h1 className="page-title">Referrals</h1>
      <p className="page-subtitle">Track referral program performance and rewards</p>
      <ReferralsContent initialReferralData={referralData} />
    </>
  );
}
