"use client";

import { useEffect, useState } from "react";
import { browserApiFetch } from "../../../lib/api";
import type { AdminSettings } from "../../../lib/admin-api";

const PRIMARY = "#E8792B";

type SettingsTab = "general" | "payment" | "email" | "branding";

interface SettingsContentProps {
  initialSettings: AdminSettings;
}

export function SettingsContent({ initialSettings }: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settings, setSettings] = useState<AdminSettings>(initialSettings);
  const [supportEmailInput, setSupportEmailInput] = useState(initialSettings.supportEmail);
  const [maintenanceMode, setMaintenanceMode] = useState(initialSettings.maintenanceMode);
  const [maintenancePageType, setMaintenancePageType] = useState(initialSettings.maintenancePageType);
  const [maintenanceMessage, setMaintenanceMessage] = useState(initialSettings.maintenanceMessage);
  const [maintenanceAllowedIpsInput, setMaintenanceAllowedIpsInput] = useState(initialSettings.maintenanceAllowedIps.join("\n"));
  const [maintenanceTeaserLabel, setMaintenanceTeaserLabel] = useState(initialSettings.maintenanceTeaserLabel);
  const [maintenanceTeaserHeadline, setMaintenanceTeaserHeadline] = useState(initialSettings.maintenanceTeaserHeadline);
  const [maintenanceTeaserItemsInput, setMaintenanceTeaserItemsInput] = useState(initialSettings.maintenanceTeaserItems.join("\n"));
  const [maintenanceCountdownEnabled, setMaintenanceCountdownEnabled] = useState(initialSettings.maintenanceCountdownEnabled);
  const [maintenanceCountdownEndsAt, setMaintenanceCountdownEndsAt] = useState(
    initialSettings.maintenanceCountdownEndsAt ? initialSettings.maintenanceCountdownEndsAt.slice(0, 16) : ""
  );
  const [announcementsInput, setAnnouncementsInput] = useState(initialSettings.announcements.join("\n"));
  const [paymentSettings, setPaymentSettings] = useState(initialSettings.payment);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [detectedIps, setDetectedIps] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    browserApiFetch<{ detectedIps?: string[] }>("/api/maintenance-status")
      .then((status) => {
        if (!cancelled && Array.isArray(status.detectedIps)) {
          setDetectedIps(status.detectedIps);
        }
      })
      .catch(() => {
        if (!cancelled) setDetectedIps([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSettings() {
    setBusy(true);
    try {
      const saved = await browserApiFetch<AdminSettings>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          supportEmail: supportEmailInput,
          maintenanceMode,
          maintenancePageType,
          maintenanceMessage,
          maintenanceAllowedIps: maintenanceAllowedIpsInput
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          maintenanceTeaserLabel,
          maintenanceTeaserHeadline,
          maintenanceTeaserItems: maintenanceTeaserItemsInput
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          maintenanceCountdownEnabled,
          maintenanceCountdownEndsAt: maintenanceCountdownEndsAt || null,
          announcements: announcementsInput
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          payment: paymentSettings,
        })
      });
      setSettings(saved);
      setPaymentSettings(saved.payment);
      setStatusMessage("Platform settings saved.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: SettingsTab; label: string; icon: string }[] = [
    { key: "general", label: "General", icon: "bi-sliders" },
    { key: "payment", label: "Payment", icon: "bi-credit-card" },
    { key: "email", label: "Email", icon: "bi-envelope" },
    { key: "branding", label: "Branding", icon: "bi-palette" },
  ];

  return (
    <>
      {statusMessage && (
        <div className="alert alert-info alert-dismissible fade show mb-3">
          {statusMessage}
          <button type="button" className="btn-close" onClick={() => setStatusMessage("")} />
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-white">
          <div className="d-flex gap-2" style={{ borderBottom: "none" }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`btn btn-sm ${activeTab === tab.key ? "btn-outline-primary active" : "btn-outline-secondary"}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <i className={`bi ${tab.icon} me-1`}></i>{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "general" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white fw-bold">
            <i className="bi bi-sliders me-2"></i>Platform Settings
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="supportEmail" className="form-label fw-semibold">Support Email</label>
              <input
                id="supportEmail"
                type="email"
                className="form-control"
                value={supportEmailInput}
                onChange={(event) => setSupportEmailInput(event.target.value)}
              />
            </div>
            <div className="mb-3 form-check">
              <input
                id="maintenanceMode"
                className="form-check-input"
                type="checkbox"
                checked={maintenanceMode}
                onChange={(event) => setMaintenanceMode(event.target.checked)}
              />
              <label htmlFor="maintenanceMode" className="form-check-label">Maintenance mode enabled</label>
            </div>
            <div className="mb-3">
              <label htmlFor="maintenancePageType" className="form-label fw-semibold">Public Holding Page Type</label>
              <select
                id="maintenancePageType"
                className="form-select"
                value={maintenancePageType}
                onChange={(event) => setMaintenancePageType(event.target.value as AdminSettings["maintenancePageType"])}
              >
                <option value="maintenance">Maintenance</option>
                <option value="launch">Launch teaser</option>
              </select>
              <div className="form-text">Maintenance is for service downtime. Launch teaser is for pre-launch or opening soon.</div>
            </div>
            <div className="mb-3">
              <label htmlFor="maintenanceMessage" className="form-label fw-semibold">Maintenance Message</label>
              <textarea
                id="maintenanceMessage"
                className="form-control"
                rows={3}
                value={maintenanceMessage}
                onChange={(event) => setMaintenanceMessage(event.target.value)}
              />
            </div>
            <hr className="my-4" />
            <div className="mb-3">
              <label htmlFor="maintenanceTeaserLabel" className="form-label fw-semibold">Launch Label</label>
              <input
                id="maintenanceTeaserLabel"
                className="form-control"
                value={maintenanceTeaserLabel}
                onChange={(event) => setMaintenanceTeaserLabel(event.target.value)}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="maintenanceTeaserHeadline" className="form-label fw-semibold">Launch Headline</label>
              <input
                id="maintenanceTeaserHeadline"
                className="form-control"
                value={maintenanceTeaserHeadline}
                onChange={(event) => setMaintenanceTeaserHeadline(event.target.value)}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="maintenanceTeaserItems" className="form-label fw-semibold">Launch Teaser Cards (one line each)</label>
              <textarea
                id="maintenanceTeaserItems"
                className="form-control"
                rows={4}
                placeholder={"Sharper practice|More polished exam flows\nCleaner progress|Better readiness insights"}
                value={maintenanceTeaserItemsInput}
                onChange={(event) => setMaintenanceTeaserItemsInput(event.target.value)}
              />
              <div className="form-text">Use Title|Description. If no divider is used, the line is shown as the title.</div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-5">
                <div className="form-check form-switch pt-2">
                  <input
                    id="maintenanceCountdownEnabled"
                    className="form-check-input"
                    type="checkbox"
                    checked={maintenanceCountdownEnabled}
                    onChange={(event) => setMaintenanceCountdownEnabled(event.target.checked)}
                  />
                  <label htmlFor="maintenanceCountdownEnabled" className="form-check-label">Show launch countdown</label>
                </div>
              </div>
              <div className="col-md-7">
                <label htmlFor="maintenanceCountdownEndsAt" className="form-label fw-semibold">Countdown Target</label>
                <input
                  id="maintenanceCountdownEndsAt"
                  className="form-control"
                  type="datetime-local"
                  value={maintenanceCountdownEndsAt}
                  onChange={(event) => setMaintenanceCountdownEndsAt(event.target.value)}
                  disabled={!maintenanceCountdownEnabled}
                />
              </div>
            </div>
            <hr className="my-4" />
            <div className="mb-3">
              <label htmlFor="maintenanceAllowedIps" className="form-label fw-semibold">Allowed IP Addresses During Maintenance</label>
              <textarea
                id="maintenanceAllowedIps"
                className="form-control"
                rows={4}
                placeholder={"203.0.113.10\n198.51.100.0/24"}
                value={maintenanceAllowedIpsInput}
                onChange={(event) => setMaintenanceAllowedIpsInput(event.target.value)}
              />
              <div className="form-text">One IP per line. IPv4 CIDR ranges are supported for staging teams.</div>
              {detectedIps.length > 0 && (
                <div className="form-text">
                  Detected IPs for this request: <code>{detectedIps.join(", ")}</code>
                </div>
              )}
            </div>
            <div className="mb-3">
              <label htmlFor="announcements" className="form-label fw-semibold">Announcements (one line each)</label>
              <textarea
                id="announcements"
                className="form-control"
                rows={5}
                value={announcementsInput}
                onChange={(event) => setAnnouncementsInput(event.target.value)}
              />
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">Current announcements: {settings.announcements.length}</small>
              <button className="btn text-white" style={{ background: PRIMARY }} onClick={saveSettings} disabled={busy}>
                <i className="bi bi-check-lg me-1"></i>Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "payment" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white fw-bold">
            <i className="bi bi-credit-card me-2"></i>Payment Gateway Settings
          </div>
          <div className="card-body">
            <div className="row g-4">
              <div className="col-lg-6 col-xl-3">
                <div className="border rounded p-3 h-100">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <h2 className="h6 fw-bold mb-1">ToyyibPay</h2>
                      <p className="text-muted small mb-0">Malaysian FPX/card payment gateway.</p>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        id="toyyibpayEnabled"
                        className="form-check-input"
                        type="checkbox"
                        checked={paymentSettings.toyyibpay.enabled}
                        onChange={(event) =>
                          setPaymentSettings((current) => ({
                            ...current,
                            toyyibpay: { ...current.toyyibpay, enabled: event.target.checked },
                          }))
                        }
                      />
                      <label htmlFor="toyyibpayEnabled" className="form-check-label small">Enabled</label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="toyyibpaySecretKey" className="form-label fw-semibold">Secret Key</label>
                    <input
                      id="toyyibpaySecretKey"
                      type="password"
                      className="form-control"
                      autoComplete="off"
                      value={paymentSettings.toyyibpay.secretKey}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          toyyibpay: { ...current.toyyibpay, secretKey: event.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="toyyibpayCategoryCode" className="form-label fw-semibold">Category Code</label>
                    <input
                      id="toyyibpayCategoryCode"
                      className="form-control"
                      value={paymentSettings.toyyibpay.categoryCode}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          toyyibpay: { ...current.toyyibpay, categoryCode: event.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="form-check form-switch">
                    <input
                      id="toyyibpaySandbox"
                      className="form-check-input"
                      type="checkbox"
                      checked={paymentSettings.toyyibpay.sandbox}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          toyyibpay: { ...current.toyyibpay, sandbox: event.target.checked },
                        }))
                      }
                    />
                    <label htmlFor="toyyibpaySandbox" className="form-check-label">Use sandbox environment</label>
                  </div>
                </div>
              </div>

              <div className="col-lg-6 col-xl-3">
                <div className="border rounded p-3 h-100">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <h2 className="h6 fw-bold mb-1">Stripe</h2>
                      <p className="text-muted small mb-0">Stripe Checkout payment gateway.</p>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        id="stripeEnabled"
                        className="form-check-input"
                        type="checkbox"
                        checked={paymentSettings.stripe.enabled}
                        onChange={(event) =>
                          setPaymentSettings((current) => ({
                            ...current,
                            stripe: { ...current.stripe, enabled: event.target.checked },
                          }))
                        }
                      />
                      <label htmlFor="stripeEnabled" className="form-check-label small">Enabled</label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="stripeSecretKey" className="form-label fw-semibold">Secret Key</label>
                    <input
                      id="stripeSecretKey"
                      type="password"
                      className="form-control"
                      autoComplete="off"
                      value={paymentSettings.stripe.secretKey}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          stripe: { ...current.stripe, secretKey: event.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="stripeWebhookSecret" className="form-label fw-semibold">Webhook Secret</label>
                    <input
                      id="stripeWebhookSecret"
                      type="password"
                      className="form-control"
                      autoComplete="off"
                      value={paymentSettings.stripe.webhookSecret}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          stripe: { ...current.stripe, webhookSecret: event.target.value },
                        }))
                      }
                    />
                  </div>

                  <small className="text-muted">
                    Stripe checkout requires the secret key. The webhook secret is required for signed callback verification.
                  </small>
                </div>
              </div>

              <div className="col-lg-6 col-xl-3">
                <div className="border rounded p-3 h-100">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <h2 className="h6 fw-bold mb-1">PayPal</h2>
                      <p className="text-muted small mb-0">PayPal Checkout payment gateway.</p>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        id="paypalEnabled"
                        className="form-check-input"
                        type="checkbox"
                        checked={paymentSettings.paypal.enabled}
                        onChange={(event) =>
                          setPaymentSettings((current) => ({
                            ...current,
                            paypal: { ...current.paypal, enabled: event.target.checked },
                          }))
                        }
                      />
                      <label htmlFor="paypalEnabled" className="form-check-label small">Enabled</label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="paypalClientId" className="form-label fw-semibold">Client ID</label>
                    <input
                      id="paypalClientId"
                      className="form-control"
                      autoComplete="off"
                      value={paymentSettings.paypal.clientId}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          paypal: { ...current.paypal, clientId: event.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="paypalClientSecret" className="form-label fw-semibold">Client Secret</label>
                    <input
                      id="paypalClientSecret"
                      type="password"
                      className="form-control"
                      autoComplete="off"
                      value={paymentSettings.paypal.clientSecret}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          paypal: { ...current.paypal, clientSecret: event.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="form-check form-switch">
                    <input
                      id="paypalSandbox"
                      className="form-check-input"
                      type="checkbox"
                      checked={paymentSettings.paypal.sandbox}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          paypal: { ...current.paypal, sandbox: event.target.checked },
                        }))
                      }
                    />
                    <label htmlFor="paypalSandbox" className="form-check-label">Use sandbox environment</label>
                  </div>
                </div>
              </div>

              <div className="col-lg-6 col-xl-3">
                <div className="border rounded p-3 h-100">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <h2 className="h6 fw-bold mb-1">Billplz</h2>
                      <p className="text-muted small mb-0">Malaysian bill and FPX payment gateway.</p>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        id="billplzEnabled"
                        className="form-check-input"
                        type="checkbox"
                        checked={paymentSettings.billplz.enabled}
                        onChange={(event) =>
                          setPaymentSettings((current) => ({
                            ...current,
                            billplz: { ...current.billplz, enabled: event.target.checked },
                          }))
                        }
                      />
                      <label htmlFor="billplzEnabled" className="form-check-label small">Enabled</label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="billplzApiKey" className="form-label fw-semibold">API Secret Key</label>
                    <input
                      id="billplzApiKey"
                      type="password"
                      className="form-control"
                      autoComplete="off"
                      value={paymentSettings.billplz.apiKey}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          billplz: { ...current.billplz, apiKey: event.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="billplzCollectionId" className="form-label fw-semibold">Collection ID</label>
                    <input
                      id="billplzCollectionId"
                      className="form-control"
                      autoComplete="off"
                      value={paymentSettings.billplz.collectionId}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          billplz: { ...current.billplz, collectionId: event.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="billplzXSignatureKey" className="form-label fw-semibold">X-Signature Key</label>
                    <input
                      id="billplzXSignatureKey"
                      type="password"
                      className="form-control"
                      autoComplete="off"
                      value={paymentSettings.billplz.xSignatureKey}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          billplz: { ...current.billplz, xSignatureKey: event.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="form-check form-switch">
                    <input
                      id="billplzSandbox"
                      className="form-check-input"
                      type="checkbox"
                      checked={paymentSettings.billplz.sandbox}
                      onChange={(event) =>
                        setPaymentSettings((current) => ({
                          ...current,
                          billplz: { ...current.billplz, sandbox: event.target.checked },
                        }))
                      }
                    />
                    <label htmlFor="billplzSandbox" className="form-check-label">Use sandbox environment</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-4">
              <small className="text-muted">
                Checkout only shows gateways that are enabled and configured.
              </small>
              <button className="btn text-white" style={{ background: PRIMARY }} onClick={saveSettings} disabled={busy}>
                <i className="bi bi-check-lg me-1"></i>Save Payment Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "email" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <div className="fs-1 mb-3">🔧</div>
            <h5 className="card-title">Coming Soon</h5>
            <p className="card-text text-muted">This feature will be available in a future update.</p>
          </div>
        </div>
      )}

      {activeTab === "branding" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <div className="fs-1 mb-3">🔧</div>
            <h5 className="card-title">Coming Soon</h5>
            <p className="card-text text-muted">This feature will be available in a future update.</p>
          </div>
        </div>
      )}
    </>
  );
}
