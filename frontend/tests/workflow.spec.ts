import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

async function manual(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start from scratch" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s start with your story." }),
  ).toBeVisible();
  await page
    .getByLabel("Education or qualification")
    .fill("Diploma in Business");
  await page.getByRole("button", { name: /Microsoft Excel/ }).click();
  await page
    .getByRole("button", { name: "Data & patterns", exact: true })
    .click();
}
async function skills(page: Page) {
  await page.getByRole("button", { name: "Continue to skills" }).click();
  await expect(
    page.getByRole("heading", { name: "A little confidence check." }),
  ).toBeVisible();
}
async function results(page: Page) {
  await page.getByRole("button", { name: "Find my career matches" }).click();
  await expect(
    page.getByRole("heading", {
      name: /You have possibilities.|Your goal. Your way forward./,
    }),
  ).toBeVisible();
}
test("landing uses the reference palette and clear entry paths", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts with you." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upload CV · quick start" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Start from scratch" }),
  ).toBeEnabled();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(page.locator(".landing-main")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await page.screenshot({
    path: resolve(process.cwd(), "../.local/screenshots/landing-new.png"),
    fullPage: true,
  });
});
test("manual flow preserves ratings, highlights matches and exports a roadmap", async ({
  page,
}) => {
  await manual(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(process.cwd(), "../.local/screenshots/profile-new.png"),
    fullPage: true,
  });
  await skills(page);
  await page.screenshot({
    path: resolve(process.cwd(), "../.local/screenshots/skills-new.png"),
    fullPage: true,
  });
  const slider = page.getByRole("slider", {
    name: "Microsoft Excel skill level",
  });
  await slider.fill("4");
  await page.getByRole("button", { name: "Back to background" }).click();
  await expect(page.getByLabel("Education or qualification")).toHaveValue(
    "Diploma in Business",
  );
  await skills(page);
  await expect(slider).toHaveValue("4");
  await results(page);
  await expect(page.locator(".featured-career")).toBeVisible();
  expect(await page.locator(".career-match-card").count()).toBeLessThanOrEqual(
    4,
  );
  await page.screenshot({
    path: resolve(process.cwd(), "../.local/screenshots/careers-new.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Build my learning roadmap" }).click();
  await expect(
    page.getByRole("heading", { name: "Your learning roadmap", exact: true }),
  ).toBeVisible();
  expect(await page.locator(".roadmap-step").count()).toBeGreaterThan(1);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JPG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/roadmap\.jpg$/);
  await download.saveAs(
    resolve(process.cwd(), "../.local/screenshots/roadmap-export.jpg"),
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".roadmap-print")).toBeVisible();
  await page.pdf({
    path: resolve(process.cwd(), "../.local/screenshots/roadmap-export.pdf"),
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.screenshot({
    path: resolve(process.cwd(), "../.local/screenshots/roadmap-new.png"),
    fullPage: true,
  });
});
test("CV quick start prefills fields and lets the user complete missing details", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Upload your CV", { exact: true }).setInputFiles({
    name: "synthetic-cv.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "Country: Singapore\nAge: 25\nGender: Female\n3 years of experience\nEducation\nDiploma in Computing\nProjects\nPython, HTML and Excel project",
    ),
  });
  await expect(page.getByLabel("Education or qualification")).toHaveValue(
    "Diploma in Computing",
  );
  await expect(page.getByLabel("Country of origin")).toHaveValue("SG");
  await expect(page.getByLabel("Age (optional)")).toHaveValue("25");
  await expect(page.getByLabel("Gender (optional)")).toHaveValue("Woman");
  await expect(page.getByRole("button", { name: /HTML/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Already working", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await skills(page);
  await expect(
    page.getByRole("slider", { name: "HTML skill level" }),
  ).toBeVisible();
});
test("a ten-question quiz returns to the sliders with server-owned evidence", async ({
  page,
}) => {
  await manual(page);
  await skills(page);
  await page
    .getByRole("slider", { name: "Microsoft Excel skill level" })
    .fill("5");
  await page.getByRole("button", { name: /Check my level/ }).click();
  await expect(
    page.getByRole("heading", { name: "Microsoft Excel skill check" }),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(process.cwd(), "../.local/screenshots/quiz-new.png"),
    fullPage: true,
  });
  for (let i = 0; i < 10; i++) {
    await expect(page.locator(".quiz-progress")).toContainText(
      `Question ${i + 1} of 10`,
    );
    await page.getByRole("radio").first().check();
    await page
      .getByRole("button", {
        name: i === 9 ? "Finish & update my level" : "Next question",
        exact: true,
      })
      .click();
  }
  await expect(page.getByRole("status")).toContainText("of 10 correct");
  const slider = page.getByRole("slider", {
    name: "Microsoft Excel skill level",
  });
  await expect(slider).toBeDisabled();
  expect(Number(await slider.inputValue())).toBeLessThanOrEqual(2);
  await expect(page.getByRole("button", { name: /Retake quiz/ })).toBeVisible();
  await results(page);
});
test("target mode keeps the target featured while alternatives can be explored", async ({
  page,
}) => {
  await manual(page);
  await page.getByRole("button", { name: /I have a career in mind/ }).click();
  await page.getByLabel("Your target career").selectOption("data-analyst");
  await page
    .getByRole("button", { name: "Already working", exact: true })
    .click();
  await page
    .getByLabel("Current occupation", { exact: true })
    .selectOption("admin-assistant");
  const impactRequest = page.waitForResponse(
    (response) =>
      response.url().endsWith("/ai-impact/analyze") &&
      response.request().method() === "POST",
  );
  await skills(page);
  await results(page);
  expect((await (await impactRequest).json()).occupation_id).toBe(
    "data-analyst",
  );
  await expect(page.locator(".featured-career h2")).toHaveText("Data Analyst");
  await page.locator(".career-match-card").first().click();
  await expect(page.locator(".featured-career h2")).toHaveText("Data Analyst");
  await expect(page.locator(".career-match-card").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
test("individual openings show platform badges and filters update discovery", async ({
  page,
}) => {
  await page.route("**/api/v1/jobs/search", async (route) => {
    const query = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobs: [
          {
            id: "test-one",
            title: `${query.level === "internship" ? "Intern " : ""}${query.career}`,
            company: "Example Test Employer",
            location: query.location,
            posted_label: "1 day ago",
            salary: "RM 3,000 – RM 4,000",
            description:
              "Synthetic browser test listing, supplied by the test route only.",
            sources: [
              {
                platform: "linkedin",
                name: "LinkedIn",
                url: "https://www.linkedin.com/jobs/view/123456/",
              },
              {
                platform: "jobstreet",
                name: "JobStreet",
                url: "https://my.jobstreet.com/job/123456",
              },
            ],
          },
          {
            id: "test-two",
            title: `Junior ${query.career}`,
            company: "Another Test Employer",
            location: query.location,
            sources: [
              {
                platform: "indeed",
                name: "Indeed",
                url: "https://malaysia.indeed.com/viewjob?jk=test123",
              },
            ],
          },
        ],
        providers: [
          { name: "LinkedIn", status: "available", message: "Test response" },
        ],
        fetched_at: "2026-10-23T00:00:00Z",
        cached: false,
        notice: "Synthetic test response.",
      }),
    });
  });
  await page.goto("/jobs?career=Data%20Analyst");
  await expect(page.locator(".job-listing")).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Data Analyst", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".job-listing")
      .first()
      .getByRole("link", { name: "LinkedIn", exact: true }),
  ).toHaveAttribute("href", "https://www.linkedin.com/jobs/view/123456/");
  await expect(page.locator(".job-listing").first()).toContainText("Found on");
  await page.getByRole("button", { name: /^Indeed/ }).click();
  await expect(page.locator(".job-listing")).toHaveCount(1);
  await expect(page.locator(".job-listing")).toContainText(
    "Another Test Employer",
  );
  await page.getByRole("button", { name: /All platforms/ }).click();
  const search = page.waitForRequest(
    (request) =>
      request.url().endsWith("/jobs/search") &&
      request.postDataJSON().level === "internship",
  );
  await page.getByRole("button", { name: "Internship", exact: true }).click();
  await page.getByLabel("Location", { exact: true }).fill("Kuala Lumpur");
  expect((await search).postDataJSON().location).toBe("Kuala Lumpur");
  await expect(
    page.getByRole("heading", { name: "Intern Data Analyst", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(process.cwd(), "../.local/screenshots/job-listings-test.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: resolve(
      process.cwd(),
      "../.local/screenshots/job-listings-mobile-test.png",
    ),
    fullPage: true,
  });
});
test("unavailable job sources show an honest retry state", async ({ page }) => {
  await page.route("**/api/v1/jobs/search", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobs: [],
        providers: [
          {
            name: "LinkedIn",
            status: "unavailable",
            message: "LinkedIn is temporarily unavailable.",
          },
        ],
        fetched_at: "2026-10-23T00:00:00Z",
        cached: false,
      }),
    }),
  );
  await page.goto("/jobs?career=Data%20Analyst");
  await expect(
    page.getByRole("heading", {
      name: "Job sources are temporarily unavailable.",
    }),
  ).toBeVisible();
  await expect(page.locator(".job-listing")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Search again", exact: true }),
  ).toBeEnabled();
});
test("mobile flow reflows without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start from scratch" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: resolve(
      process.cwd(),
      "../.local/screenshots/landing-mobile-new.png",
    ),
    fullPage: true,
  });
  await manual(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await skills(page);
  await results(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: resolve(
      process.cwd(),
      "../.local/screenshots/careers-mobile-new.png",
    ),
    fullPage: true,
  });
});
test("an API error preserves input and supports resubmission", async ({
  page,
}) => {
  await manual(page);
  await page.route("**/api/v1/profiles/analyze", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Temporary test outage" }),
    }),
  );
  await page.getByRole("button", { name: "Continue to skills" }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "Temporary test outage",
  );
  await expect(page.getByLabel("Education or qualification")).toHaveValue(
    "Diploma in Business",
  );
  await page.unroute("**/api/v1/profiles/analyze");
  await skills(page);
});
