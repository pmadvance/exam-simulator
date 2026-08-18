"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { AdminModal, ConfirmModal } from "./components/AdminModal";
import { StatCard, StatCardsGrid } from "../components/admin/StatCard";
import { StatusBadge } from "../components/admin/StatusBadge";
import { RecentOrdersTable, RecentAuditLogsTable } from "../components/admin/ActivityFeed";
import { ProductManager } from "../components/admin/ProductManager";
import { UserManager } from "../components/admin/UserManager";
import { OrderManager } from "../components/admin/OrderManager";
import { BrandLogo } from "../components/BrandLogo";
import {
  browserApiFetch,
} from "../../lib/api";
import {
  type AdminAuditLog,
  type AdminSession,
  type AdminProduct,
  type AdminQuestion,
  type AdminExam,
  type AdminUser,
  type AdminOrder,
  type AdminVoucher,
  type AdminDomain,
  type SalesReport,
  type EnrollmentReport,
  type AttemptReport,
  type AdminSettings,
  type DashboardSnapshot,
  type SessionPolicy,
} from "../../lib/admin-api";

type DashboardScreenProps = {
  initialSnapshot: DashboardSnapshot;
  initialAuditLogs: AdminAuditLog[];
  initialSessions: AdminSession[];
  initialProducts: AdminProduct[];
  initialExams: AdminExam[];
  initialUsers: AdminUser[];
  initialOrders: AdminOrder[];
  initialVouchers: AdminVoucher[];
  initialSalesReport: SalesReport[];
  initialEnrollmentReport: EnrollmentReport[];
  initialAttemptReport: AttemptReport[];
  initialSettings: AdminSettings;
};

const PRIMARY = "#E8792B";

const sidebarItems = [
  { key: "overview", label: "Overview", icon: "bi-speedometer2" },
  { key: "products", label: "Exams", icon: "bi-box-seam" },
  { key: "exams", label: "Tests", icon: "bi-journal-text" },
  { key: "questions", label: "Questions", icon: "bi-question-circle" },
  { key: "assets", label: "Assets", icon: "bi-images" },
  { key: "users", label: "Users", icon: "bi-people" },
  { key: "orders", label: "Orders", icon: "bi-receipt" },
  { key: "vouchers", label: "Vouchers", icon: "bi-ticket-perforated" },
  { key: "eco-domains", label: "ECO Domains", icon: "bi-diagram-3" },
  { key: "perf-domains", label: "Performance Domains", icon: "bi-bullseye" },
  { key: "reports", label: "Reports", icon: "bi-graph-up" },
  { key: "settings", label: "Settings", icon: "bi-sliders" },
  { key: "sessions", label: "Sessions", icon: "bi-wifi" },
  { key: "policies", label: "Policies", icon: "bi-shield-lock" },
  { key: "audit", label: "Audit Log", icon: "bi-list-check" },
  { key: "referrals", label: "Referrals", icon: "bi-share" },
  { key: "organizations", label: "Organizations", icon: "bi-building" },
] as const;

type TabKey = (typeof sidebarItems)[number]["key"];

const sidebarSections: { id: string; label: string; keys: TabKey[] }[] = [
  { id: "overview", label: "Overview", keys: ["overview", "reports"] },
  { id: "catalog", label: "Catalog", keys: ["products", "exams", "eco-domains", "perf-domains"] },
  { id: "content", label: "Content", keys: ["questions", "assets"] },
  { id: "users-sales", label: "Users & Sales", keys: ["users", "orders", "vouchers", "referrals", "organizations"] },
  { id: "system", label: "System", keys: ["sessions", "policies", "settings", "audit"] },
];



