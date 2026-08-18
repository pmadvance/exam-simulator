import { apiUrl } from "../../lib/api";

type MaintenanceStatus = {
  maintenanceMode: boolean;
  pageType?: "maintenance" | "launch";
  message: string;
  teaserLabel?: string;
  teaserHeadline?: string;
  teaserItems?: string[];
  countdownEnabled?: boolean;
  countdownEndsAt?: string | null;
};

const fallbackTeaserItems = [
  "Exam-style practice|Train with timed simulators built around certification exam workflows.",
  "Progress insights|Spot weak domains and know where to focus before exam day.",
  "Simple access|Choose a practice set, checkout, and start studying without friction.",
];

async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  try {
    const response = await fetch(`${apiUrl}/api/maintenance-status`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load maintenance status");
    return (await response.json()) as MaintenanceStatus;
  } catch {
    return {
      maintenanceMode: true,
      message: "A focused PMP and CAPM exam prep platform is almost ready. We are preparing guided practice, timed exam simulation, and progress insights for certification candidates.",
      pageType: "launch",
      teaserLabel: "Launching Soon",
      teaserHeadline: "PM Exam Pro launches soon.",
      teaserItems: fallbackTeaserItems,
      countdownEnabled: false,
      countdownEndsAt: null,
    };
  }
}

function splitTeaserItem(item: string) {
  const [title, ...descriptionParts] = item.split("|");
  return {
    title: title?.trim() || "Coming soon",
    description: descriptionParts.join("|").trim(),
  };
}

function getCountdownParts(status: MaintenanceStatus) {
  if (!status.countdownEnabled || !status.countdownEndsAt) return null;
  const target = new Date(status.countdownEndsAt).getTime();
  if (!Number.isFinite(target)) return null;
  const remainingMs = target - Date.now();
  if (remainingMs <= 0) return null;

  const totalMinutes = Math.floor(remainingMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}

export default async function MaintenancePage() {
  const status = await getMaintenanceStatus();
  const message = status.message || "A focused PMP and CAPM exam prep platform is almost ready. We are preparing guided practice, timed exam simulation, and progress insights for certification candidates.";
  const pageType = status.pageType === "launch" ? "launch" : "maintenance";
  const label = status.teaserLabel || "Launching Soon";
  const headline = status.teaserHeadline || "PM Exam Pro launches soon.";
  const rawTeaserItems = Array.isArray(status.teaserItems) && status.teaserItems.length > 0
    ? status.teaserItems
    : fallbackTeaserItems;
  const teaserItems = rawTeaserItems.map(splitTeaserItem);
  const countdown = getCountdownParts(status);

  if (pageType === "maintenance") {
    return (
      <main className="min-vh-100 d-flex align-items-center" style={{ background: "#f8fafc" }}>
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-7 col-xl-6">
              <div className="border bg-white shadow-sm p-4 p-md-5 text-center" style={{ borderRadius: 8 }}>
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-4" style={{ width: 64, height: 64, background: "#fff3eb", color: "#E8792B" }}>
                  <i className="bi bi-tools h3 mb-0"></i>
                </div>
                <div className="text-primary fw-semibold mb-3">Maintenance in progress</div>
                <h1 className="h2 fw-bold mb-3">We will be back soon.</h1>
                <p className="lead text-secondary mb-0">{message}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-vh-100 d-flex align-items-center" style={{ background: "#f8fafc" }}>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-xl-7">
            <div className="border bg-white shadow-sm p-4 p-md-5" style={{ borderRadius: 8 }}>
              <div className="d-flex align-items-center gap-2 text-primary fw-semibold mb-3">
                <i className="bi bi-stars"></i>
                {label}
              </div>
              <h1 className="display-6 fw-bold mb-3">{headline}</h1>
              <p className="lead text-secondary mb-4">{message}</p>
              {countdown && (
                <div className="row g-2 mb-4">
                  {[
                    ["Days", countdown.days],
                    ["Hours", countdown.hours],
                    ["Minutes", countdown.minutes],
                  ].map(([unit, value]) => (
                    <div className="col-4" key={unit}>
                      <div className="border rounded text-center py-3">
                        <div className="h3 fw-bold mb-0">{value}</div>
                        <div className="text-muted small">{unit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="row g-3 mb-4">
                {teaserItems.map((item) => (
                  <div className="col-md-4" key={`${item.title}-${item.description}`}>
                    <div className="border rounded p-3 h-100">
                      <div className="fw-semibold mb-1">{item.title}</div>
                      {item.description && <div className="text-muted small">{item.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
