"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { browserApiFetch } from "../../../lib/api";
import { StatusBadge } from "../../components/admin/StatusBadge";
import type { ReferralData } from "../../../lib/admin-api";

const PRIMARY = "#E8792B";

interface ReferralsContentProps {
  initialReferralData: ReferralData | null;
}

export function ReferralsContent({ initialReferralData }: ReferralsContentProps) {
  const [referralData, setReferralData] = useState<ReferralData | null>(initialReferralData);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const refreshReferrals = useCallback(async () => {
    try {
      const data = await browserApiFetch<ReferralData>("/api/admin/referrals");
      setReferralData(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refreshReferrals();
  }, [refreshReferrals]);

  async function rewardReferral(redemptionId: number) {
    setBusy(true);
    try {
      await browserApiFetch(`/api/admin/referrals/redemptions/${redemptionId}/reward`,
        { method: "PATCH", body: JSON.stringify({ rewardMyr: 15 }) });
      setStatusMessage(`Referral #${redemptionId} marked as rewarded`);
      await refreshReferrals();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to reward referral");
    } finally { setBusy(false); }
  }

  const topReferrers = useMemo(() => {
    const codes = referralData?.codes ?? [];
    return [...codes]
      .sort((a, b) => (b.totalRedemptions ?? 0) - (a.totalRedemptions ?? 0))
      .slice(0, 5);
  }, [referralData]);

  const recentRedemptions = useMemo(() => {
    const redemptions = referralData?.redemptions ?? [];
    return [...redemptions].slice(0, 5);
  }, [referralData]);

  const summary = referralData?.summary;

  return (
    <>
      {statusMessage && (
        <div className="alert alert-info alert-dismissible fade show mb-3">
          {statusMessage}
          <button type="button" className="btn-close" onClick={() => setStatusMessage("")} />
        </div>
      )}

      {/* Explanation Card */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex align-items-start gap-3">
          <div className="fs-3 text-primary">
            <i className="bi bi-info-circle"></i>
          </div>
          <div>
            <h5 className="card-title mb-1">How the Referral Program Works</h5>
            <p className="card-text text-muted mb-0">
              Every user gets a unique 8-character referral code. When someone signs up using a referral code and completes their first paid order, both the referrer and referee receive a 15% discount voucher valid for 90 days.
            </p>
          </div>
        </div>
      </div>

      {/* Referral Stats */}
      <div className="referral-grid">
        <div className="referral-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="referral-value text-primary">{summary?.totalCodes ?? 0}</div>
          <div className="referral-label">Total Codes</div>
        </div>
        <div className="referral-card" style={{ borderLeft: "4px solid var(--teal)" }}>
          <div className="referral-value" style={{ color: "var(--teal)" }}>{summary?.totalRedemptions ?? 0}</div>
          <div className="referral-label">Total Redemptions</div>
        </div>
        <div className="referral-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div className="referral-value text-success">USD {(summary?.totalRewardMyr ?? 0).toFixed(2)}</div>
          <div className="referral-label">Total Rewards</div>
        </div>
        <div className="referral-card" style={{ borderLeft: "4px solid var(--warning)" }}>
          <div className="referral-value text-warning">{summary?.pending ?? 0}</div>
          <div className="referral-label">Pending</div>
        </div>
      </div>

      {/* Two Column Content */}
      <div className="content-grid two-col">
        {/* Top Referrers */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <span className="fw-bold"><i className="bi bi-trophy me-2"></i>Top Referrers</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>Referrals</th>
                  <th>Rewards</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((c, idx) => (
                  <tr key={c.id}>
                    <td>
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                    </td>
                    <td>
                      <strong>{c.userFullName}</strong>
                      <small className="text-muted d-block">{c.userEmail}</small>
                    </td>
                    <td>{c.totalRedemptions}</td>
                    <td>USD {Number(c.totalRewardMyr).toFixed(2)}</td>
                  </tr>
                ))}
                {topReferrers.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted py-4">No referral codes yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Redemptions */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <span className="fw-bold"><i className="bi bi-arrow-left-right me-2"></i>Recent Redemptions</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>Referrer</th>
                  <th>Referee</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentRedemptions.map((r) => (
                  <tr key={r.id}>
                    <td className="text-muted">{r.referrerEmail}</td>
                    <td>{r.refereeEmail}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      {r.status === "pending" && (
                        <button className="btn btn-sm btn-outline-success" onClick={() => rewardReferral(r.id)} disabled={busy}>
                          Reward
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {recentRedemptions.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted py-4">No redemptions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Program Settings */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white">
          <span className="fw-bold">Program Settings</span>
        </div>
        <div className="card-body">
          <div className="content-grid two-col">
            <div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Reward Type</label>
                <select className="form-select form-select-sm" defaultValue="percentage">
                  <option value="percentage">Percentage Voucher (15%)</option>
                  <option value="fixed">Fixed Voucher (USD 25)</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Voucher Validity (days)</label>
                <input className="form-control form-control-sm" type="number" defaultValue={90} />
              </div>
            </div>
            <div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Reward Trigger</label>
                <select className="form-select form-select-sm" defaultValue="first_paid">
                  <option value="first_paid">First paid order</option>
                  <option value="any_purchase">Any purchase</option>
                  <option value="registration">Registration only</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Code Length</label>
                <input className="form-control form-control-sm" type="number" defaultValue={8} />
              </div>
            </div>
          </div>
          <button className="btn text-white" style={{ background: PRIMARY }} disabled={busy}>
            Save Settings
          </button>
        </div>
      </div>
    </>
  );
}
