import puppeteer from "puppeteer";

const baseUrl = process.env.AUDIT_BASE_URL ?? "https://www.pmexampro.com";
const defaultRoutes = [
  "/",
  "/products/pmp-exam-preparation-practice-pack",
  "/exams/final-pmp-practice-exam-q1-2023",
  "/login",
  "/faq",
  "/tutorial",
  "/privacy",
  "/terms",
  "/me/dashboard",
  "/me/performance",
];
const routes = process.env.AUDIT_ROUTES?.split(",").map((route) => route.trim()).filter(Boolean) ?? defaultRoutes;

const browser = await puppeteer.launch({ headless: true });
const findings = [];

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 320, height: 700, isMobile: true, hasTouch: true },
]) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "failed"}`));

  for (const route of routes) {
    pageErrors.length = 0;
    consoleErrors.length = 0;
    failedRequests.length = 0;
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle2", timeout: 45_000 });
    const data = await page.evaluate(() => {
      const body = document.body;
      const brokenImages = [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src);
      return {
        title: document.title,
        h1: [...document.querySelectorAll("h1")].map((node) => node.textContent?.trim()),
        buttons: [...document.querySelectorAll("button, a")]
          .map((node) => node.textContent?.replace(/\s+/g, " ").trim())
          .filter(Boolean),
        text: body.innerText.replace(/\s+/g, " ").slice(0, 4000),
        overflowX: Math.max(document.documentElement.scrollWidth, body.scrollWidth) - window.innerWidth,
        brokenImages,
      };
    });
    findings.push({ viewport: viewport.name, route, status: response?.status(), finalUrl: page.url(), ...data, pageErrors: [...pageErrors], consoleErrors: [...consoleErrors], failedRequests: [...failedRequests] });

    if (route === "/login") {
      await page.locator("::-p-text(Register)").click();
      const registration = await page.evaluate(() => ({
        labels: [...document.querySelectorAll("label")].map((node) => node.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean),
        inputs: [...document.querySelectorAll("input, select")].map((node) => ({ id: node.id, type: node.getAttribute("type"), required: node.hasAttribute("required") })),
        text: document.body.innerText.replace(/\s+/g, " ").slice(0, 2500),
      }));
      findings.push({ viewport: viewport.name, route: "/login#register", registration });
    }

    if (route.startsWith("/exams/")) {
      const startTrial = await page.$("::-p-text(Start Trial)");
      if (startTrial) {
        await startTrial.click();
        await new Promise((resolve) => setTimeout(resolve, 250));
        const trial = await page.evaluate(() => ({
          questionLabel: document.querySelector(".eyebrow")?.textContent?.trim(),
          controls: [...document.querySelectorAll("button")].map((node) => node.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean),
          optionCount: document.querySelectorAll(".optionButton").length,
          asksForMultipleAnswers: /choose\s+(two|three|all)/i.test(document.querySelector(".examQuestionText")?.textContent ?? ""),
          radioCount: document.querySelectorAll('.optionButton[role="radio"], .optionButton input[type="radio"]').length,
          checkboxCount: document.querySelectorAll('.optionButton[role="checkbox"], .optionButton input[type="checkbox"]').length,
          overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        }));
        findings.push({ viewport: viewport.name, route: `${route}#trial`, trial });
        if (viewport.name === "desktop") {
          for (let index = 0; index < 5; index += 1) {
            const option = await page.$(".optionButton:not([disabled])");
            if (!option) break;
            await option.click();
            await new Promise((resolve) => setTimeout(resolve, 650));
          }
          async function clickButton(label) {
            return page.evaluate((buttonLabel) => {
              const button = [...document.querySelectorAll("button")].find((node) => node.textContent?.trim() === buttonLabel);
              button?.click();
              return Boolean(button);
            }, label);
          }
          await clickButton("End test");
          await clickButton("End test / Submit");
          await clickButton("Submit test");
          await new Promise((resolve) => setTimeout(resolve, 250));
          findings.push({
            viewport: viewport.name,
            route: `${route}#trial-complete`,
            trialComplete: await page.evaluate(() => ({
              heading: [...document.querySelectorAll("h2")].map((node) => node.textContent?.replace(/\s+/g, " ").trim()).find((text) => text?.startsWith("You scored")),
              hasCompletionLabel: document.body.innerText.includes("FREE TRIAL COMPLETE"),
              hasRetry: [...document.querySelectorAll("button")].some((node) => node.textContent?.trim() === "Try Again"),
              hasFullAccessLink: [...document.querySelectorAll("a")].some((node) => node.textContent?.trim() === "Get Full Access"),
              finalUrl: window.location.href,
            })),
          });
        }
      }
    }
  }

  if (viewport.name === "mobile") {
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle2", timeout: 45_000 });
    const toggle = await page.$('button[aria-label="Toggle main menu"]');
    if (toggle) await toggle.click();
    findings.push({
      viewport: viewport.name,
      route: "/#mobile-nav",
      navigation: await page.evaluate(() => ({
        expanded: document.querySelector('button[aria-label="Toggle main menu"]')?.getAttribute("aria-expanded"),
        links: [...document.querySelectorAll("nav a")].map((node) => node.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean),
      })),
    });
  }
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), baseUrl, findings }, null, 2));