/* ------------------------------------------------------------------ */
/*  DomainManagementTab (reusable for ECO & Performance domains)      */
/* ------------------------------------------------------------------ */
function DomainManagementTab({
  title,
  icon,
  description,
  domains,
  products,
  busy,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}: {
  title: string;
  icon: string;
  description: string;
  domains: { id: number; productId: number; name: string; description: string | null }[];
  products: AdminProduct[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  onCreate: (productId: number, name: string, description: string) => Promise<void>;
  onUpdate: (id: number, name: string, description: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formProductId, setFormProductId] = useState(products[0]?.id?.toString() ?? "1");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [filterProductId, setFilterProductId] = useState<string>("all");

  const filtered = filterProductId === "all" ? domains : domains.filter((d) => d.productId === Number(filterProductId));

  return (
    <>
      {showForm && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white fw-bold">
            <i className={`bi ${icon} me-2`}></i>{editingId ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}
          </div>
          <div className="card-body">
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (editingId) {
                await onUpdate(editingId, formName, formDesc);
              } else {
                await onCreate(Number(formProductId), formName, formDesc);
              }
              setShowForm(false);
              setEditingId(null);
              setFormName("");
              setFormDesc("");
            }}>
              <div className="row g-3">
                {!editingId && (
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Exam (Product)</label>
                    <select className="form-select form-select-sm" value={formProductId} onChange={(e) => setFormProductId(e.target.value)}>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                )}
                <div className={editingId ? "col-md-6" : "col-md-4"}>
                  <label className="form-label small fw-semibold">Name</label>
                  <input className="form-control form-control-sm" placeholder="e.g. People, Process" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                </div>
                <div className={editingId ? "col-md-6" : "col-md-4"}>
                  <label className="form-label small fw-semibold">Description</label>
                  <input className="form-control form-control-sm" placeholder="Brief description" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                <button type="submit" className="btn btn-sm text-white" style={{ background: PRIMARY }} disabled={busy}>
                  {busy ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setShowForm(false); setEditingId(null); setFormName(""); setFormDesc(""); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span className="fw-bold">
            <i className={`bi ${icon} me-2`}></i>{title}
          </span>
          <div className="d-flex gap-2 align-items-center">
            <select className="form-select form-select-sm" style={{ width: "auto" }} value={filterProductId} onChange={(e) => setFilterProductId(e.target.value)}>
              <option value="all">All Products</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button className="btn btn-sm text-white" style={{ background: PRIMARY }} onClick={() => { setEditingId(null); setFormProductId(products[0]?.id?.toString() ?? "1"); setFormName(""); setFormDesc(""); setShowForm(true); }} disabled={busy}>
              <i className="bi bi-plus-lg me-1"></i>New
            </button>
          </div>
        </div>
        <p className="px-3 pt-2 mb-0 small text-muted">{description}</p>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Name</th>
                <th>Description</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td className="small text-muted">{products.find((p) => p.id === d.productId)?.title ?? d.productId}</td>
                  <td className="fw-semibold">{d.name}</td>
                  <td className="text-muted">{d.description || "\u2014"}</td>
                  <td className="text-end d-flex gap-1 justify-content-end">
                    <button className="btn btn-outline-primary btn-sm" onClick={() => { setEditingId(d.id); setFormName(d.name); setFormDesc(d.description ?? ""); setShowForm(true); }} disabled={busy}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => { if (confirm(`Delete "${d.name}"?`)) onDelete(d.id); }} disabled={busy}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted py-4">No domains{filterProductId !== "all" ? " for this product" : ""}. Click &quot;New&quot; to add one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */
export function DashboardScreen({
  initialSnapshot,
  initialAuditLogs,
  initialSessions,
  initialProducts,
  initialExams,
  initialUsers,
  initialOrders,
  initialVouchers,
  initialSalesReport,
  initialEnrollmentReport,
  initialAttemptReport,
  initialSettings,
}: DashboardScreenProps) {
  /* ---------- state ---------- */
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [sessions, setSessions] = useState(initialSessions);
  const [products, setProducts] = useState(initialProducts);
  const [exams, setExams] = useState(initialExams);
  const [examFilterProductId, setExamFilterProductId] = useState<number | "all">("all");
  const [examFilterStatus, setExamFilterStatus] = useState<"all" | "draft" | "published">("all");
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);

  /* ── Products tab filter/sort state ── */
  const [productSearch, setProductSearch] = useState("");
  const [productFilterCategory, setProductFilterCategory] = useState<string>("all");
  const [productFilterVisibility, setProductFilterVisibility] = useState<string>("all");
  const [productSortCol, setProductSortCol] = useState<"id" | "title" | "priceUsd" | "accessDays" | "visibility">("id");
  const [productSortDir, setProductSortDir] = useState<"asc" | "desc">("desc");

  /* ── Questions tab filter state ── */
  const [questionFilterProductId, setQuestionFilterProductId] = useState<number | "all">("all");
  const [questionFilterExamId, setQuestionFilterExamId] = useState<number | "all">("all");
  const [questionFilterStatus, setQuestionFilterStatus] = useState<string>("all");
  const [questionFilterEco, setQuestionFilterEco] = useState<string>("all");
  const [questionFilterPerf, setQuestionFilterPerf] = useState<string>("all");
  const [assets, setAssets] = useState<{ filename: string; url: string; size: number; modified: string; inUse: boolean }[]>([]);
  const [users, setUsers] = useState(initialUsers);
  const [orders, setOrders] = useState(initialOrders);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [vouchers, setVouchers] = useState(initialVouchers);
  const [ecoDomains, setEcoDomains] = useState<AdminDomain[]>([]);
  const [perfDomains, setPerfDomains] = useState<AdminDomain[]>([]);
  const [salesReport, setSalesReport] = useState(initialSalesReport);
  const [enrollmentReport, setEnrollmentReport] = useState(initialEnrollmentReport);
  const [attemptReport, setAttemptReport] = useState(initialAttemptReport);
  const [settings, setSettings] = useState(initialSettings);

  // ── Phase 2 feature state ──
  type AddUserForm = { email: string; fullName: string; password: string; role: string; productSlug: string; accessDays: string; sendWelcomeEmail: boolean };
  const emptyAddUser: AddUserForm = { email: "", fullName: "", password: "", role: "student", productSlug: "", accessDays: "", sendWelcomeEmail: true };
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState<AddUserForm>(emptyAddUser);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkPreview, setBulkPreview] = useState<{ total: number; newUsers: number; duplicates: number; withEnrollment: number; errors: Array<{ row: number; reason: string }> } | null>(null);
  const [bulkSendEmail, setBulkSendEmail] = useState(true);

  type VoucherForm = { code: string; type: "fixed" | "percentage"; amount: string; minOrder: string; usageLimit: string; perUserLimit: string; validUntil: string };
  const emptyVoucherForm: VoucherForm = { code: "", type: "fixed", amount: "10", minOrder: "0", usageLimit: "", perUserLimit: "1", validUntil: "" };
  const [showVoucherCreate, setShowVoucherCreate] = useState(false);
  const [voucherForm, setVoucherForm] = useState<VoucherForm>(emptyVoucherForm);
  const [showVoucherBulk, setShowVoucherBulk] = useState(false);
  const [voucherBulk, setVoucherBulk] = useState({ prefix: "PROMO", count: "10", type: "percentage" as "fixed" | "percentage", amount: "10", validUntil: "" });

  type ReferralData = {
    summary: { totalCodes: number; totalRedemptions: number; totalRewardMyr: number; pending: number };
    codes: Array<{ id: number; code: string; userEmail: string; userFullName: string; totalRedemptions: number; totalRewardMyr: number; createdAt: string }>;
    redemptions: Array<{ id: number; status: string; createdAt: string; rewardedAt: string | null; orderId: number | null; referrerEmail: string; refereeEmail: string }>;
  };
  const [referralData, setReferralData] = useState<ReferralData | null>(null);

  type Organization = { id: number; slug: string; name: string; contactEmail: string | null; status: string; memberCount: number; orderCount: number; seatTierOverride: number | null };
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showOrgCreate, setShowOrgCreate] = useState(false);
  const [orgForm, setOrgForm] = useState({ slug: "", name: "", contactEmail: "", contactPhone: "", seatTierOverride: "", notes: "" });

  type OrgMember = { id: number; userId: number; email: string; fullName: string; role: string; joinedAt: string };
  type OrgOrderRow = { id: number; orderId: number; seatCount: number; discountPercent: number; createdAt: string; orderStatus: string; totalAmount: number };
  type OrgDetail = Organization & { members: OrgMember[]; orders: OrgOrderRow[] };
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null);
  const [orgDetailLoading, setOrgDetailLoading] = useState(false);
  const [orgMemberForm, setOrgMemberForm] = useState({ userEmail: "", role: "member" as "owner" | "admin" | "member" });
  const [orgSeatOrder, setOrgSeatOrder] = useState<{ productSlug: string; selectedMemberIds: number[]; paymentStatus: "paid" | "pending" }>({ productSlug: "", selectedMemberIds: [], paymentStatus: "paid" });
  const [orgQuotePreview, setOrgQuotePreview] = useState<{ seats: number; discountPercent: number; source: string } | null>(null);

  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => Promise<void> | void; variant?: "primary" | "danger" | "warning" }>(
    { open: false, title: "", message: "", onConfirm: () => {} }
  );

  const searchParams = useSearchParams();
  const router = useRouter();
  const validKeys = sidebarItems.map((i) => i.key) as readonly string[];
  const initialTab = ((): TabKey => {
    const t = searchParams.get("tab");
    return t && validKeys.includes(t) ? (t as TabKey) : "overview";
  })();
  const [activeTab, setActiveTabState] = useState<TabKey>(initialTab);
  const setActiveTab = useCallback(
    (key: TabKey) => {
      setActiveTabState(key);
      const url = key === "overview" ? "/admin" : `/admin?tab=${key}`;
      router.replace(url, { scroll: false });
      if (key === "assets") loadAssets();
    },
    [router],
  );

  // Fetch all auth-required admin data client-side on mount
  useEffect(() => {
    browserApiFetch<DashboardSnapshot>("/api/admin/summary").then(setSnapshot).catch(() => {});
    browserApiFetch<AdminProduct[]>("/api/admin/products").then(setProducts).catch(() => {});
    browserApiFetch<AdminUser[]>("/api/admin/users").then(setUsers).catch(() => {});
    browserApiFetch<AdminOrder[]>("/api/admin/orders").then(setOrders).catch(() => {});
    browserApiFetch<AdminVoucher[]>("/api/admin/vouchers").then(setVouchers).catch(() => {});
    browserApiFetch<AdminAuditLog[]>("/api/admin/audit-logs?limit=30").then(setAuditLogs).catch(() => {});
    browserApiFetch<AdminSession[]>("/api/admin/sessions").then(setSessions).catch(() => {});
    browserApiFetch<AdminDomain[]>("/api/admin/eco-domains").then(setEcoDomains).catch(() => {});
    browserApiFetch<AdminDomain[]>("/api/admin/performance-domains").then(setPerfDomains).catch(() => {});
    browserApiFetch<SalesReport[]>("/api/admin/reports/sales?days=30").then((d) => setSalesReport(d)).catch(() => {});
    browserApiFetch<EnrollmentReport[]>("/api/admin/reports/enrollments").then((d) => setEnrollmentReport(d)).catch(() => {});
    browserApiFetch<AttemptReport[]>("/api/admin/reports/attempts").then((d) => setAttemptReport(d)).catch(() => {});
    browserApiFetch<AdminSettings>("/api/admin/settings").then((d) => {
      setSettings(d);
      setSupportEmailInput(d.supportEmail);
      setMaintenanceMode(d.maintenanceMode);
      setMaintenanceMessage(d.maintenanceMessage);
      setAnnouncementsInput(d.announcements.join("\n"));
    }).catch(() => {});
    browserApiFetch<ReferralData>("/api/admin/referrals").then(setReferralData).catch(() => {});
    browserApiFetch<Organization[]>("/api/admin/organizations").then(setOrganizations).catch(() => {});
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  const [policyUserId, setPolicyUserId] = useState("4");
  const [maxSessionsInput, setMaxSessionsInput] = useState("");
  const [ttlDaysInput, setTtlDaysInput] = useState("");
  const [supportEmailInput, setSupportEmailInput] = useState(initialSettings.supportEmail);
  const [maintenanceMode, setMaintenanceMode] = useState(initialSettings.maintenanceMode);
  const [maintenanceMessage, setMaintenanceMessage] = useState(initialSettings.maintenanceMessage);
  const [announcementsInput, setAnnouncementsInput] = useState(initialSettings.announcements.join("\n"));
  const [policy, setPolicy] = useState<SessionPolicy | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem("admin-sidebar-sections") ?? "{}");
    } catch { return {}; }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("admin-sidebar-sections", JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  function toggleSection(id: string) {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  /* ---------- form/modal state ---------- */
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [productForm, setProductForm] = useState<{ slug: string; title: string; description: string; category: string; difficulty: string; priceUsd: string; accessDays: string; visibility: "draft" | "published" | "archived" }>({ slug: "", title: "", description: "", category: "Professional Certification", difficulty: "Intermediate", priceUsd: "100", accessDays: "90", visibility: "draft" });

  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState<AdminExam | null>(null);
  const [examForm, setExamForm] = useState<{ slug: string; title: string; productId: string; timeLimitMinutes: string; passThreshold: string; status: "draft" | "published" }>({ slug: "", title: "", productId: "1", timeLimitMinutes: "180", passThreshold: "70", status: "draft" });

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({ examId: "1", questionType: "single_choice" as "single_choice" | "multiple_response" | "true_false", prompt: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "", ecoDomain: "", performanceDomain: "", imageUrl: "", status: "published" as "draft" | "published" });
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvUploadExamId, setCsvUploadExamId] = useState("1");
  const [csvUploadText, setCsvUploadText] = useState("");

  /* ---------- handlers ---------- */
  async function refreshAuditLogs() {
    try {
      const data = await browserApiFetch<AdminAuditLog[]>(
        "/api/admin/audit-logs?limit=30",
      );
      setAuditLogs(data);
    } catch {
      // Non-critical: don't let audit refresh failures mask primary operation success
    }
  }

  async function refreshSessions() {
    try {
      const data = await browserApiFetch<AdminSession[]>("/api/admin/sessions");
      setSessions(data);
    } catch {
      // Non-critical
    }
  }

  // ── Phase 2: Add User / Bulk Import ──
  async function submitAddUser() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        email: addUserForm.email.trim(),
        fullName: addUserForm.fullName.trim(),
        role: addUserForm.role,
        sendWelcomeEmail: addUserForm.sendWelcomeEmail,
      };
      if (addUserForm.password.trim()) body.password = addUserForm.password.trim();
      if (addUserForm.productSlug.trim()) body.productSlug = addUserForm.productSlug.trim();
      if (addUserForm.accessDays.trim()) body.accessDays = Number(addUserForm.accessDays);
      const created = await browserApiFetch<{ id: number; email: string; fullName: string; role: string; generatedPassword?: string }>(
        "/api/admin/users", { method: "POST", body: JSON.stringify(body) }
      );
      setUsers((prev) => [{ id: created.id, email: created.email, fullName: created.fullName, role: created.role, status: "active", createdAt: new Date().toISOString() } as AdminUser, ...prev]);
      const pwNote = created.generatedPassword ? ` (temp password: ${created.generatedPassword})` : "";
      setStatusMessage(`User created: ${created.email}${pwNote}`);
      setShowAddUser(false);
      setAddUserForm(emptyAddUser);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to create user");
    } finally { setBusy(false); }
  }

  async function previewBulkUsers() {
    setBusy(true);
    try {
      const data = await browserApiFetch<typeof bulkPreview>("/api/admin/users/import/preview",
        { method: "POST", body: JSON.stringify({ csv: bulkCsv }) });
      setBulkPreview(data);
      if (data) setStatusMessage(`Preview: ${data.newUsers} new, ${data.duplicates} duplicates`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Preview failed");
    } finally { setBusy(false); }
  }

  async function applyBulkUsers() {
    setBusy(true);
    try {
      const data = await browserApiFetch<{ created: number; skipped: number }>(
        "/api/admin/users/import/apply",
        { method: "POST", body: JSON.stringify({ csv: bulkCsv, sendWelcomeEmail: bulkSendEmail }) }
      );
      setStatusMessage(`Bulk import: ${data.created} users created, ${data.skipped} skipped`);
      setShowBulkImport(false);
      setBulkCsv("");
      setBulkPreview(null);
      browserApiFetch<AdminUser[]>("/api/admin/users").then(setUsers).catch(() => {});
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Bulk import failed");
    } finally { setBusy(false); }
  }

  // ── Phase 2: Voucher modal create / bulk issue ──
  async function submitVoucherCreate() {
    setBusy(true);
    try {
      const body = {
        code: voucherForm.code.trim().toUpperCase(),
        type: voucherForm.type,
        amount: Number(voucherForm.amount),
        minOrder: Number(voucherForm.minOrder || "0"),
        usageLimit: voucherForm.usageLimit ? Number(voucherForm.usageLimit) : null,
        perUserLimit: Number(voucherForm.perUserLimit || "1"),
        validUntil: voucherForm.validUntil || null,
        status: "active" as const,
      };
      const created = await browserApiFetch<AdminVoucher>("/api/admin/vouchers",
        { method: "POST", body: JSON.stringify(body) });
      setVouchers((v) => [created, ...v]);
      setStatusMessage(`Voucher ${body.code} created`);
      setShowVoucherCreate(false);
      setVoucherForm(emptyVoucherForm);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to create voucher");
    } finally { setBusy(false); }
  }

  async function submitVoucherBulk() {
    setBusy(true);
    try {
      const data = await browserApiFetch<{ requested: number; created: number; codes: Array<{ code: string }> }>(
        "/api/admin/vouchers/bulk",
        { method: "POST", body: JSON.stringify({
          prefix: voucherBulk.prefix,
          count: Number(voucherBulk.count),
          type: voucherBulk.type,
          amount: Number(voucherBulk.amount),
          validUntil: voucherBulk.validUntil || null,
        }) }
      );
      setStatusMessage(`Bulk-issued ${data.created} vouchers (prefix: ${voucherBulk.prefix})`);
      setShowVoucherBulk(false);
      browserApiFetch<AdminVoucher[]>("/api/admin/vouchers").then(setVouchers).catch(() => {});
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Bulk issue failed");
    } finally { setBusy(false); }
  }

  // ── Phase 2: Organization create ──
  async function submitOrgCreate() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        slug: orgForm.slug.trim().toLowerCase(),
        name: orgForm.name.trim(),
        contactEmail: orgForm.contactEmail.trim() || null,
        contactPhone: orgForm.contactPhone.trim() || null,
        notes: orgForm.notes.trim() || null,
      };
      if (orgForm.seatTierOverride.trim()) body.seatTierOverride = Number(orgForm.seatTierOverride);
      const created = await browserApiFetch<Organization>("/api/admin/organizations",
        { method: "POST", body: JSON.stringify(body) });
      setOrganizations((prev) => [created, ...prev]);
      setStatusMessage(`Organization "${created.name}" created`);
      setShowOrgCreate(false);
      setOrgForm({ slug: "", name: "", contactEmail: "", contactPhone: "", seatTierOverride: "", notes: "" });
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to create organization");
    } finally { setBusy(false); }
  }

  // ── Phase 2: Organization detail / member mgmt / seat order ──
  async function openOrgDetail(orgId: number) {
    setOrgDetailLoading(true);
    setOrgDetail(null);
    setOrgQuotePreview(null);
    setOrgSeatOrder({ productSlug: "", selectedMemberIds: [], paymentStatus: "paid" });
    try {
      const data = await browserApiFetch<OrgDetail>(`/api/admin/organizations/${orgId}`);
      setOrgDetail(data);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to load organization");
    } finally { setOrgDetailLoading(false); }
  }

  async function refreshOrgDetail(orgId: number) {
    try {
      const data = await browserApiFetch<OrgDetail>(`/api/admin/organizations/${orgId}`);
      setOrgDetail(data);
      // Also refresh the list-row counts
      browserApiFetch<Organization[]>("/api/admin/organizations").then(setOrganizations).catch(() => {});
    } catch { /* ignore */ }
  }

  async function addOrgMember() {
    if (!orgDetail || !orgMemberForm.userEmail.trim()) return;
    setBusy(true);
    try {
      await browserApiFetch(`/api/admin/organizations/${orgDetail.id}/members`, {
        method: "POST",
        body: JSON.stringify({ userEmail: orgMemberForm.userEmail.trim(), role: orgMemberForm.role }),
      });
      setStatusMessage(`Member added to ${orgDetail.name}`);
      setOrgMemberForm({ userEmail: "", role: "member" });
      await refreshOrgDetail(orgDetail.id);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to add member");
    } finally { setBusy(false); }
  }

  async function removeOrgMember(memberId: number) {
    if (!orgDetail) return;
    setBusy(true);
    try {
      await browserApiFetch(`/api/admin/organizations/${orgDetail.id}/members/${memberId}`, { method: "DELETE" });
      setStatusMessage("Member removed");
      await refreshOrgDetail(orgDetail.id);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to remove member");
    } finally { setBusy(false); }
  }

  async function previewSeatQuote() {
    if (!orgDetail) return;
    const seats = orgSeatOrder.selectedMemberIds.length;
    if (seats === 0) { setOrgQuotePreview(null); return; }
    try {
      const q = await browserApiFetch<{ seats: number; discountPercent: number; source: string }>(
        `/api/admin/organizations/${orgDetail.id}/quote?seats=${seats}`
      );
      setOrgQuotePreview(q);
    } catch { setOrgQuotePreview(null); }
  }

  async function submitSeatOrder() {
    if (!orgDetail) return;
    if (!orgSeatOrder.productSlug.trim()) { setStatusMessage("Pick a product"); return; }
    if (orgSeatOrder.selectedMemberIds.length === 0) { setStatusMessage("Select at least one member"); return; }
    setBusy(true);
    try {
      const result = await browserApiFetch<{ orderId: number; seats: number; discountPercent: number; discountedTotal: number; enrolledCount: number; alreadyEnrolledCount: number }>(
        `/api/admin/organizations/${orgDetail.id}/orders`,
        {
          method: "POST",
          body: JSON.stringify({
            productSlug: orgSeatOrder.productSlug.trim(),
            memberUserIds: orgSeatOrder.selectedMemberIds,
            paymentStatus: orgSeatOrder.paymentStatus,
          }),
        }
      );
      setStatusMessage(
        `Seat order #${result.orderId} created — ${result.seats} seat(s) at ${result.discountPercent}% off, USD ${result.discountedTotal.toFixed(2)}. Enrolled ${result.enrolledCount}, already-enrolled ${result.alreadyEnrolledCount}.`
      );
      setOrgSeatOrder({ productSlug: "", selectedMemberIds: [], paymentStatus: "paid" });
      setOrgQuotePreview(null);
      await refreshOrgDetail(orgDetail.id);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to create seat order");
    } finally { setBusy(false); }
  }

  async function refreshReferrals() {
    try {
      const data = await browserApiFetch<ReferralData>("/api/admin/referrals");
      setReferralData(data);
    } catch { /* ignore */ }
  }

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

  async function revokeSession(sessionId: string) {
    setBusy(true);
    try {
      await browserApiFetch<void>("/api/admin/sessions/" + sessionId, {
        method: "DELETE",
      });
      setStatusMessage("Session " + sessionId.slice(0, 8) + " revoked.");
      await Promise.all([refreshSessions(), refreshAuditLogs()]);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to revoke session.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadPolicy() {
    setBusy(true);
    try {
      const userId = Number(policyUserId);
      const loaded = await browserApiFetch<SessionPolicy>(
        "/api/admin/session-policies?userId=" + userId,
      );
      setPolicy(loaded);
      setMaxSessionsInput(
        loaded.maxSessions ? String(loaded.maxSessions) : "",
      );
      setTtlDaysInput(
        loaded.refreshTtlDays ? String(loaded.refreshTtlDays) : "",
      );
      setStatusMessage("Loaded session policy for user " + userId + ".");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to load session policy.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function savePolicy() {
    setBusy(true);
    try {
      const userId = Number(policyUserId);
      const payload = {
        userId,
        maxSessions: maxSessionsInput.trim() ? Number(maxSessionsInput) : null,
        refreshTtlDays: ttlDaysInput.trim() ? Number(ttlDaysInput) : null,
      };
      const saved = await browserApiFetch<SessionPolicy>(
        "/api/admin/session-policies",
        { method: "PUT", body: JSON.stringify(payload) },
      );
      setPolicy(saved);
      setStatusMessage("Saved session policy for user " + userId + ".");
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to save session policy.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createProduct() {
    setBusy(true);
    try {
      if (editingProduct) {
        const payload = {
          title: productForm.title,
          description: productForm.description,
          category: productForm.category,
          difficulty: productForm.difficulty,
          priceUsd: Number(productForm.priceUsd),
          accessDays: Number(productForm.accessDays),
          visibility: productForm.visibility,
        };
        const updated = await browserApiFetch<AdminProduct>(
          "/api/admin/products/" + editingProduct.id,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setProducts((p) => p.map((x) => x.id === editingProduct.id ? { ...x, ...updated } : x));
        setStatusMessage('Exam "' + updated.title + '" updated.');
      } else {
        const payload = {
          title: productForm.title,
          description: productForm.description,
          category: productForm.category,
          difficulty: productForm.difficulty,
          priceUsd: Number(productForm.priceUsd),
          accessDays: Number(productForm.accessDays),
          visibility: productForm.visibility,
        };
        const created = await browserApiFetch<AdminProduct>(
          "/api/admin/products",
          { method: "POST", body: JSON.stringify(payload) },
        );
        setProducts((p) => [created, ...p]);
        setStatusMessage('Exam "' + created.title + '" created.');
      }
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ slug: "", title: "", description: "", category: "Professional Certification", difficulty: "Intermediate", priceUsd: "100", accessDays: "90", visibility: "draft" });
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to save exam.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleProductVisibility(id: number, current: string) {
    const next = current === "published" ? "archived" : "published";
    setBusy(true);
    try {
      await browserApiFetch<{ id: number; visibility: string }>(
        "/api/admin/products/" + id + "/status",
        { method: "PATCH", body: JSON.stringify({ visibility: next }) },
      );
      setProducts((p) =>
        p.map((x) =>
          x.id === id
            ? { ...x, visibility: next as AdminProduct["visibility"] }
            : x,
        ),
      );
      setStatusMessage("Product " + id + " is now " + next + ".");
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to update product status.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createExam() {
    setBusy(true);
    try {
      if (editingExam) {
        const updated = await browserApiFetch<AdminExam>(
          "/api/admin/exams/" + editingExam.id,
          { method: "PATCH", body: JSON.stringify({ title: examForm.title, timeLimitMinutes: Number(examForm.timeLimitMinutes), passThreshold: Number(examForm.passThreshold), status: examForm.status }) },
        );
        setExams((e) => e.map((x) => x.id === editingExam.id ? { ...x, ...updated } : x));
        setStatusMessage('Test "' + updated.title + '" updated.');
      } else {
        const payload = {
          title: examForm.title,
          productId: Number(examForm.productId),
          timeLimitMinutes: Number(examForm.timeLimitMinutes),
          passThreshold: Number(examForm.passThreshold),
          status: examForm.status,
        };
        const created = await browserApiFetch<AdminExam>("/api/admin/exams", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setExams((e) => [created, ...e]);
        setStatusMessage('Test "' + created.title + '" created.');
      }
      setShowExamForm(false);
      setEditingExam(null);
      setExamForm({ slug: "", title: "", productId: "1", timeLimitMinutes: "180", passThreshold: "70", status: "draft" });
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to save test.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleExamStatus(id: number, current: string) {
    const next = current === "published" ? "draft" : "published";
    setBusy(true);
    try {
      await browserApiFetch<{ id: number; status: string }>(
        "/api/admin/exams/" + id + "/status",
        { method: "PATCH", body: JSON.stringify({ status: next }) },
      );
      setExams((e) =>
        e.map((x) =>
          x.id === id ? { ...x, status: next as AdminExam["status"] } : x,
        ),
      );
      setStatusMessage("Exam " + id + " is now " + next + ".");
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to update exam status.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadQuestions(examId?: number) {
    setBusy(true);
    try {
      const qs = examId ? "?examId=" + examId : "";
      const data = await browserApiFetch<AdminQuestion[]>(
        "/api/admin/questions" + qs,
      );
      setQuestions(data);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to load questions.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadAssets() {
    setBusy(true);
    try {
      const data = await browserApiFetch<typeof assets>("/api/admin/assets");
      setAssets(data);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load assets.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAssets(files: FileList | File[]) {
    setBusy(true);
    try {
      const fd = new FormData();
      for (const file of Array.from(files)) fd.append("images", file);
      const res = await fetch("/api/admin/assets/upload", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setStatusMessage(`${data.count} image${data.count > 1 ? "s" : ""} uploaded.`);
      await loadAssets();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAsset(filename: string) {
    if (!confirm(`Delete ${filename}?`)) return;
    setBusy(true);
    try {
      await browserApiFetch(`/api/admin/assets/${encodeURIComponent(filename)}`, { method: "DELETE" });
      setStatusMessage("Asset deleted.");
      await loadAssets();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  function openAssetPicker() {
    setShowAssetPicker(true);
    if (assets.length === 0) {
      void loadAssets();
    }
  }

  function chooseAsset(asset: { filename: string; url: string }) {
    setQuestionForm((prev) => ({ ...prev, imageUrl: asset.url }));
    setShowAssetPicker(false);
    setStatusMessage(`Selected ${asset.filename} from assets.`);
  }

  async function createQuestion() {
    setBusy(true);
    try {
      const payload = {
        examId: Number(questionForm.examId),
        questionType: questionForm.questionType,
        prompt: questionForm.prompt,
        optionA: questionForm.optionA,
        optionB: questionForm.optionB,
        optionC: questionForm.questionType === "true_false" ? "" : questionForm.optionC,
        optionD: questionForm.questionType === "true_false" ? "" : questionForm.optionD,
        correctAnswer: questionForm.correctAnswer,
        explanation: questionForm.explanation,
        ecoDomain: questionForm.ecoDomain || null,
        performanceDomain: questionForm.performanceDomain || null,
        imageUrl: questionForm.imageUrl || null,
        status: questionForm.status,
      };
      if (editingQuestion) {
        const { examId, ...updatePayload } = payload;
        const updated = await browserApiFetch<AdminQuestion>(
          "/api/admin/questions/" + editingQuestion.id,
          { method: "PATCH", body: JSON.stringify(updatePayload) },
        );
        setQuestions((q) => q.map((x) => x.id === editingQuestion.id ? { ...x, ...updated } : x));
        setStatusMessage("Question " + editingQuestion.id + " updated.");
      } else {
        const created = await browserApiFetch<AdminQuestion>(
          "/api/admin/questions",
          { method: "POST", body: JSON.stringify(payload) },
        );
        setQuestions((q) => [created, ...q]);
        setStatusMessage("Question " + created.id + " created.");
      }
      setShowQuestionForm(false);
      setShowAssetPicker(false);
      setEditingQuestion(null);
      setQuestionForm({ examId: "1", questionType: "single_choice", prompt: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "", ecoDomain: "", performanceDomain: "", imageUrl: "", status: "published" });
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to save question.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadQuestionsCsv() {
    setBusy(true);
    try {
      const result = await browserApiFetch<{ inserted: number; total: number }>(
        "/api/admin/questions/upload-csv",
        { method: "POST", body: JSON.stringify({ examId: Number(csvUploadExamId), csv: csvUploadText }) },
      );
      setStatusMessage(`CSV upload complete: ${result.inserted} questions imported.`);
      setShowCsvUpload(false);
      setCsvUploadText("");
      await loadQuestions(Number(csvUploadExamId));
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "CSV upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCsvUploadText(reader.result as string); };
    reader.readAsText(file);
  }

  async function deleteQuestion(id: number) {
    if (!confirm("Delete question " + id + "?")) return;
    setBusy(true);
    try {
      await browserApiFetch<void>("/api/admin/questions/" + id, {
        method: "DELETE",
      });
      setQuestions((q) => q.filter((x) => x.id !== id));
      setStatusMessage("Question " + id + " deleted.");
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to delete question.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(userId: number, userEmail: string, newRole: string) {
    const reason = prompt("Reason for role change:");
    if (!reason) return;
    try {
      setBusy(true);
      await browserApiFetch("/api/admin/users/" + userId + "/role", { method: "PATCH", body: JSON.stringify({ role: newRole, reason }) });
      setUsers((prev) => prev.map((x) => x.id === userId ? { ...x, role: newRole } : x));
      setStatusMessage("Role updated for " + userEmail);
      await refreshAuditLogs();
    } catch (err) { 
      setStatusMessage(err instanceof Error ? err.message : "Failed to change role"); 
    } finally { 
      setBusy(false); 
    }
  }

  async function toggleUserStatus(id: number, current: string) {
    const next = current === "active" ? "suspended" : "active";
    const reason = prompt("Reason for " + next + ":") ?? "Admin action";
    setBusy(true);
    try {
      await browserApiFetch<{ id: number; status: string }>(
        "/api/admin/users/" + id + "/status",
        { method: "PATCH", body: JSON.stringify({ status: next, reason }) },
      );
      setUsers((u) =>
        u.map((x) => (x.id === id ? { ...x, status: next } : x)),
      );
      setStatusMessage("User " + id + " is now " + next + ".");
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to update user status.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function reconcileOrder(id: number) {
    const status = prompt("New status (paid/failed/refunded):") ?? "paid";
    const reason = prompt("Reason:") ?? "Manual reconciliation";
    setBusy(true);
    try {
      await browserApiFetch<{ id: number; status: string }>(
        "/api/admin/orders/" + id + "/reconcile",
        { method: "PATCH", body: JSON.stringify({ status, reason }) },
      );
      setOrders((o) =>
        o.map((x) => (x.id === id ? { ...x, status } : x)),
      );
      setStatusMessage(
        "Order " + id + " reconciled to " + status + ".",
      );
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to reconcile order.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createVoucher() {
    setBusy(true);
    try {
      const code = prompt("Voucher code:") ?? "NEWCODE";
      const type = prompt("Type (percentage/fixed):") ?? "percentage";
      const amount = Number(prompt("Amount:") ?? "10");
      const created = await browserApiFetch<AdminVoucher>(
        "/api/admin/vouchers",
        {
          method: "POST",
          body: JSON.stringify({
            code,
            type,
            amount,
            minOrder: 0,
            perUserLimit: 1,
            status: "active",
          }),
        },
      );
      setVouchers((v) => [created, ...v]);
      setStatusMessage('Voucher "' + created.code + '" created.');
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to create voucher.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setBusy(true);
    try {
      const saved = await browserApiFetch<AdminSettings>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          supportEmail: supportEmailInput,
          maintenanceMode,
          maintenanceMessage,
          announcements: announcementsInput
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        })
      });
      setSettings(saved);
      setStatusMessage("Platform settings saved.");
      await refreshAuditLogs();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- derived ---------- */
  const activeTabLabel =
    sidebarItems.find((t) => t.key === activeTab)?.label ?? "Dashboard";

  /* ---------- render ---------- */
  return (
    <div className="d-flex min-vh-100">
      {/* -------- Sidebar -------- */}
      <aside
        className="d-flex flex-column flex-shrink-0 text-white"
        style={{
          width: sidebarCollapsed ? 64 : 240,
          background: "linear-gradient(180deg, #1a2332 0%, #0f1724 100%)",
          transition: "width 0.2s ease",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          zIndex: 100,
        }}
      >
        {/* brand row */}
        <div className="d-flex align-items-center px-3 py-3 border-bottom border-secondary border-opacity-25">
          <BrandLogo variant="dark" size="compact" className="flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="ms-2 fw-bold text-truncate">Admin</span>
          )}
          <button
            className="btn btn-link text-white-50 ms-auto p-0 flex-shrink-0"
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            <i
              className={
                "bi " +
                (sidebarCollapsed ? "bi-chevron-right" : "bi-chevron-left")
              }
            ></i>
          </button>
        </div>

        {/* nav items - grouped into sections */}
        <nav className="flex-grow-1 py-2 overflow-auto">
          {sidebarSections.map((section) => {
            const sectionItems = section.keys
              .map((k) => sidebarItems.find((i) => i.key === k))
              .filter((i): i is typeof sidebarItems[number] => Boolean(i));
            const isSectionCollapsed = collapsedSections[section.id] && !sidebarCollapsed;
            return (
              <div key={section.id} className="mb-1">
                {!sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="btn w-100 text-start d-flex align-items-center justify-content-between px-3 py-1 border-0 text-white-50"
                    style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, opacity: 0.7 }}
                  >
                    <span>{section.label}</span>
                    <i className={`bi ${isSectionCollapsed ? "bi-chevron-down" : "bi-chevron-up"}`} style={{ fontSize: 10 }}></i>
                  </button>
                )}
                {!isSectionCollapsed && sectionItems.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      title={sidebarCollapsed ? item.label : undefined}
                      className={
                        "btn w-100 text-start d-flex align-items-center gap-2 px-3 py-2 rounded-0 border-0 " +
                        (isActive ? "text-white" : "text-white-50")
                      }
                      style={{
                        background: isActive ? "rgba(232, 121, 43, 0.25)" : "transparent",
                        borderLeft: isActive ? "3px solid #F4A261" : "3px solid transparent",
                        fontSize: 13,
                      }}
                      onClick={() => setActiveTab(item.key)}
                    >
                      <i
                        className={"bi " + item.icon + " flex-shrink-0"}
                        style={{ width: 20, textAlign: "center" }}
                      ></i>
                      {!sidebarCollapsed && (
                        <span className="text-truncate">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* footer links */}
        <div className="border-top border-secondary border-opacity-25 py-2">
          <a
            href="/"
            className="btn w-100 text-start text-white-50 d-flex align-items-center gap-2 px-3 py-2 border-0 text-decoration-none"
            style={{ fontSize: 14 }}
          >
            <i
              className="bi bi-house flex-shrink-0"
              style={{ width: 20, textAlign: "center" }}
            ></i>
            {!sidebarCollapsed && <span>Back to Site</span>}
          </a>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/signout";
            }}
            className="btn w-100 text-start text-white-50 d-flex align-items-center gap-2 px-3 py-2 border-0 text-decoration-none"
            style={{ fontSize: 14 }}
          >
            <i
              className="bi bi-box-arrow-left flex-shrink-0"
              style={{ width: 20, textAlign: "center" }}
            ></i>
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* -------- Main content -------- */}
      <div
        className="flex-grow-1 d-flex flex-column"
        style={{ background: "#f0f2f5" }}
      >
        {/* top bar */}
        <header className="bg-white border-bottom px-4 py-3 d-flex align-items-center justify-content-between flex-shrink-0">
          <div>
            <small className="text-muted">Admin Panel</small>
            <h5 className="mb-0 fw-bold">{activeTabLabel}</h5>
          </div>
          <div className="d-flex align-items-center gap-3">
            {statusMessage && (
              <span
                className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 fw-normal"
                style={{
                  maxWidth: 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <i className="bi bi-info-circle me-1"></i>
                {statusMessage}
              </span>
            )}
            <span className="badge bg-dark bg-opacity-10 text-dark fw-normal">
              <i className="bi bi-person-circle me-1"></i>Admin
            </span>
          </div>
        </header>

        {/* content area */}
        <div className="flex-grow-1 p-4 overflow-auto">
          {/* ========== OVERVIEW ========== */}
          {activeTab === "overview" && (
            <>
              <StatCardsGrid
                stats={[
                  {
                    label: "Revenue (USD)",
                    value: "USD " + snapshot.revenueUsd,
                    icon: "bi-currency-dollar",
                    color: "green",
                  },
                  {
                    label: "Active Subscriptions",
                    value: snapshot.activeSubscriptions,
                    icon: "bi-bookmark-check",
                    color: "orange",
                  },
                  {
                    label: "Expiring Soon",
                    value: snapshot.expiringSoon,
                    icon: "bi-exclamation-triangle",
                    color: "orange",
                  },
                  {
                    label: "Failed Payments",
                    value: snapshot.failedPayments,
                    icon: "bi-x-circle",
                    color: "red",
                  },
                  {
                    label: "Recent Attempts",
                    value: snapshot.recentAttempts,
                    icon: "bi-pencil-square",
                    color: "purple",
                  },
                ]}
              />

              <div className="row g-4">
                <div className="col-lg-6">
                  <RecentOrdersTable orders={orders} limit={5} />
                </div>
                <div className="col-lg-6">
                  <RecentAuditLogsTable auditLogs={auditLogs} limit={5} />
                </div>
              </div>
            </>
          )}

          {/* ========== EXAMS (was Products) ========== */}
          {activeTab === "products" && (
            <>
              {/* Form Modal */}
              {showProductForm && (
                <div className="card border-0 shadow-sm mb-3">
                  <div className="card-header bg-white fw-bold">
                    <i className="bi bi-pencil-square me-2"></i>{editingProduct ? "Edit Exam" : "New Exam"}
                  </div>
                  <div className="card-body">
                    <form onSubmit={(e) => { e.preventDefault(); createProduct(); }}>
                      <div className="row g-3">
                        {editingProduct && (
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold">Slug <span className="text-muted fw-normal">(auto-generated)</span></label>
                            <input className="form-control form-control-sm bg-light" value={productForm.slug} disabled />
                          </div>
                        )}
                        <div className={editingProduct ? "col-md-4" : "col-md-6"}>
                          <label className="form-label small fw-semibold">Title</label>
                          <input className="form-control form-control-sm" placeholder="Exam title" value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} required />
                        </div>
                        <div className={editingProduct ? "col-md-4" : "col-md-6"}>
                          <label className="form-label small fw-semibold">Category</label>
                          <select className="form-select form-select-sm" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}>
                            <option>Professional Certification</option>
                            <option>Public Training</option>
                            <option>In-House Training</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label small fw-semibold">Description</label>
                          <textarea className="form-control form-control-sm" rows={2} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} required />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Difficulty</label>
                          <select className="form-select form-select-sm" value={productForm.difficulty} onChange={(e) => setProductForm({ ...productForm, difficulty: e.target.value })}>
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Price (USD)</label>
                          <input type="number" className="form-control form-control-sm" value={productForm.priceUsd} onChange={(e) => setProductForm({ ...productForm, priceUsd: e.target.value })} required />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Access (days)</label>
                          <input type="number" className="form-control form-control-sm" value={productForm.accessDays} onChange={(e) => setProductForm({ ...productForm, accessDays: e.target.value })} required />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Visibility</label>
                          <select className="form-select form-select-sm" value={productForm.visibility} onChange={(e) => setProductForm({ ...productForm, visibility: e.target.value as "draft" | "published" | "archived" })}>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-3 d-flex gap-2">
                        <button type="submit" className="btn btn-sm text-white" style={{ background: PRIMARY }} disabled={busy}>
                          {busy ? "Saving..." : editingProduct ? "Update Exam" : "Create Exam"}
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setShowProductForm(false); setEditingProduct(null); }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <span className="fw-bold">
                    <i className="bi bi-box-seam me-2"></i>Exam Management
                  </span>
                  <button className="btn btn-sm text-white" style={{ background: PRIMARY }} onClick={() => { setEditingProduct(null); setProductForm({ slug: "", title: "", description: "", category: "Professional Certification", difficulty: "Intermediate", priceUsd: "100", accessDays: "90", visibility: "draft" }); setShowProductForm(true); }} disabled={busy}>
                    <i className="bi bi-plus-lg me-1"></i>New Exam
                  </button>
                </div>
                {/* Filter Bar */}
                <div className="card-body border-bottom py-2">
                  <div className="row g-2 align-items-center">
                    <div className="col-md-4">
                      <input className="form-control form-control-sm" placeholder="Search by title..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <select className="form-select form-select-sm" value={productFilterCategory} onChange={(e) => setProductFilterCategory(e.target.value)}>
                        <option value="all">All Categories</option>
                        <option value="Professional Certification">Professional Certification</option>
                        <option value="Public Training">Public Training</option>
                        <option value="In-House Training">In-House Training</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select className="form-select form-select-sm" value={productFilterVisibility} onChange={(e) => setProductFilterVisibility(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div className="col-md-2 text-end">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => { setProductSearch(""); setProductFilterCategory("all"); setProductFilterVisibility("all"); }}>Clear</button>
                    </div>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        {([["id", "ID"], ["title", "Title"], ["priceUsd", "Price"], ["accessDays", "Access"], ["visibility", "Status"]] as const).map(([col, label]) => (
                          <th key={col} style={{ cursor: "pointer", userSelect: "none" }} onClick={() => { if (productSortCol === col) { setProductSortDir(productSortDir === "asc" ? "desc" : "asc"); } else { setProductSortCol(col); setProductSortDir("asc"); } }}>
                            {label} {productSortCol === col && <i className={`bi bi-chevron-${productSortDir === "asc" ? "up" : "down"} ms-1`}></i>}
                          </th>
                        ))}
                        <th>Category</th>
                        <th>Tests</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = products
                          .filter((p) => productFilterCategory === "all" || p.category === productFilterCategory)
                          .filter((p) => productFilterVisibility === "all" || p.visibility === productFilterVisibility)
                          .filter((p) => !productSearch || p.title.toLowerCase().includes(productSearch.toLowerCase()));
                        const sorted = [...filtered].sort((a, b) => {
                          const col = productSortCol;
                          const dir = productSortDir === "asc" ? 1 : -1;
                          if (col === "title" || col === "visibility") return a[col].localeCompare(b[col]) * dir;
                          return ((a[col] as number) - (b[col] as number)) * dir;
                        });
                        if (sorted.length === 0) return <tr><td colSpan={8} className="text-center text-muted py-4">No exams match filters</td></tr>;
                        return sorted.map((p) => {
                          const testCount = exams.filter((e) => e.productId === p.id).length;
                          return (
                            <tr key={p.id}>
                              <td>{p.id}</td>
                              <td className="fw-semibold">{p.title}</td>
                              <td>USD {p.priceUsd}</td>
                              <td>{p.accessDays}d</td>
                              <td><StatusBadge status={p.visibility} /></td>
                              <td>{p.category}</td>
                              <td>
                                <button className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => { setExamFilterProductId(p.id); setActiveTab("exams"); }}>
                                  {testCount} test{testCount !== 1 ? "s" : ""} <i className="bi bi-arrow-right-short"></i>
                                </button>
                              </td>
                              <td className="text-end d-flex gap-1 justify-content-end">
                                <button className="btn btn-outline-primary btn-sm" onClick={() => { setEditingProduct(p); setProductForm({ slug: p.slug, title: p.title, description: p.description, category: p.category, difficulty: p.difficulty, priceUsd: String(p.priceUsd), accessDays: String(p.accessDays), visibility: p.visibility }); setShowProductForm(true); }} disabled={busy}>
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button className="btn btn-outline-secondary btn-sm" onClick={() => toggleProductVisibility(p.id, p.visibility)} disabled={busy}>
                                  {p.visibility === "published" ? "Archive" : "Publish"}
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ========== TESTS (was Exams) ========== */}
          {activeTab === "exams" && (
            <>
              {/* Form Modal */}
              {showExamForm && (
                <div className="card border-0 shadow-sm mb-3">
                  <div className="card-header bg-white fw-bold">
                    <i className="bi bi-pencil-square me-2"></i>{editingExam ? "Edit Test" : "New Test"}
                  </div>
                  <div className="card-body">
                    <form onSubmit={(e) => { e.preventDefault(); createExam(); }}>
                      <div className="row g-3">
                        {editingExam && (
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold">Slug <span className="text-muted fw-normal">(auto-generated)</span></label>
                            <input className="form-control form-control-sm bg-light" value={examForm.slug} disabled />
                          </div>
                        )}
                        <div className={editingExam ? "col-md-4" : "col-md-6"}>
                          <label className="form-label small fw-semibold">Title</label>
                          <input className="form-control form-control-sm" placeholder="Test title" value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} required />
                        </div>
                        <div className={editingExam ? "col-md-4" : "col-md-6"}>
                          <label className="form-label small fw-semibold">Exam (Product)</label>
                          <select className="form-select form-select-sm" value={examForm.productId} onChange={(e) => setExamForm({ ...examForm, productId: e.target.value })} disabled={!!editingExam}>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">Time Limit (min)</label>
                          <input type="number" className="form-control form-control-sm" value={examForm.timeLimitMinutes} onChange={(e) => setExamForm({ ...examForm, timeLimitMinutes: e.target.value })} required />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">Pass Threshold (%)</label>
                          <input type="number" className="form-control form-control-sm" min="0" max="100" value={examForm.passThreshold} onChange={(e) => setExamForm({ ...examForm, passThreshold: e.target.value })} required />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">Status</label>
                          <select className="form-select form-select-sm" value={examForm.status} onChange={(e) => setExamForm({ ...examForm, status: e.target.value as "draft" | "published" })}>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-3 d-flex gap-2">
                        <button type="submit" className="btn btn-sm text-white" style={{ background: PRIMARY }} disabled={busy}>
                          {busy ? "Saving..." : editingExam ? "Update Test" : "Create Test"}
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setShowExamForm(false); setEditingExam(null); }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-bold">
                    <i className="bi bi-journal-text me-2"></i>Test Builder
                  </span>
                  <div className="d-flex gap-2 align-items-center">
                    <select className="form-select form-select-sm" style={{ width: "auto" }} value={examFilterProductId === "all" ? "all" : String(examFilterProductId)} onChange={(e) => setExamFilterProductId(e.target.value === "all" ? "all" : Number(e.target.value))}>
                      <option value="all">All Exams</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <select className="form-select form-select-sm" style={{ width: "auto" }} value={examFilterStatus} onChange={(e) => setExamFilterStatus(e.target.value as "all" | "draft" | "published")}>
                      <option value="all">All Status</option>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                    <button className="btn btn-sm text-white" style={{ background: PRIMARY }} onClick={() => { setEditingExam(null); setExamForm({ slug: "", title: "", productId: products[0]?.id?.toString() ?? "1", timeLimitMinutes: "180", passThreshold: "70", status: "draft" }); setShowExamForm(true); }} disabled={busy}>
                      <i className="bi bi-plus-lg me-1"></i>New Test
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Exam</th>
                        <th>Time</th>
                        <th>Pass %</th>
                        <th>Questions</th>
                        <th>Status</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.filter((e) => (examFilterProductId === "all" || e.productId === examFilterProductId) && (examFilterStatus === "all" || e.status === examFilterStatus)).map((e) => (
                        <tr key={e.id}>
                          <td>{e.id}</td>
                          <td className="fw-semibold">{e.title}</td>
                          <td className="small text-muted">{products.find((p) => p.id === e.productId)?.title ?? e.productId}</td>
                          <td>{e.timeLimitMinutes}min</td>
                          <td>{e.passThreshold}%</td>
                          <td>{e.questionCount}</td>
                          <td><StatusBadge status={e.status} /></td>
                          <td className="text-end d-flex gap-1 justify-content-end">
                            <button className="btn btn-outline-info btn-sm" title="View Questions" onClick={() => { setQuestionFilterExamId(e.id); setQuestionFilterProductId(e.productId); loadQuestions(e.id); setActiveTab("questions"); }} disabled={busy}>
                              <i className="bi bi-list-check"></i>
                            </button>
                            <a href={"/admin/preview/" + e.id} target="_blank" rel="noopener noreferrer" className="btn btn-outline-success btn-sm" title="Preview ALL questions">
                              <i className="bi bi-play-fill"></i>
                            </a>
                            <button className="btn btn-outline-primary btn-sm" onClick={() => { setEditingExam(e); setExamForm({ slug: e.slug, title: e.title, productId: String(e.productId), timeLimitMinutes: String(e.timeLimitMinutes), passThreshold: String(e.passThreshold), status: e.status }); setShowExamForm(true); }} disabled={busy}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-outline-secondary btn-sm" onClick={() => toggleExamStatus(e.id, e.status)} disabled={busy}>
                              {e.status === "published" ? "Unpublish" : "Publish"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {exams.filter((e) => (examFilterProductId === "all" || e.productId === examFilterProductId) && (examFilterStatus === "all" || e.status === examFilterStatus)).length === 0 && (
                        <tr><td colSpan={8} className="text-center text-muted py-4">No tests</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ========== QUESTIONS ========== */}
          {activeTab === "questions" && (
            <>
              {/* Autocomplete datalists for ECO/Performance domains */}
              <datalist id="eco-domain-suggestions">
                {[...new Set([...ecoDomains.map((d) => d.name), ...questions.map((q) => q.ecoDomain).filter(Boolean)])].map((v) => <option key={v} value={v!} />)}
              </datalist>
              <datalist id="perf-domain-suggestions">
                {[...new Set([...perfDomains.map((d) => d.name), ...questions.map((q) => q.performanceDomain).filter(Boolean)])].map((v) => <option key={v} value={v!} />)}
              </datalist>

              {/* Question Form */}
              {showQuestionForm && (
                <div className="card border-0 shadow-sm mb-3">
                  <div className="card-header bg-white fw-bold">
                    <i className="bi bi-pencil-square me-2"></i>{editingQuestion ? "Edit Question #" + editingQuestion.id : "New Question"}
                  </div>
                  <div className="card-body">
                    <form onSubmit={(e) => { e.preventDefault(); createQuestion(); }}>
                      <div className="row g-3">
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Test</label>
                          <select className="form-select form-select-sm" value={questionForm.examId} onChange={(e) => setQuestionForm({ ...questionForm, examId: e.target.value })} disabled={!!editingQuestion}>
                            {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Question Type</label>
                          <select className="form-select form-select-sm" value={questionForm.questionType} onChange={(e) => {
                            const qt = e.target.value as "single_choice" | "multiple_response" | "true_false";
                            const defaults: Record<string, Partial<typeof questionForm>> = {
                              true_false: { optionA: "True", optionB: "False", optionC: "", optionD: "", correctAnswer: "A" },
                              multiple_response: { correctAnswer: "A,B" },
                              single_choice: { correctAnswer: "A" }
                            };
                            setQuestionForm({ ...questionForm, questionType: qt, ...defaults[qt] });
                          }}>
                            <option value="single_choice">Single Choice (A/B/C/D)</option>
                            <option value="multiple_response">Multiple Response</option>
                            <option value="true_false">True / False</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Status</label>
                          <select className="form-select form-select-sm" value={questionForm.status} onChange={(e) => setQuestionForm({ ...questionForm, status: e.target.value as "draft" | "published" })}>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">ECO Domain</label>
                          <input className="form-control form-control-sm" list="eco-domain-suggestions" placeholder="e.g. People, Process" value={questionForm.ecoDomain} onChange={(e) => setQuestionForm({ ...questionForm, ecoDomain: e.target.value })} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">Performance Domain</label>
                          <input className="form-control form-control-sm" list="perf-domain-suggestions" placeholder="e.g. Team, Planning, Delivery" value={questionForm.performanceDomain} onChange={(e) => setQuestionForm({ ...questionForm, performanceDomain: e.target.value })} />
                        </div>
                        <div className="col-12">
                          <label className="form-label small fw-semibold">Question Prompt</label>
                          <textarea className="form-control form-control-sm" rows={3} placeholder="Enter the question text..." value={questionForm.prompt} onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })} required />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Option A</label>
                          <input className="form-control form-control-sm" value={questionForm.optionA} onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })} required />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Option B</label>
                          <input className="form-control form-control-sm" value={questionForm.optionB} onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })} required />
                        </div>
                        {questionForm.questionType !== "true_false" && (
                          <>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold">Option C</label>
                              <input className="form-control form-control-sm" value={questionForm.optionC} onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })} required />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold">Option D</label>
                              <input className="form-control form-control-sm" value={questionForm.optionD} onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })} required />
                            </div>
                          </>
                        )}
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Correct Answer{questionForm.questionType === "multiple_response" ? " (comma-separated)" : ""}</label>
                          {questionForm.questionType === "multiple_response" ? (
                            <input className="form-control form-control-sm" placeholder="e.g. A,C" value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value.toUpperCase() })} required />
                          ) : (
                            <select className="form-select form-select-sm" value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              {questionForm.questionType !== "true_false" && <option value="C">C</option>}
                              {questionForm.questionType !== "true_false" && <option value="D">D</option>}
                            </select>
                          )}
                        </div>
                        <div className="col-md-9">
                          <label className="form-label small fw-semibold">Explanation</label>
                          <input className="form-control form-control-sm" placeholder="Brief explanation shown after answer" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} required />
                        </div>
                        <div className="col-12">
                          <label className="form-label small fw-semibold">Image <span className="text-muted fw-normal">(optional — for questions with charts, diagrams, etc.)</span></label>
                          <div className="d-flex gap-2 align-items-start">
                            <div className="flex-grow-1">
                              <input className="form-control form-control-sm" placeholder="Image URL or upload a file →" value={questionForm.imageUrl} onChange={(e) => setQuestionForm({ ...questionForm, imageUrl: e.target.value })} />
                            </div>
                            <label className="btn btn-sm btn-outline-secondary flex-shrink-0 mb-0" style={{ cursor: "pointer" }}>
                              <i className="bi bi-upload me-1"></i>Upload
                              <input type="file" accept="image/*" className="d-none" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) { setStatusMessage("File too large (max 5 MB)"); return; }
                                const fd = new FormData();
                                fd.append("image", file);
                                try {
                                  const uploadUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/admin/questions/upload-image";
                                  const res = await fetch(uploadUrl, { method: "POST", body: fd, credentials: "include" });
                                  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as { message?: string }).message ?? "Upload failed"); }
                                  const data = await res.json() as { imageUrl: string };
                                  setQuestionForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
                                  setStatusMessage("Image uploaded!");
                                } catch (err) {
                                  setStatusMessage(err instanceof Error ? err.message : "Upload failed");
                                }
                                e.target.value = "";
                              }} />
                            </label>
                            <button type="button" className="btn btn-sm btn-outline-primary flex-shrink-0" onClick={openAssetPicker}>
                              <i className="bi bi-folder2-open me-1"></i>Choose Existing
                            </button>
                          </div>
                          {questionForm.imageUrl && (
                            <div className="mt-2"><img src={questionForm.imageUrl} alt="Preview" style={{ maxHeight: 120, border: "1px solid #dee2e6", borderRadius: 4 }} /></div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 d-flex gap-2">
                        <button type="submit" className="btn btn-sm text-white" style={{ background: PRIMARY }} disabled={busy}>
                          {busy ? "Saving..." : editingQuestion ? "Update Question" : "Create Question"}
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); setShowAssetPicker(false); }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <AdminModal
                open={showAssetPicker}
                title="Choose Existing Image"
                onClose={() => setShowAssetPicker(false)}
                size="lg"
                footer={<button type="button" className="btn btn-light" onClick={() => setShowAssetPicker(false)}>Close</button>}
              >
                <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                  <div className="text-muted small">Pick an image from the uploaded questions assets folder.</div>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void loadAssets()} disabled={busy}>
                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                  </button>
                </div>
                {busy && assets.length === 0 ? (
                  <div className="text-center text-muted py-4">Loading assets...</div>
                ) : assets.length === 0 ? (
                  <div className="text-center text-muted py-4">No existing images found in the asset folder.</div>
                ) : (
                  <div className="row g-3">
                    {assets.map((asset) => (
                      <div key={asset.filename} className="col-6 col-md-4 col-lg-3">
                        <button type="button" className="card h-100 border-0 shadow-sm text-start w-100 p-0" onClick={() => chooseAsset(asset)} style={{ overflow: "hidden" }}>
                          <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: 120 }}>
                            <img src={asset.url} alt={asset.filename} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                          </div>
                          <div className="card-body p-2">
                            <div className="small fw-semibold text-truncate" title={asset.filename}>{asset.filename}</div>
                            <div className="small text-muted text-truncate" title={asset.url}>{asset.url}</div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </AdminModal>

              {/* CSV Upload */}
              {showCsvUpload && (
                <div className="card border-0 shadow-sm mb-3">
                  <div className="card-header bg-white fw-bold">
                    <i className="bi bi-filetype-csv me-2"></i>Upload Questions via CSV
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Target Test</label>
                        <select className="form-select form-select-sm" value={csvUploadExamId} onChange={(e) => setCsvUploadExamId(e.target.value)}>
                          {exams.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.slug})</option>)}
                        </select>
                      </div>
                      <div className="col-md-8">
                        <label className="form-label small fw-semibold">CSV File</label>
                        <input type="file" className="form-control form-control-sm" accept=".csv" onChange={handleCsvFile} />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Or paste CSV text</label>
                        <textarea className="form-control form-control-sm font-monospace" rows={4} placeholder={"prompt,optionA,optionB,optionC,optionD,correctAnswer,explanation,ecoDomain,performanceDomain,imageUrl\n\"What is...\",\"A\",\"B\",\"C\",\"D\",\"B\",\"Because...\",\"Process\",\"Team\",\"https://example.com/chart.png\""} value={csvUploadText} onChange={(e) => setCsvUploadText(e.target.value)} />
                      </div>
                      <div className="col-12">
                        <div className="alert alert-info py-2 small mb-0">
                          <strong>Required columns:</strong> prompt, optionA, optionB, optionC, optionD, correctAnswer<br />
                          <strong>Optional columns:</strong> explanation, ecoDomain, performanceDomain, imageUrl, status, difficulty<br />
                          <strong>Images:</strong> Upload images in the <strong>Assets</strong> tab first, then use just the filename (e.g. <code>risk-matrix.png</code>) in the <code>imageUrl</code> column — the system resolves the path automatically.
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 d-flex gap-2">
                      <button className="btn btn-sm text-white" style={{ background: PRIMARY }} onClick={uploadQuestionsCsv} disabled={busy || !csvUploadText.trim()}>
                        {busy ? "Uploading..." : "Upload & Import"}
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => { setShowCsvUpload(false); setCsvUploadText(""); }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <span className="fw-bold">
                    <i className="bi bi-question-circle me-2"></i>Question Bank
                  </span>
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-sm text-white" style={{ background: PRIMARY }} onClick={() => { setEditingQuestion(null); setQuestionForm({ examId: exams[0]?.id?.toString() ?? "1", questionType: "single_choice", prompt: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "", ecoDomain: "", performanceDomain: "", imageUrl: "", status: "published" }); setShowQuestionForm(true); }} disabled={busy}>
                      <i className="bi bi-plus-lg me-1"></i>New
                    </button>
                    <button className="btn btn-sm btn-outline-success" onClick={() => { setCsvUploadExamId(exams[0]?.id?.toString() ?? "1"); setShowCsvUpload(true); }} disabled={busy}>
                      <i className="bi bi-upload me-1"></i>CSV
                    </button>
                    <button className="btn btn-sm btn-outline-info" onClick={async () => {
                      try {
                        const params = new URLSearchParams();
                        if (questionFilterExamId !== "all") params.set("examId", String(questionFilterExamId));
                        const res = await fetch(`/api/admin/questions/export${params.toString() ? "?" + params.toString() : ""}`, { credentials: "include" });
                        if (!res.ok) throw new Error("Export failed");
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        const disposition = res.headers.get("Content-Disposition") ?? "";
                        const match = disposition.match(/filename=([^;]+)/);
                        a.download = match ? match[1] : "questions-export.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                        setStatusMessage("CSV exported.");
                      } catch (err) { setStatusMessage(err instanceof Error ? err.message : "Export failed"); }
                    }} disabled={busy || questions.length === 0}>
                      <i className="bi bi-download me-1"></i>Export
                    </button>
                  </div>
                </div>
                {/* Cascading Filter Bar */}
                <div className="card-body border-bottom py-2">
                  <div className="row g-2 align-items-center">
                    <div className="col-md-3">
                      <select className="form-select form-select-sm" value={questionFilterProductId === "all" ? "all" : String(questionFilterProductId)} onChange={(e) => { const v = e.target.value === "all" ? "all" as const : Number(e.target.value); setQuestionFilterProductId(v); setQuestionFilterExamId("all"); if (v === "all") { loadQuestions(); } else { const firstExam = exams.find((ex) => ex.productId === v); if (firstExam) { loadQuestions(firstExam.id); } else { loadQuestions(); } } }}>
                        <option value="all">All Exams</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select className="form-select form-select-sm" value={questionFilterExamId === "all" ? "all" : String(questionFilterExamId)} onChange={(e) => { const v = e.target.value === "all" ? "all" as const : Number(e.target.value); setQuestionFilterExamId(v); if (v === "all") { loadQuestions(); } else { loadQuestions(v); } }}>
                        <option value="all">All Tests</option>
                        {exams.filter((e) => questionFilterProductId === "all" || e.productId === questionFilterProductId).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select className="form-select form-select-sm" value={questionFilterStatus} onChange={(e) => setQuestionFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select className="form-select form-select-sm" value={questionFilterEco} onChange={(e) => setQuestionFilterEco(e.target.value)}>
                        <option value="all">All ECO</option>
                        {[...new Set(questions.map((q) => q.ecoDomain).filter(Boolean))].sort().map((d) => <option key={d} value={d!}>{d}</option>)}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select className="form-select form-select-sm" value={questionFilterPerf} onChange={(e) => setQuestionFilterPerf(e.target.value)}>
                        <option value="all">All Perf.</option>
                        {[...new Set(questions.map((q) => q.performanceDomain).filter(Boolean))].sort().map((d) => <option key={d} value={d!}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                {questions.length === 0 ? (
                  <div className="card-body text-center py-5 text-muted">
                    <i className="bi bi-question-circle fs-1 d-block mb-2"></i>
                    Select a test or load all questions.
                  </div>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: 500, overflowY: "auto" }}>
                    <table className="table table-hover align-middle mb-0 small">
                      <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                        <tr>
                          <th>ID</th>
                          <th>Test</th>
                          <th>Type</th>
                          <th>Prompt</th>
                          <th>Answer</th>
                          <th>Status</th>
                          <th>ECO Domain</th>
                          <th>Perf. Domain</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions
                          .filter((q) => questionFilterStatus === "all" || q.status === questionFilterStatus)
                          .filter((q) => questionFilterEco === "all" || q.ecoDomain === questionFilterEco)
                          .filter((q) => questionFilterPerf === "all" || q.performanceDomain === questionFilterPerf)
                          .map((q) => (
                          <tr key={q.id}>
                            <td>{q.id}</td>
                            <td className="small text-muted">{exams.find((e) => e.id === q.examId)?.title ?? q.examSlug}</td>
                            <td><span className={`badge ${q.questionType === "multiple_response" ? "bg-info" : q.questionType === "true_false" ? "bg-warning text-dark" : "bg-secondary"}`}>{q.questionType === "single_choice" ? "SC" : q.questionType === "multiple_response" ? "MR" : "T/F"}</span></td>
                            <td className="text-truncate" style={{ maxWidth: 250 }}>{q.imageUrl ? <i className="bi bi-image text-info me-1" title={q.imageUrl}></i> : null}{q.prompt}</td>
                            <td><span className="badge" style={{ background: "#333", color: "#fff" }}>{q.correctAnswer}</span></td>
                            <td><span className={`badge ${q.status === "published" ? "bg-success" : "bg-secondary"}`}>{q.status ?? "published"}</span></td>
                            <td className="small text-muted">{q.ecoDomain ?? "\u2014"}</td>
                            <td className="small text-muted">{q.performanceDomain ?? "\u2014"}</td>
                            <td className="text-end d-flex gap-1 justify-content-end">
                              <button className="btn btn-outline-primary btn-sm" onClick={() => { setEditingQuestion(q); setQuestionForm({ examId: String(q.examId), questionType: q.questionType ?? "single_choice", prompt: q.prompt, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD, correctAnswer: q.correctAnswer, explanation: q.explanation, ecoDomain: q.ecoDomain ?? "", performanceDomain: q.performanceDomain ?? "", imageUrl: q.imageUrl ?? "", status: q.status ?? "published" }); setShowQuestionForm(true); }} disabled={busy}>
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button className="btn btn-outline-danger btn-sm" onClick={() => deleteQuestion(q.id)} disabled={busy}>
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ========== ASSETS ========== */}
          {activeTab === "assets" && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span className="fw-bold">
                  <i className="bi bi-images me-2"></i>Asset Management
                </span>
                <div className="d-flex gap-2">
                  <label className="btn btn-sm btn-outline-primary mb-0" style={{ cursor: "pointer" }}>
                    <i className="bi bi-upload me-1"></i>Upload Images
                    <input type="file" accept="image/*" multiple className="d-none" onChange={(e) => { if (e.target.files?.length) uploadAssets(e.target.files); e.target.value = ""; }} />
                  </label>
                  <button className="btn btn-sm btn-outline-secondary" onClick={loadAssets} disabled={busy}>
                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                  </button>
                </div>
              </div>

              {/* Drop zone */}
              <div
                className="card-body py-4 text-center border-bottom"
                style={{ background: "#fafbfc", cursor: "pointer" }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = "#eef3ff"; }}
                onDragLeave={(e) => { e.currentTarget.style.background = "#fafbfc"; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.background = "#fafbfc"; if (e.dataTransfer.files.length) uploadAssets(e.dataTransfer.files); }}
                onClick={() => { const el = document.getElementById("asset-file-input"); el?.click(); }}
              >
                <input id="asset-file-input" type="file" accept="image/*" multiple className="d-none" onChange={(e) => { if (e.target.files?.length) uploadAssets(e.target.files); e.target.value = ""; }} />
                <i className="bi bi-cloud-arrow-up fs-2 text-muted d-block mb-1"></i>
                <span className="text-muted small">Drag &amp; drop images here, or click to browse</span>
              </div>

              {/* How-to info */}
              <div className="card-body border-bottom py-3">
                <div className="alert alert-info py-2 small mb-0">
                  <strong><i className="bi bi-lightbulb me-1"></i>How to add images to CSV questions:</strong>
                  <ol className="mb-0 mt-1 ps-3">
                    <li>Upload your images here first (drag &amp; drop or click &quot;Upload Images&quot;)</li>
                    <li>In your CSV, add an <code>imageUrl</code> column</li>
                    <li>Use just the <strong>filename</strong> (e.g. <code>risk-matrix.png</code>) — the system will resolve the full path automatically</li>
                  </ol>
                </div>
              </div>

              {assets.length === 0 ? (
                <div className="card-body text-center py-5 text-muted">
                  <i className="bi bi-images fs-1 d-block mb-2"></i>
                  No assets uploaded yet.
                  <button className="btn btn-link" onClick={loadAssets} disabled={busy}>Load assets</button>
                </div>
              ) : (
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">{assets.length} image{assets.length !== 1 ? "s" : ""} &middot; {assets.filter((a) => a.inUse).length} in use</span>
                  </div>
                  <div className="row g-3">
                    {assets.map((a) => (
                      <div key={a.filename} className="col-sm-6 col-md-4 col-lg-3">
                        <div className="card h-100 border">
                          <div style={{ height: 140, overflow: "hidden", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.url} alt={a.filename} style={{ maxWidth: "100%", maxHeight: 140, objectFit: "contain" }} />
                          </div>
                          <div className="card-body p-2">
                            <div className="text-truncate small fw-semibold" title={a.filename}>{a.filename}</div>
                            <div className="d-flex justify-content-between align-items-center mt-1">
                              <span className="text-muted" style={{ fontSize: "0.7rem" }}>{(a.size / 1024).toFixed(1)} KB</span>
                              {a.inUse && <span className="badge bg-success" style={{ fontSize: "0.65rem" }}>In use</span>}
                            </div>
                            <div className="input-group input-group-sm mt-2">
                              <input type="text" className="form-control form-control-sm" value={a.filename} readOnly style={{ fontSize: "0.7rem" }} title={a.url} />
                              <button className="btn btn-outline-secondary btn-sm" title="Copy filename for CSV" onClick={() => { navigator.clipboard.writeText(a.filename); setStatusMessage("Filename copied — paste into your CSV imageUrl column."); }}>
                                <i className="bi bi-clipboard"></i>
                              </button>
                            </div>
                          </div>
                          <div className="card-footer p-2 text-end bg-transparent border-top-0">
                            <button className="btn btn-outline-danger btn-sm" onClick={() => deleteAsset(a.filename)} disabled={busy || a.inUse} title={a.inUse ? "In use — remove from question first" : "Delete"}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== USERS ========== */}
          {activeTab === "users" && (
            <UserManager
              users={users}
              busy={busy}
              searchQuery=""
              onSearchChange={() => {}}
              roleFilter=""
              onRoleFilterChange={() => {}}
              statusFilter=""
              onStatusFilterChange={() => {}}
              onAddUser={() => setShowAddUser(true)}
              onBulkImport={() => setShowBulkImport(true)}
              onRoleChange={handleRoleChange}
              onToggleStatus={toggleUserStatus}
            />
          )}

          {/* ========== ORDERS ========== */}
          {activeTab === "orders" && (
            <OrderManager
              orders={orders.filter((o) => {
                const q = orderSearchQuery.toLowerCase().trim();
                const matchesSearch = q === "" || String(o.id).includes(q) || o.userEmail.toLowerCase().includes(q) || o.productTitle.toLowerCase().includes(q);
                const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
                return matchesSearch && matchesStatus;
              })}
              busy={busy}
              onReconcile={reconcileOrder}
              searchQuery={orderSearchQuery}
              onSearchChange={setOrderSearchQuery}
              statusFilter={orderStatusFilter}
              onStatusFilterChange={setOrderStatusFilter}
            />
          )}

          {/* ========== VOUCHERS ========== */}
          {activeTab === "vouchers" && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span className="fw-bold">
                  <i className="bi bi-ticket-perforated me-2"></i>Voucher
                  Management
                </span>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setShowVoucherBulk(true)}
                    disabled={busy}
                  >
                    <i className="bi bi-collection me-1"></i>Bulk Issue
                  </button>
                  <button
                    className="btn btn-sm text-white"
                    style={{ background: PRIMARY }}
                    onClick={() => setShowVoucherCreate(true)}
                    disabled={busy}
                  >
                    <i className="bi bi-plus-lg me-1"></i>New Voucher
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Limit</th>
                      <th>Per User</th>
                      <th>Validity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <code className="fw-bold">{v.code}</code>
                        </td>
                        <td className="text-capitalize">{v.type}</td>
                        <td>
                          {v.amount}
                          {v.type === "percentage" ? "%" : " USD"}
                        </td>
                        <td>{v.usageLimit ?? "\u221E"}</td>
                        <td>{v.perUserLimit}</td>
                        <td className="small text-muted">
                          {v.validFrom
                            ? new Date(v.validFrom).toLocaleDateString()
                            : "now"}{" "}
                          \u2013{" "}
                          {v.validUntil
                            ? new Date(v.validUntil).toLocaleDateString()
                            : "\u221E"}
                        </td>
                        <td>
                          <StatusBadge status={v.status} />
                        </td>
                      </tr>
                    ))}
                    {vouchers.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center text-muted py-4"
                        >
                          No vouchers
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== ECO DOMAINS ========== */}
          {activeTab === "eco-domains" && (
            <DomainManagementTab
              title="ECO Domains"
              icon="bi-diagram-3"
              description="Examination Content Outline domains. Each product can have different ECO domains."
              domains={ecoDomains}
              products={products}
              busy={busy}
              onRefresh={async () => {
                const data = await browserApiFetch<AdminDomain[]>("/api/admin/eco-domains");
                setEcoDomains(data);
              }}
              onCreate={async (productId, name, description) => {
                setBusy(true);
                try {
                  const created = await browserApiFetch<AdminDomain>("/api/admin/eco-domains", {
                    method: "POST",
                    body: JSON.stringify({ productId, name, description: description || null }),
                  });
                  setEcoDomains((d) => [...d, created]);
                  setStatusMessage(`ECO Domain "${created.name}" created.`);
                  await refreshAuditLogs();
                } catch (error) {
                  setStatusMessage(error instanceof Error ? error.message : "Failed to create ECO Domain.");
                } finally {
                  setBusy(false);
                }
              }}
              onUpdate={async (id, name, description) => {
                setBusy(true);
                try {
                  await browserApiFetch<AdminDomain>("/api/admin/eco-domains/" + id, {
                    method: "PATCH",
                    body: JSON.stringify({ name, description: description || null }),
                  });
                  setEcoDomains((d) => d.map((x) => x.id === id ? { ...x, name, description: description || null } : x));
                  setStatusMessage(`ECO Domain updated.`);
                  await refreshAuditLogs();
                } catch (error) {
                  setStatusMessage(error instanceof Error ? error.message : "Failed to update ECO Domain.");
                } finally {
                  setBusy(false);
                }
              }}
              onDelete={async (id) => {
                setBusy(true);
                try {
                  await browserApiFetch<void>("/api/admin/eco-domains/" + id, { method: "DELETE" });
                  setEcoDomains((d) => d.filter((x) => x.id !== id));
                  setStatusMessage("ECO Domain deleted.");
                  await refreshAuditLogs();
                } catch (error) {
                  setStatusMessage(error instanceof Error ? error.message : "Failed to delete ECO Domain.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          {/* ========== PERFORMANCE DOMAINS ========== */}
          {activeTab === "perf-domains" && (
            <DomainManagementTab
              title="Performance Domains"
              icon="bi-bullseye"
              description="Knowledge/process area domains. Each product can have different Performance domains."
              domains={perfDomains}
              products={products}
              busy={busy}
              onRefresh={async () => {
                const data = await browserApiFetch<AdminDomain[]>("/api/admin/performance-domains");
                setPerfDomains(data);
              }}
              onCreate={async (productId, name, description) => {
                setBusy(true);
                try {
                  const created = await browserApiFetch<AdminDomain>("/api/admin/performance-domains", {
                    method: "POST",
                    body: JSON.stringify({ productId, name, description: description || null }),
                  });
                  setPerfDomains((d) => [...d, created]);
                  setStatusMessage(`Performance Domain "${created.name}" created.`);
                  await refreshAuditLogs();
                } catch (error) {
                  setStatusMessage(error instanceof Error ? error.message : "Failed to create Performance Domain.");
                } finally {
                  setBusy(false);
                }
              }}
              onUpdate={async (id, name, description) => {
                setBusy(true);
                try {
                  await browserApiFetch<AdminDomain>("/api/admin/performance-domains/" + id, {
                    method: "PATCH",
                    body: JSON.stringify({ name, description: description || null }),
                  });
                  setPerfDomains((d) => d.map((x) => x.id === id ? { ...x, name, description: description || null } : x));
                  setStatusMessage(`Performance Domain updated.`);
                  await refreshAuditLogs();
                } catch (error) {
                  setStatusMessage(error instanceof Error ? error.message : "Failed to update Performance Domain.");
                } finally {
                  setBusy(false);
                }
              }}
              onDelete={async (id) => {
                setBusy(true);
                try {
                  await browserApiFetch<void>("/api/admin/performance-domains/" + id, { method: "DELETE" });
                  setPerfDomains((d) => d.filter((x) => x.id !== id));
                  setStatusMessage("Performance Domain deleted.");
                  await refreshAuditLogs();
                } catch (error) {
                  setStatusMessage(error instanceof Error ? error.message : "Failed to delete Performance Domain.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          {/* ========== REPORTS ========== */}
          {activeTab === "reports" && (
            <div className="row g-4">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-currency-dollar me-2"></i>Sales Report
                      (Last 30 Days)
                    </span>
                    <a className="btn btn-outline-secondary btn-sm" href="/api/admin/reports/sales?days=30&format=csv" target="_blank" rel="noreferrer">
                      <i className="bi bi-download me-1"></i>CSV
                    </a>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 small">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Product</th>
                          <th>Orders</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesReport.map((r, i) => (
                          <tr key={r.date + "-" + r.productTitle + "-" + i}>
                            <td>{r.date}</td>
                            <td>{r.productTitle}</td>
                            <td>{r.orderCount}</td>
                            <td className="fw-semibold">USD {r.revenue}</td>
                          </tr>
                        ))}
                        {salesReport.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center text-muted py-3"
                            >
                              No sales data
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-bookmark-check me-2"></i>Enrollments
                    </span>
                    <a className="btn btn-outline-secondary btn-sm" href="/api/admin/reports/enrollments?format=csv" target="_blank" rel="noreferrer">
                      <i className="bi bi-download me-1"></i>CSV
                    </a>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 small">
                      <thead className="table-light">
                        <tr>
                          <th>Product</th>
                          <th>Total</th>
                          <th>Active</th>
                          <th>Expired</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollmentReport.map((r) => (
                          <tr key={r.productSlug}>
                            <td>{r.productTitle}</td>
                            <td>{r.totalEnrollments}</td>
                            <td>
                              <span className="badge bg-success bg-opacity-10 text-success">
                                {r.activeCount}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-secondary bg-opacity-10 text-secondary">
                                {r.expiredCount}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {enrollmentReport.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center text-muted py-3"
                            >
                              No data
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-pencil-square me-2"></i>Attempt
                      Analysis
                    </span>
                    <a className="btn btn-outline-secondary btn-sm" href="/api/admin/reports/attempts?format=csv" target="_blank" rel="noreferrer">
                      <i className="bi bi-download me-1"></i>CSV
                    </a>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 small">
                      <thead className="table-light">
                        <tr>
                          <th>Exam</th>
                          <th>Total</th>
                          <th>Completed</th>
                          <th>Avg Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attemptReport.map((r) => (
                          <tr key={r.examSlug}>
                            <td>{r.examTitle}</td>
                            <td>{r.totalAttempts}</td>
                            <td>{r.completedAttempts}</td>
                            <td className="fw-semibold">
                              {r.avgScore ?? "\u2014"}%
                            </td>
                          </tr>
                        ))}
                        {attemptReport.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center text-muted py-3"
                            >
                              No data
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== SETTINGS ========== */}
          {activeTab === "settings" && (
            <div className="row justify-content-center">
              <div className="col-xl-8">
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
                      <label htmlFor="maintenanceMessage" className="form-label fw-semibold">Maintenance Message</label>
                      <textarea
                        id="maintenanceMessage"
                        className="form-control"
                        rows={3}
                        value={maintenanceMessage}
                        onChange={(event) => setMaintenanceMessage(event.target.value)}
                      />
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
              </div>
            </div>
          )}

          {/* ========== SESSIONS ========== */}
          {activeTab === "sessions" && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <span className="fw-bold">
                  <i className="bi bi-wifi me-2"></i>Active Sessions
                </span>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={refreshSessions}
                  disabled={busy}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>User</th>
                      <th>Device</th>
                      <th>IP</th>
                      <th>Expires</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 15).map((s) => (
                      <tr
                        key={s.id}
                        className={s.revokedAt ? "table-secondary" : ""}
                      >
                        <td>{s.email}</td>
                        <td
                          className="text-truncate"
                          style={{ maxWidth: 200 }}
                        >
                          {s.userAgent ?? "Unknown"}
                        </td>
                        <td>
                          <code className="small">
                            {s.ipAddress ?? "\u2014"}
                          </code>
                        </td>
                        <td className="text-muted">
                          {s.expiresAt
                            ? new Date(s.expiresAt).toLocaleString()
                            : "\u2014"}
                        </td>
                        <td className="text-end">
                          <button
                            className={
                              "btn btn-sm " +
                              (s.revokedAt
                                ? "btn-outline-secondary"
                                : "btn-outline-danger")
                            }
                            onClick={() => revokeSession(s.id)}
                            disabled={busy || Boolean(s.revokedAt)}
                          >
                            {s.revokedAt ? "Revoked" : "Revoke"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center text-muted py-4"
                        >
                          No sessions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== POLICIES ========== */}
          {activeTab === "policies" && (
            <div className="row justify-content-center">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white fw-bold">
                    <i className="bi bi-shield-lock me-2"></i>Session Policy
                    Controls
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label
                        htmlFor="policyUserId"
                        className="form-label fw-semibold"
                      >
                        User ID
                      </label>
                      <input
                        id="policyUserId"
                        className="form-control"
                        value={policyUserId}
                        onChange={(e) => setPolicyUserId(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label
                        htmlFor="maxSessions"
                        className="form-label fw-semibold"
                      >
                        Max Active Sessions{" "}
                        <small className="text-muted fw-normal">
                          (blank = default)
                        </small>
                      </label>
                      <input
                        id="maxSessions"
                        className="form-control"
                        value={maxSessionsInput}
                        onChange={(e) => setMaxSessionsInput(e.target.value)}
                        placeholder="e.g. 3"
                      />
                    </div>
                    <div className="mb-3">
                      <label
                        htmlFor="ttlDays"
                        className="form-label fw-semibold"
                      >
                        Refresh TTL Days{" "}
                        <small className="text-muted fw-normal">
                          (blank = default)
                        </small>
                      </label>
                      <input
                        id="ttlDays"
                        className="form-control"
                        value={ttlDaysInput}
                        onChange={(e) => setTtlDaysInput(e.target.value)}
                        placeholder="e.g. 14"
                      />
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={loadPolicy}
                        disabled={busy}
                      >
                        <i className="bi bi-arrow-down-circle me-1"></i>Load
                        Policy
                      </button>
                      <button
                        className="btn text-white"
                        style={{ background: PRIMARY }}
                        onClick={savePolicy}
                        disabled={busy}
                      >
                        <i className="bi bi-check-lg me-1"></i>Save Policy
                      </button>
                    </div>
                    {policy && (
                      <div className="alert alert-info mt-3 mb-0 small">
                        <i className="bi bi-info-circle me-1"></i>
                        Current: maxSessions{" "}
                        <strong>
                          {policy.maxSessions ?? "default"}
                        </strong>
                        , refreshTtlDays{" "}
                        <strong>
                          {policy.refreshTtlDays ?? "default"}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== AUDIT ========== */}
          {activeTab === "audit" && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <span className="fw-bold">
                  <i className="bi bi-list-check me-2"></i>Audit Log
                </span>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={refreshAuditLogs}
                  disabled={busy}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Entity</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.slice(0, 30).map((log) => (
                      <tr key={log.id}>
                        <td className="text-muted">{log.id}</td>
                        <td>
                          <code className="bg-light px-2 py-1 rounded">
                            {log.actionKey}
                          </code>
                        </td>
                        <td>
                          {log.actorEmail ?? (
                            <span className="text-muted fst-italic">
                              system
                            </span>
                          )}
                        </td>
                        <td>
                          {log.entityType}:
                          <strong>{log.entityId}</strong>
                        </td>
                        <td className="text-muted">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString()
                            : "\u2014"}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center text-muted py-4"
                        >
                          No logs yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== REFERRALS ========== */}
          {activeTab === "referrals" && (
            <div className="d-flex flex-column gap-3">
              <div className="row g-3">
                {[
                  { label: "Total Codes", value: referralData?.summary.totalCodes ?? 0, icon: "bi-share" },
                  { label: "Redemptions", value: referralData?.summary.totalRedemptions ?? 0, icon: "bi-check2-circle" },
                  { label: "Total Reward (USD)", value: (referralData?.summary.totalRewardMyr ?? 0).toFixed(2), icon: "bi-cash-coin" },
                  { label: "Pending", value: referralData?.summary.pending ?? 0, icon: "bi-hourglass-split" },
                ].map((s) => (
                  <div key={s.label} className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body d-flex align-items-center gap-3">
                        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: "rgba(232,121,43,0.1)", color: PRIMARY }}>
                          <i className={`bi ${s.icon}`} style={{ fontSize: 20 }}></i>
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: 22 }}>{s.value}</div>
                          <small className="text-muted">{s.label}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-people me-2"></i>Top Referrers</span>
                  <button className="btn btn-sm btn-outline-secondary" onClick={refreshReferrals} disabled={busy}>
                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                  </button>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr><th>Code</th><th>User</th><th>Redemptions</th><th>Reward (USD)</th><th>Created</th></tr>
                    </thead>
                    <tbody>
                      {(referralData?.codes ?? []).map((c) => (
                        <tr key={c.id}>
                          <td><code>{c.code}</code></td>
                          <td>{c.userFullName} <small className="text-muted d-block">{c.userEmail}</small></td>
                          <td>{c.totalRedemptions}</td>
                          <td>{Number(c.totalRewardMyr).toFixed(2)}</td>
                          <td className="text-muted">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                      {(referralData?.codes ?? []).length === 0 && (
                        <tr><td colSpan={5} className="text-center text-muted py-4">No referral codes yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white fw-bold">
                  <i className="bi bi-arrow-left-right me-2"></i>Recent Redemptions
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr><th>ID</th><th>Referrer</th><th>Referee</th><th>Order</th><th>Status</th><th>Date</th><th></th></tr>
                    </thead>
                    <tbody>
                      {(referralData?.redemptions ?? []).map((r) => (
                        <tr key={r.id}>
                          <td>#{r.id}</td>
                          <td className="text-muted">{r.referrerEmail}</td>
                          <td>{r.refereeEmail}</td>
                          <td>{r.orderId ? `#${r.orderId}` : "—"}</td>
                          <td><StatusBadge status={r.status} /></td>
                          <td className="text-muted">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</td>
                          <td>
                            {r.status === "pending" && (
                              <button className="btn btn-sm btn-outline-success" onClick={() => rewardReferral(r.id)} disabled={busy}>
                                Reward
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(referralData?.redemptions ?? []).length === 0 && (
                        <tr><td colSpan={7} className="text-center text-muted py-4">No redemptions yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========== ORGANIZATIONS ========== */}
          {activeTab === "organizations" && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <span className="fw-bold">
                  <i className="bi bi-building me-2"></i>Organizations (B2B)
                </span>
                <button
                  className="btn btn-sm text-white"
                  style={{ background: PRIMARY }}
                  onClick={() => setShowOrgCreate(true)}
                  disabled={busy}
                >
                  <i className="bi bi-plus-lg me-1"></i>New Organization
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr><th>Slug</th><th>Name</th><th>Contact</th><th>Members</th><th>Orders</th><th>Discount</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {organizations.map((o) => (
                      <tr key={o.id}>
                        <td><code>{o.slug}</code></td>
                        <td className="fw-semibold">{o.name}</td>
                        <td className="text-muted">{o.contactEmail ?? "—"}</td>
                        <td>{o.memberCount}</td>
                        <td>{o.orderCount}</td>
                        <td>{o.seatTierOverride !== null ? `${o.seatTierOverride}% (override)` : "tiered"}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openOrgDetail(o.id)}
                          >
                            <i className="bi bi-people me-1"></i>Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                    {organizations.length === 0 && (
                      <tr><td colSpan={8} className="text-center text-muted py-4">No organizations yet. Tiered discount: 5–9 seats=10%, 10–19=15%, 20+=20%</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== Phase 2 Modals ========== */}
      <AdminModal
        open={showAddUser}
        title="Add New User"
        onClose={() => setShowAddUser(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowAddUser(false)} disabled={busy}>Cancel</button>
            <button className="btn text-white" style={{ background: PRIMARY }} onClick={submitAddUser} disabled={busy || !addUserForm.email || !addUserForm.fullName}>
              {busy ? "Creating…" : "Create User"}
            </button>
          </>
        }
      >
        <div className="d-flex flex-column gap-2">
          <div>
            <label className="form-label small fw-semibold">Email *</label>
            <input className="form-control form-control-sm" type="email" value={addUserForm.email} onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })} />
          </div>
          <div>
            <label className="form-label small fw-semibold">Full Name *</label>
            <input className="form-control form-control-sm" value={addUserForm.fullName} onChange={(e) => setAddUserForm({ ...addUserForm, fullName: e.target.value })} />
          </div>
          <div>
            <label className="form-label small fw-semibold">Password (leave blank to auto-generate)</label>
            <input className="form-control form-control-sm" type="text" value={addUserForm.password} onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })} />
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small fw-semibold">Role</label>
              <select className="form-select form-select-sm" value={addUserForm.role} onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}>
                <option value="student">student</option>
                <option value="content_admin">content_admin</option>
                <option value="support_admin">support_admin</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Access Days (optional)</label>
              <input className="form-control form-control-sm" type="number" value={addUserForm.accessDays} onChange={(e) => setAddUserForm({ ...addUserForm, accessDays: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label small fw-semibold">Enroll into Product (slug, optional)</label>
            <input className="form-control form-control-sm" value={addUserForm.productSlug} onChange={(e) => setAddUserForm({ ...addUserForm, productSlug: e.target.value })} placeholder="pmp-mock-01" />
          </div>
          <div className="form-check mt-2">
            <input id="addUserSendEmail" className="form-check-input" type="checkbox" checked={addUserForm.sendWelcomeEmail} onChange={(e) => setAddUserForm({ ...addUserForm, sendWelcomeEmail: e.target.checked })} />
            <label htmlFor="addUserSendEmail" className="form-check-label small">Send welcome email with credentials</label>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={showBulkImport}
        title="Bulk Import Students"
        onClose={() => { setShowBulkImport(false); setBulkPreview(null); setBulkCsv(""); }}
        size="lg"
        footer={
          <>
            <button className="btn btn-light" onClick={() => { setShowBulkImport(false); setBulkPreview(null); setBulkCsv(""); }} disabled={busy}>Close</button>
            <button className="btn btn-outline-primary" onClick={previewBulkUsers} disabled={busy || bulkCsv.trim().length < 10}>
              <i className="bi bi-eye me-1"></i>Preview
            </button>
            <button className="btn text-white" style={{ background: PRIMARY }} onClick={applyBulkUsers} disabled={busy || !bulkPreview || bulkPreview.newUsers === 0}>
              <i className="bi bi-check-lg me-1"></i>Apply Import
            </button>
          </>
        }
      >
        <p className="small text-muted mb-2">CSV columns: <code>email, fullName, password?, productSlug?, accessDays?</code> (header aliases supported)</p>
        <textarea
          className="form-control font-monospace mb-2"
          rows={8}
          style={{ fontSize: 12 }}
          placeholder="email,fullName,productSlug&#10;jane@example.com,Jane Doe,pmp-mock-01"
          value={bulkCsv}
          onChange={(e) => { setBulkCsv(e.target.value); setBulkPreview(null); }}
        />
        <div className="form-check mb-2">
          <input id="bulkSendEmail" className="form-check-input" type="checkbox" checked={bulkSendEmail} onChange={(e) => setBulkSendEmail(e.target.checked)} />
          <label htmlFor="bulkSendEmail" className="form-check-label small">Send welcome email to each new user</label>
        </div>
        {bulkPreview && (
          <div className="border rounded p-3 bg-light small">
            <div className="d-flex gap-3 flex-wrap">
              <div><strong>Total:</strong> {bulkPreview.total}</div>
              <div className="text-success"><strong>New:</strong> {bulkPreview.newUsers}</div>
              <div className="text-warning"><strong>Duplicates:</strong> {bulkPreview.duplicates}</div>
              <div><strong>With enrollment:</strong> {bulkPreview.withEnrollment}</div>
            </div>
            {bulkPreview.errors.length > 0 && (
              <div className="mt-2">
                <strong className="text-danger">Errors ({bulkPreview.errors.length}):</strong>
                <ul className="mb-0 small">
                  {bulkPreview.errors.slice(0, 10).map((e, i) => (<li key={i}>Row {e.row}: {e.reason}</li>))}
                </ul>
              </div>
            )}
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={showVoucherCreate}
        title="Create Voucher"
        onClose={() => setShowVoucherCreate(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowVoucherCreate(false)} disabled={busy}>Cancel</button>
            <button className="btn text-white" style={{ background: PRIMARY }} onClick={submitVoucherCreate} disabled={busy || !voucherForm.code}>
              {busy ? "Creating…" : "Create"}
            </button>
          </>
        }
      >
        <div className="d-flex flex-column gap-2">
          <div className="row g-2">
            <div className="col-8">
              <label className="form-label small fw-semibold">Code *</label>
              <input className="form-control form-control-sm font-monospace" value={voucherForm.code} onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value })} placeholder="WELCOME10" />
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Type</label>
              <select className="form-select form-select-sm" value={voucherForm.type} onChange={(e) => setVoucherForm({ ...voucherForm, type: e.target.value as "fixed" | "percentage" })}>
                <option value="fixed">Fixed (USD)</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
          </div>
          <div className="row g-2">
            <div className="col-4">
              <label className="form-label small fw-semibold">Amount</label>
              <input className="form-control form-control-sm" type="number" value={voucherForm.amount} onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })} />
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Min Order</label>
              <input className="form-control form-control-sm" type="number" value={voucherForm.minOrder} onChange={(e) => setVoucherForm({ ...voucherForm, minOrder: e.target.value })} />
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Per User Limit</label>
              <input className="form-control form-control-sm" type="number" value={voucherForm.perUserLimit} onChange={(e) => setVoucherForm({ ...voucherForm, perUserLimit: e.target.value })} />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small fw-semibold">Total Usage Limit (blank = unlimited)</label>
              <input className="form-control form-control-sm" type="number" value={voucherForm.usageLimit} onChange={(e) => setVoucherForm({ ...voucherForm, usageLimit: e.target.value })} />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Valid Until (blank = no expiry)</label>
              <input className="form-control form-control-sm" type="date" value={voucherForm.validUntil} onChange={(e) => setVoucherForm({ ...voucherForm, validUntil: e.target.value })} />
            </div>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={showVoucherBulk}
        title="Bulk Issue Voucher Codes"
        onClose={() => setShowVoucherBulk(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowVoucherBulk(false)} disabled={busy}>Cancel</button>
            <button className="btn text-white" style={{ background: PRIMARY }} onClick={submitVoucherBulk} disabled={busy || !voucherBulk.prefix || !voucherBulk.count}>
              {busy ? "Issuing…" : "Issue Codes"}
            </button>
          </>
        }
      >
        <div className="d-flex flex-column gap-2">
          <p className="small text-muted mb-1">Generates N unique codes formatted as <code>PREFIX-XXXXXX</code> (each single-use).</p>
          <div className="row g-2">
            <div className="col-8">
              <label className="form-label small fw-semibold">Prefix</label>
              <input className="form-control form-control-sm font-monospace" value={voucherBulk.prefix} onChange={(e) => setVoucherBulk({ ...voucherBulk, prefix: e.target.value })} />
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Count (max 500)</label>
              <input className="form-control form-control-sm" type="number" max={500} value={voucherBulk.count} onChange={(e) => setVoucherBulk({ ...voucherBulk, count: e.target.value })} />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-4">
              <label className="form-label small fw-semibold">Type</label>
              <select className="form-select form-select-sm" value={voucherBulk.type} onChange={(e) => setVoucherBulk({ ...voucherBulk, type: e.target.value as "fixed" | "percentage" })}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed (USD)</option>
              </select>
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Amount</label>
              <input className="form-control form-control-sm" type="number" value={voucherBulk.amount} onChange={(e) => setVoucherBulk({ ...voucherBulk, amount: e.target.value })} />
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Valid Until</label>
              <input className="form-control form-control-sm" type="date" value={voucherBulk.validUntil} onChange={(e) => setVoucherBulk({ ...voucherBulk, validUntil: e.target.value })} />
            </div>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={showOrgCreate}
        title="Create Organization"
        onClose={() => setShowOrgCreate(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowOrgCreate(false)} disabled={busy}>Cancel</button>
            <button className="btn text-white" style={{ background: PRIMARY }} onClick={submitOrgCreate} disabled={busy || !orgForm.slug || !orgForm.name}>
              {busy ? "Creating…" : "Create"}
            </button>
          </>
        }
      >
        <div className="d-flex flex-column gap-2">
          <div className="row g-2">
            <div className="col-5">
              <label className="form-label small fw-semibold">Slug *</label>
              <input className="form-control form-control-sm font-monospace" value={orgForm.slug} onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })} placeholder="acme-corp" />
            </div>
            <div className="col-7">
              <label className="form-label small fw-semibold">Name *</label>
              <input className="form-control form-control-sm" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} placeholder="Acme Corporation" />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small fw-semibold">Contact Email</label>
              <input className="form-control form-control-sm" type="email" value={orgForm.contactEmail} onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })} />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Contact Phone</label>
              <input className="form-control form-control-sm" value={orgForm.contactPhone} onChange={(e) => setOrgForm({ ...orgForm, contactPhone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label small fw-semibold">Discount Override % (blank = use tiered: 5–9=10, 10–19=15, 20+=20)</label>
            <input className="form-control form-control-sm" type="number" value={orgForm.seatTierOverride} onChange={(e) => setOrgForm({ ...orgForm, seatTierOverride: e.target.value })} placeholder="e.g., 25" />
          </div>
          <div>
            <label className="form-label small fw-semibold">Notes</label>
            <textarea className="form-control form-control-sm" rows={2} value={orgForm.notes} onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })} />
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={!!orgDetail || orgDetailLoading}
        title={orgDetail ? `Manage: ${orgDetail.name}` : "Loading…"}
        onClose={() => { setOrgDetail(null); setOrgDetailLoading(false); }}
        size="lg"
        footer={
          <button className="btn btn-light" onClick={() => { setOrgDetail(null); setOrgDetailLoading(false); }} disabled={busy}>
            Close
          </button>
        }
      >
        {orgDetailLoading && (
          <div className="text-center py-4 text-muted">
            <span className="spinner-border spinner-border-sm me-2" /> Loading…
          </div>
        )}
        {orgDetail && (
          <div className="d-flex flex-column gap-4">
            <div>
              <h6 className="fw-bold mb-2">
                <i className="bi bi-people me-2"></i>Members ({orgDetail.members.length})
              </h6>
              <div className="table-responsive" style={{ maxHeight: 240, overflowY: "auto" }}>
                <table className="table table-sm align-middle small mb-0">
                  <thead className="table-light">
                    <tr><th>Email</th><th>Name</th><th>Role</th><th>Joined</th><th></th></tr>
                  </thead>
                  <tbody>
                    {orgDetail.members.map((m) => (
                      <tr key={m.id}>
                        <td className="font-monospace">{m.email}</td>
                        <td>{m.fullName}</td>
                        <td><span className="badge bg-light text-dark border">{m.role}</span></td>
                        <td className="text-muted">{new Date(m.joinedAt).toLocaleDateString()}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeOrgMember(m.id)}
                            disabled={busy}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orgDetail.members.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-muted py-3">No members yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex gap-2 mt-2 align-items-end">
                <div className="flex-grow-1">
                  <label className="form-label small fw-semibold mb-1">Add member by email</label>
                  <input
                    className="form-control form-control-sm"
                    type="email"
                    placeholder="user@example.com"
                    value={orgMemberForm.userEmail}
                    onChange={(e) => setOrgMemberForm({ ...orgMemberForm, userEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label small fw-semibold mb-1">Role</label>
                  <select
                    className="form-select form-select-sm"
                    value={orgMemberForm.role}
                    onChange={(e) => setOrgMemberForm({ ...orgMemberForm, role: e.target.value as "owner" | "admin" | "member" })}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                    <option value="owner">owner</option>
                  </select>
                </div>
                <button
                  className="btn btn-sm text-white"
                  style={{ background: PRIMARY }}
                  onClick={addOrgMember}
                  disabled={busy || !orgMemberForm.userEmail.trim()}
                >
                  <i className="bi bi-plus-lg me-1"></i>Add
                </button>
              </div>
            </div>

            <hr className="my-1" />

            <div>
              <h6 className="fw-bold mb-2">
                <i className="bi bi-cart-plus me-2"></i>Create Seat Order
              </h6>
              <p className="small text-muted mb-3">
                Bulk-enroll selected members at the org discount. Discount auto-applies based on seat count
                {orgDetail.seatTierOverride !== null ? ` (override: ${orgDetail.seatTierOverride}%)` : " (tiered: 5+=10%, 10+=15%, 20+=20%)"}.
              </p>

              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Product</label>
                  <select
                    className="form-select form-select-sm"
                    value={orgSeatOrder.productSlug}
                    onChange={(e) => setOrgSeatOrder({ ...orgSeatOrder, productSlug: e.target.value })}
                  >
                    <option value="">— Select a product —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.title} — USD {p.priceUsd}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Payment</label>
                  <select
                    className="form-select form-select-sm"
                    value={orgSeatOrder.paymentStatus}
                    onChange={(e) => setOrgSeatOrder({ ...orgSeatOrder, paymentStatus: e.target.value as "paid" | "pending" })}
                  >
                    <option value="paid">paid (enroll now)</option>
                    <option value="pending">pending (await payment)</option>
                  </select>
                </div>
                <div className="col-md-3 d-flex align-items-end">
                  <button
                    className="btn btn-sm btn-outline-secondary w-100"
                    onClick={previewSeatQuote}
                    disabled={orgSeatOrder.selectedMemberIds.length === 0}
                  >
                    Refresh quote
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label small fw-semibold d-flex justify-content-between">
                  <span>Select members to enroll ({orgSeatOrder.selectedMemberIds.length} selected)</span>
                  <span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 me-2"
                      style={{ fontSize: 12 }}
                      onClick={() => {
                        setOrgSeatOrder({ ...orgSeatOrder, selectedMemberIds: orgDetail.members.map((m) => m.userId) });
                        setOrgQuotePreview(null);
                      }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      style={{ fontSize: 12 }}
                      onClick={() => { setOrgSeatOrder({ ...orgSeatOrder, selectedMemberIds: [] }); setOrgQuotePreview(null); }}
                    >
                      Clear
                    </button>
                  </span>
                </label>
                <div
                  className="border rounded p-2"
                  style={{ maxHeight: 160, overflowY: "auto", background: "#FAFAFA" }}
                >
                  {orgDetail.members.length === 0 ? (
                    <div className="text-center text-muted small py-2">Add members first.</div>
                  ) : (
                    orgDetail.members.map((m) => {
                      const checked = orgSeatOrder.selectedMemberIds.includes(m.userId);
                      return (
                        <div key={m.id} className="form-check small">
                          <input
                            id={`org-seat-m-${m.id}`}
                            type="checkbox"
                            className="form-check-input"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? orgSeatOrder.selectedMemberIds.filter((id) => id !== m.userId)
                                : [...orgSeatOrder.selectedMemberIds, m.userId];
                              setOrgSeatOrder({ ...orgSeatOrder, selectedMemberIds: next });
                              setOrgQuotePreview(null);
                            }}
                          />
                          <label htmlFor={`org-seat-m-${m.id}`} className="form-check-label">
                            <span className="font-monospace">{m.email}</span>
                            <span className="text-muted ms-2">— {m.fullName}</span>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {orgQuotePreview && (
                <div className="alert alert-info small mt-3 mb-0 py-2">
                  <strong>{orgQuotePreview.seats}</strong> seat(s) → <strong>{orgQuotePreview.discountPercent}%</strong> off ({orgQuotePreview.source})
                </div>
              )}

              <div className="d-flex justify-content-end mt-3">
                <button
                  className="btn btn-sm text-white"
                  style={{ background: PRIMARY }}
                  onClick={submitSeatOrder}
                  disabled={busy || !orgSeatOrder.productSlug || orgSeatOrder.selectedMemberIds.length === 0}
                >
                  <i className="bi bi-cart-plus me-1"></i>
                  {busy ? "Creating…" : `Create order (${orgSeatOrder.selectedMemberIds.length} seat${orgSeatOrder.selectedMemberIds.length === 1 ? "" : "s"})`}
                </button>
              </div>
            </div>

            {orgDetail.orders.length > 0 && (
              <>
                <hr className="my-1" />
                <div>
                  <h6 className="fw-bold mb-2"><i className="bi bi-receipt me-2"></i>Recent Seat Orders</h6>
                  <div className="table-responsive" style={{ maxHeight: 200, overflowY: "auto" }}>
                    <table className="table table-sm small mb-0">
                      <thead className="table-light">
                        <tr><th>Order</th><th>Seats</th><th>Discount</th><th>Total</th><th>Status</th><th>Date</th></tr>
                      </thead>
                      <tbody>
                        {orgDetail.orders.map((o) => (
                          <tr key={o.id}>
                            <td>#{o.orderId}</td>
                            <td>{o.seatCount}</td>
                            <td>{o.discountPercent}%</td>
                            <td>USD {Number(o.totalAmount).toFixed(2)}</td>
                            <td><StatusBadge status={o.orderStatus} /></td>
                            <td className="text-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </AdminModal>

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant ?? "primary"}
        onCancel={() => setConfirmState({ ...confirmState, open: false })}
        onConfirm={async () => {
          await confirmState.onConfirm();
          setConfirmState({ ...confirmState, open: false });
        }}
        busy={busy}
      />
    </div>
  );
}
