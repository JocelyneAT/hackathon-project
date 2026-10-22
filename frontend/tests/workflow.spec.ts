import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";
import type { Roadmap } from "../src/lib/types";

const screenshot = (name: string) =>
  resolve(process.cwd(), "../.local/screenshots", name);

async function openWorkspace(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little about you" }),
  ).toBeVisible();
}

async function demoProfile(page: Page, profile = "starter") {
  await page.getByLabel("Load example profile").selectOption(profile);
  await page
    .getByRole("button", { name: "Review my skills", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your skills", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "See career options" }),
  ).toBeEnabled();
}

async function continueToCareers(page: Page) {
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/careers/recommend") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "See career options" }).click();
  expect((await response).ok()).toBeTruthy();
  await expect(
    page.getByRole("heading", { name: "Jobs to consider" }),
  ).toBeVisible();
  await expectNoCharts(page);
}

async function openDetails(page: Page, label: string) {
  const summary = page.locator("summary").filter({ hasText: label });
  const details = summary.locator("..");
  if ((await details.getAttribute("open")) === null) await summary.click();
  await expect(details).toHaveAttribute("open", "");
}

async function expectFixedRoadmap(page: Page, roadmap: Roadmap) {
  await expect(
    page.getByRole("checkbox", { name: "Include in my plan" }),
  ).toHaveCount(0);
  await expect(page.locator(".milestone h2")).toHaveText([
    ...roadmap.milestones.map(
      (milestone, index) => `Step ${index + 1}: Learn ${milestone.skill_name}`,
    ),
    `Step ${roadmap.milestones.length + 1}: Make your final project`,
  ]);
  await expect(page.locator(".milestone-index")).toHaveText(
    Array.from({ length: roadmap.milestones.length + 1 }, (_, index) =>
      String(index + 1),
    ),
  );
  await expect(page.locator(".start-step")).toHaveCount(1);
  await expect(page.locator(".start-step")).toBeVisible();
  await expect(page.locator(".start-step")).toContainText("Start here");
  await expect(page.locator(".final-project")).toContainText(
    roadmap.portfolio_project,
  );
  for (const [index, milestone] of roadmap.milestones.entries()) {
    const step = page.locator(".milestone:not(.final-project)").nth(index);
    await expect(step).toContainText(milestone.exercise);
    await expect(step).toContainText(milestone.verification);
    await expect(step.locator(".resource")).toHaveCount(
      milestone.resources.length,
    );
    await expect(step.locator(".resource:visible")).toHaveCount(
      Math.min(milestone.resources.length, 1),
    );
    if (milestone.resources[0]) {
      await expect(step.locator(".resource:visible")).toContainText(
        milestone.resources[0].title,
      );
      await expect(step.locator(".resource:visible")).toHaveAttribute(
        "href",
        milestone.resources[0].url,
      );
    } else {
      await expect(step).toContainText("Use the practice task below");
    }
  }
  await expect(
    page.getByRole("button", { name: "See job options", exact: true }),
  ).toBeEnabled();
}

async function expectNoCharts(page: Page) {
  await expect(
    page.locator('.recharts-wrapper, .chart, [role="meter"]'),
  ).toHaveCount(0);
}

async function expectNoPageOverflow(page: Page) {
  const extraWidth = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(
    extraWidth,
    "The document should not scroll horizontally; wide tables scroll inside their panels",
  ).toBeLessThanOrEqual(1);
}

test("target career, adaptive SQL evidence, scenarios, sequential learning and whole-plan employer projection", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openWorkspace(page);
  await page.screenshot({
    path: screenshot("personal-desktop.png"),
    fullPage: false,
  });
  await demoProfile(page, "target");
  await expect(
    page.getByRole("button", { name: "Check SQL", exact: true }),
  ).toBeHidden();
  await openDetails(page, "Review skills and take a check (optional)");
  await page.getByRole("button", { name: "Check SQL", exact: true }).click();
  // These authored question answers exercise real grading and the correct-answer adaptive branch.
  for (const answer of ["WHERE", "50", "1"]) {
    await page
      .locator(".assessment")
      .getByRole("radio", { name: answer, exact: true })
      .check();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Skill check complete" }),
  ).toBeVisible();
  await expect(page.locator(".assessment")).toContainText("Estimated level 2");
  await continueToCareers(page);
  await expect(page.locator(".career-detail .role-title")).toHaveText(
    "Data Analyst",
  );
  await expect(
    page.getByRole("row").filter({ hasText: "SQL" }).first(),
  ).toContainText("Estimated");

  await expect(
    page.getByRole("button", { name: "Faster change", exact: true }),
  ).toBeHidden();
  await openDetails(page, "AI changes and other details");
  const scenarioResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/scenarios/compare") &&
      r.request().postDataJSON()?.scenario === "accelerated",
  );
  await page
    .getByRole("button", { name: "Faster change", exact: true })
    .click();
  const scenarios = await (await scenarioResponse).json();
  expect(
    scenarios.comparisons.some(
      (row: { difference: number }) => row.difference !== 0,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Faster change", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Make my learning plan" }),
  ).toBeEnabled();
  await expectNoPageOverflow(page);
  await page.screenshot({
    path: screenshot("career-desktop.png"),
    fullPage: true,
  });

  const roadmapResponse = page.waitForResponse((r) =>
    r.url().endsWith("/roadmaps/generate"),
  );
  await page.getByRole("button", { name: "Make my learning plan" }).click();
  const roadmap: Roadmap = await (await roadmapResponse).json();
  await expectFixedRoadmap(page, roadmap);
  await expectNoCharts(page);
  expect(roadmap.total_hours).toBeGreaterThan(0);
  await page.screenshot({
    path: screenshot("learning-desktop.png"),
    fullPage: true,
  });
  await expect(page.getByLabel("Skill to learn")).toBeHidden();
  await openDetails(page, "Optional: explore one skill");
  await page.getByLabel("Skill to learn").selectOption("sql");
  await page.getByLabel("Level you plan to reach").selectOption("3");
  const simulationResponse = page.waitForResponse((r) =>
    r.url().endsWith("/skills/impact"),
  );
  await page.getByRole("button", { name: "See what could change" }).click();
  const simulation = await (await simulationResponse).json();
  expect(simulation.modified_skills).toEqual(["sql"]);
  expect(
    simulation.occupations.some(
      (row: { difference: number }) => row.difference > 0,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("columnheader", { name: "After learning", exact: true }),
  ).toBeVisible();

  await expectFixedRoadmap(page, roadmap);
  const employerResponse = page.waitForResponse((r) =>
    r.url().endsWith("/employers/match"),
  );
  await page.getByRole("button", { name: "See job options" }).click();
  const employersResponse = await employerResponse;
  const employers = await employersResponse.json();
  expect(employersResponse.request().postDataJSON().milestone_ids).toEqual(
    roadmap.milestones.map((milestone) => milestone.id),
  );
  expect(employers.projected_skill_ids).toEqual(
    roadmap.milestones.map((milestone) => milestone.skill_id),
  );
  expect(
    employers.roles.some(
      (role: { remaining_requirements: string[] }) =>
        role.remaining_requirements.length > 0,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("heading", { name: "Your career plan" }),
  ).toBeVisible();
  await expect(page.locator(".employer-card")).toHaveCount(
    employers.roles.length,
  );
  await expectNoCharts(page);
  await expect(page.locator(".action-summary")).toContainText("Data Analyst");
  await page.screenshot({
    path: screenshot("employers-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Career planning steps" })
    .getByRole("button", { name: /Your profile/ })
    .click();
  await expect(page.getByLabel("Education or training")).toHaveValue(
    "Recent computing graduate",
  );
  await expect(page.getByLabel("The job you want")).toHaveValue("data-analyst");
  await openDetails(page, "Review skills and take a check (optional)");
  await expect(page.locator(".evidence-list")).toContainText(
    "Estimated level 2",
  );
  expect(errors).toEqual([]);
});

test("career starter can answer interests and finish without CV, experience or assessment", async ({
  page,
}) => {
  await openWorkspace(page);
  await expect(page.getByLabel("Education or training")).toBeHidden();
  await expect(page.getByLabel("Choose CV file")).toBeHidden();
  for (const step of ["Career options", "Learning plan", "Job options"]) {
    await expect(
      page
        .getByRole("navigation", { name: "Career planning steps" })
        .getByRole("button", { name: new RegExp(step) }),
    ).toBeDisabled();
  }
  await page
    .getByRole("button", { name: "Answer four questions about your interests" })
    .click();
  for (const choice of [
    "Understand what the data shows",
    "Finding patterns and explaining results",
    "Working with data and explaining results",
    "Making daily work easier",
  ]) {
    await page.getByRole("radio", { name: choice, exact: true }).check();
  }
  await expect(page.getByLabel("Years of work experience")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review my skills", exact: true })
    .click();
  await openDetails(page, "Review skills and take a check (optional)");
  await expect(
    page.getByText("No skills added yet.", { exact: false }),
  ).toBeVisible();
  await continueToCareers(page);
  await page.getByRole("button", { name: "Make my learning plan" }).click();
  await expect(page.locator(".milestone").first()).toBeVisible();
  await page.getByRole("button", { name: "See job options" }).click();
  await expect(
    page.getByRole("heading", { name: "Your career plan" }),
  ).toBeVisible();
  await expect(page.locator(".stack > .note")).toContainText(
    "not real job openings",
  );
});

test("professional current responsibilities remain separate from the target career", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByLabel("Load example profile").selectOption("professional");
  await page
    .getByRole("button", { name: "I know the job I want", exact: true })
    .click();
  await page.getByLabel("The job you want").selectOption("data-analyst");
  await openDetails(page, "Add work, study or location details (optional)");
  await page
    .getByLabel("Current job", { exact: true })
    .selectOption("admin-assistant");
  await page
    .getByRole("group", { name: "Tasks you do at work" })
    .getByRole("checkbox")
    .first()
    .check();
  await page
    .getByRole("button", { name: "Review my skills", exact: true })
    .click();
  const impactResponse = page.waitForResponse((r) =>
    r.url().endsWith("/ai-impact/analyze"),
  );
  await continueToCareers(page);
  const impact = await (await impactResponse).json();
  expect(impact.occupation_id).toBe("admin-assistant");
  expect(impact.tasks).toHaveLength(1);
  await expect(page.locator(".career-detail .role-title")).toHaveText(
    "Data Analyst",
  );
  await openDetails(page, "AI changes and other details");
  await expect(
    page.getByText("Tasks for: Administrative Assistant"),
  ).toBeVisible();
});

test("country and hours validation, TXT review, and unsupported extraction recover", async ({
  page,
}) => {
  await openWorkspace(page);
  await openDetails(page, "Add work, study or location details (optional)");
  await page.getByLabel("Country you want to work in").selectOption("SG");
  await expect(
    page.getByText("This country is not available yet", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Review my skills",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel("Country you want to work in").selectOption("MY");
  await page.getByLabel("Study hours per week").fill("0");
  await page
    .getByRole("button", { name: "Review my skills", exact: true })
    .click();
  await expect(page.locator(".error-banner[role=alert]")).toContainText(
    "between 1 and 60",
  );
  await expect(page.getByLabel("Study hours per week")).toBeFocused();
  await page.getByLabel("Study hours per week").fill("6");
  await page
    .getByRole("button", { name: "Close message", exact: true })
    .click();
  await openDetails(page, "Add skills from a CV (optional)");
  const file = page.getByLabel("Choose CV file");
  await file.setInputFiles({
    name: "sample.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "Education\nDiploma in Computing\nProjects\nUsed SQL and Excel to analyse club spending.",
    ),
  });
  await expect(page.locator(".upload-status")).toContainText("possible skills");
  await page
    .getByText("Check what we found in your CV", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add to education", exact: true })
    .click();
  await expect(page.getByLabel("Education or training")).toHaveValue(
    "Diploma in Computing",
  );
  await expect(
    page.getByRole("button", { name: "SQL", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await file.setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("This file is not a PDF document."),
  });
  await expect(page.locator(".upload-status")).toContainText(
    "We could not read this file",
  );
  await expect(page.locator(".error-banner[role=alert]")).toBeVisible();
  await file.setInputFiles({
    name: "blocked.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.locator(".upload-status")).toContainText(
    "Choose a PDF, DOCX, or TXT",
  );
});

test("system insights inspectors, source records, no-results, clearing and pagination", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "System data", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "System health", exact: true }),
  ).toBeVisible();
  await page
    .getByText("Safe connectivity diagnostics", { exact: true })
    .click();
  await expect(
    page.getByText('"private_profile_storage": false', { exact: false }),
  ).toBeVisible();
  for (const section of ["Matching", "Assessment", "Impact", "Scenarios"]) {
    await page.getByRole("button", { name: section, exact: true }).click();
    await page
      .getByRole("button", {
        name: `Run ${section.toLowerCase()} inspection`,
        exact: true,
      })
      .click();
    await expect(page.locator(".inspector-output")).toBeVisible();
    await expect(page.locator(".inspector-output")).not.toContainText(
      "expected_answer",
    );
    await expect(page.locator(".error-banner[role=alert]")).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Datasets", exact: true }).click();
  await page.getByLabel("Dataset", { exact: true }).selectOption("tasks");
  await expect(page.getByText("1–10 of 24", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("11–20 of 24", { exact: true })).toBeVisible();
  await page.getByLabel("Search records").fill("no-matching-data-unique-term");
  await expect(page.getByText(/No records match these filters/)).toBeVisible();
  await page
    .getByRole("button", { name: "Clear record search", exact: true })
    .click();
  await expect(page.getByLabel("Search records")).toBeFocused();
  await expect(page.getByText("1–10 of 24", { exact: true })).toBeVisible();
  await page
    .getByLabel("Occupation", { exact: true })
    .selectOption("data-analyst");
  await expect(page.getByText("1–3 of 3", { exact: true })).toBeVisible();
  await page.locator(".record-list summary").first().click();
  await expect(page.locator(".record-list details[open] pre")).toContainText(
    '"source_id": "shiftos-curated"',
  );
});

test("backend failure can reconnect, loading disables edits, and keyboard skip link works", async ({
  page,
}) => {
  await page.route("**/api/v1/occupations", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "The app could not load",
      exact: true,
    }),
  ).toBeVisible();
  await page.unroute("**/api/v1/occupations");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "A little about you" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A little about you" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await page.route("**/api/v1/profiles/analyze", async (route) => {
    await new Promise((complete) => setTimeout(complete, 900));
    await route.continue();
  });
  await page.getByLabel("Load example profile").selectOption("starter");
  await openDetails(page, "Add work, study or location details (optional)");
  await page
    .getByRole("button", { name: "Review my skills", exact: true })
    .click();
  await expect(
    page.getByText("Checking your details...", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Education or training")).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Your skills", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Education or training")).toBeEnabled();
});

test("remaining controls preserve choices, print safely, and respect black text and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openWorkspace(page);
  await openDetails(page, "Add work, study or location details (optional)");

  async function expectVisibleTextBlack() {
    const violations = await page.locator(".app-shell").evaluate((root) => {
      const candidates = new Set<Element>();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let text: Node | null;
      while ((text = walker.nextNode())) {
        const element = text.parentElement;
        if (
          text.textContent?.trim() &&
          element &&
          !element.closest("svg, option, optgroup, script, style")
        )
          candidates.add(element);
      }
      root
        .querySelectorAll("input, select, textarea")
        .forEach((element) => candidates.add(element));
      return [...candidates]
        .filter((element) => {
          const style = getComputedStyle(element);
          return (
            element.getClientRects().length &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            style.color !== "rgb(0, 0, 0)"
          );
        })
        .map((element) => ({
          text: element.textContent?.trim().slice(0, 80),
          color: getComputedStyle(element).color,
        }));
    });
    expect(
      violations,
      "All visible application text uses the required black foreground",
    ).toEqual([]);
  }

  await page.getByLabel("Country you live in").selectOption("ID");
  const residence = page.getByLabel("Country you live in");
  await residence.focus();
  await residence.press("Alt+ArrowDown");
  await residence.press("Escape");
  await expect(residence).toBeFocused();
  await expect(residence).toHaveValue("ID");
  const focus = await residence.evaluate((element) => ({
    style: getComputedStyle(element).outlineStyle,
    width: parseFloat(getComputedStyle(element).outlineWidth),
  }));
  expect(focus.style).not.toBe("none");
  expect(focus.width).toBeGreaterThanOrEqual(2);

  await page.getByLabel("Course budget").selectOption("paid");
  await page.getByLabel("Where you want to work").selectOption("remote");
  await page
    .getByLabel("Education or training")
    .fill("Independent learner with an academic portfolio");
  await page
    .getByLabel("What have you worked on?")
    .fill("Volunteered to organise a student event and prepare reports.");
  await page
    .getByLabel("A project you have worked on")
    .fill("Built a spreadsheet reporting project for a student group.");
  await page
    .getByRole("button", { name: "I know the job I want", exact: true })
    .click();
  await page.getByLabel("The job you want").selectOption("data-analyst");

  const skillNames = [
    "Workflow Automation",
    "Business Analysis",
    "Communication",
    "Microsoft Excel",
    "Power BI",
    "Python",
    "SQL",
    "Statistics",
    "Sustainability Reporting",
  ];
  for (const name of skillNames) {
    const skill = page.getByRole("button", { name, exact: true });
    await skill.click();
    await expect(skill).toHaveAttribute("aria-pressed", "true");
  }
  await page
    .getByText("Tell us how you have used these skills", { exact: false })
    .click();
  const experienceValues = [
    "awareness",
    "studied",
    "guided",
    "independent",
    "professional",
  ];
  for (const [index, name] of skillNames.entries()) {
    await page
      .getByLabel(`Your experience with ${name}`, { exact: true })
      .selectOption(experienceValues[index % experienceValues.length]);
  }
  await page.getByRole("button", { name: "SQL", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "SQL", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "SQL", exact: true }).click();
  for (const interest of [
    "Working with data",
    "Business",
    "Technology",
    "Working with people",
    "The environment",
  ])
    await page.getByRole("button", { name: interest, exact: true }).click();
  await page
    .getByRole("button", { name: "Answer four questions about your interests" })
    .click();
  await expect(
    page.getByRole("radio", {
      name: "Understand what the data shows",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hide interest questions", exact: true })
    .click();
  await expect(
    page.getByRole("radio", {
      name: "Understand what the data shows",
      exact: true,
    }),
  ).toHaveCount(0);
  await expectVisibleTextBlack();

  await page.route("**/api/v1/profiles/analyze", async (route) => {
    await new Promise((complete) => setTimeout(complete, 700));
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Review my skills", exact: true })
    .click();
  await expect(page.locator(".status-area .spinner")).toBeVisible();
  expect(
    await page
      .locator(".status-area .spinner")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await expect(
    page.getByRole("heading", { name: "Your skills", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/v1/profiles/analyze");
  await openDetails(page, "Review skills and take a check (optional)");
  for (const name of [
    "SQL",
    "Python",
    "Microsoft Excel",
    "Statistics",
    "Business Analysis",
  ]) {
    await page
      .getByRole("button", { name: `Check ${name}`, exact: true })
      .click();
    await expect(page.locator(".assessment .question-prompt")).toBeVisible();
    await page
      .getByRole("button", { name: "Close skill check", exact: true })
      .click();
    await expect(page.locator(".assessment")).toHaveCount(0);
  }

  await continueToCareers(page);
  const roadmapResponse = page.waitForResponse((response) =>
    response.url().endsWith("/roadmaps/generate"),
  );
  await page.getByRole("button", { name: "Make my learning plan" }).click();
  const baselineRoadmap: Roadmap = await (await roadmapResponse).json();
  await expectFixedRoadmap(page, baselineRoadmap);
  const baselineDuration = await page
    .locator(".roadmap-overview .duration")
    .innerText();
  await page
    .getByRole("navigation", { name: "Career planning steps" })
    .getByRole("button", { name: /Career options/ })
    .click();
  await expect(page.locator(".career-detail .role-title")).toHaveText(
    "Data Analyst",
  );
  await openDetails(page, "AI changes and other details");
  await page.route("**/api/v1/careers/recommend", (route) =>
    route.abort("failed"),
  );
  await page
    .getByRole("button", { name: "Faster change", exact: true })
    .click();
  await expect(page.locator(".error-banner[role=alert]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Gradual change", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Faster change", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .locator(".career-option")
    .filter({ has: page.getByText("Business Analyst", { exact: true }) })
    .click();
  await expect(page.locator(".error-banner[role=alert]")).toBeVisible();
  await expect(page.locator(".career-detail .role-title")).toHaveText(
    "Data Analyst",
  );
  await expect(
    page
      .locator(".career-option")
      .filter({ has: page.getByText("Data Analyst", { exact: true }) }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.unroute("**/api/v1/careers/recommend");
  await page
    .getByRole("navigation", { name: "Career planning steps" })
    .getByRole("button", { name: /Your profile/ })
    .click();
  await expect(page.getByLabel("The job you want")).toHaveValue("data-analyst");
  await page
    .getByRole("navigation", { name: "Career planning steps" })
    .getByRole("button", { name: /Learning plan/ })
    .click();
  await expect(page.locator(".roadmap-overview .role-title")).toHaveText(
    "Data Analyst",
  );
  await expect(page.locator(".roadmap-overview .duration")).toHaveText(
    baselineDuration,
    { useInnerText: true },
  );
  await expectFixedRoadmap(page, baselineRoadmap);
  await page
    .getByRole("navigation", { name: "Career planning steps" })
    .getByRole("button", { name: /Career options/ })
    .click();
  await expect(page.locator(".career-detail .role-title")).toHaveText(
    "Data Analyst",
  );
  await openDetails(page, "AI changes and other details");
  await page
    .getByRole("button", { name: "Faster change", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Faster change", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Make my learning plan" }),
  ).toBeEnabled();
  await page
    .locator(".career-option")
    .filter({ has: page.getByText("Business Analyst", { exact: true }) })
    .click();
  await expect(page.locator(".career-detail .role-title")).toHaveText(
    "Business Analyst",
  );
  await page
    .locator(".career-option")
    .filter({ has: page.getByText("Data Analyst", { exact: true }) })
    .click();
  await expect(page.locator(".career-detail .role-title")).toHaveText(
    "Data Analyst",
  );
  await page
    .getByText("Where this information comes from", { exact: true })
    .click();
  await expect(page.getByText("Score method:", { exact: false })).toBeVisible();
  await expectVisibleTextBlack();

  const updatedRoadmapResponse = page.waitForResponse((response) =>
    response.url().endsWith("/roadmaps/generate"),
  );
  await page.getByRole("button", { name: "Make my learning plan" }).click();
  const updatedRoadmap: Roadmap = await (await updatedRoadmapResponse).json();
  await expectFixedRoadmap(page, updatedRoadmap);
  await expectVisibleTextBlack();
  await page.getByRole("button", { name: "See job options" }).click();
  await expect(
    page.getByRole("heading", { name: "Your career plan" }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.testPrintCalls = String(
        Number(document.documentElement.dataset.testPrintCalls || "0") + 1,
      );
    };
  });
  await page
    .getByRole("button", { name: "Print my career plan", exact: true })
    .click();
  expect(await page.locator("html").getAttribute("data-test-print-calls")).toBe(
    "1",
  );
  await expectVisibleTextBlack();
  await page
    .getByRole("navigation", { name: "Career planning steps" })
    .getByRole("button", { name: /Learning plan/ })
    .click();
  await expectFixedRoadmap(page, updatedRoadmap);

  await page.getByRole("button", { name: "System data", exact: true }).click();
  await page.getByRole("button", { name: "Datasets", exact: true }).click();
  await page.getByLabel("Dataset", { exact: true }).selectOption("tasks");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByText("1–10 of 24", { exact: true })).toBeVisible();
  await page.getByLabel("Country", { exact: true }).selectOption("SG");
  await expect(page.getByText(/No records match these filters/)).toBeVisible();
  await page.getByLabel("Country", { exact: true }).selectOption("MY");
  await page
    .getByLabel("Evidence status", { exact: true })
    .selectOption("curated illustrative");
  const version = await page
    .getByLabel("Dataset version", { exact: true })
    .locator("option")
    .nth(1)
    .getAttribute("value");
  expect(version).toBeTruthy();
  await page
    .getByLabel("Dataset version", { exact: true })
    .selectOption(version!);
  await expect(page.getByText("1–10 of 24", { exact: true })).toBeVisible();
  await expectVisibleTextBlack();
});

for (const width of [390, 760]) {
  test(`four-step journey and insights fit a ${width}px viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openWorkspace(page);
    await expectNoPageOverflow(page);
    if (width === 390)
      await page.screenshot({
        path: screenshot("personal-mobile.png"),
        fullPage: true,
      });
    await demoProfile(page, "target");
    await continueToCareers(page);
    await expectNoPageOverflow(page);
    await page.getByRole("button", { name: "Make my learning plan" }).click();
    await expect(page.locator(".milestone").first()).toBeVisible();
    await expectNoPageOverflow(page);
    if (width === 390)
      await page.screenshot({
        path: screenshot("learning-mobile.png"),
        fullPage: true,
      });
    await page.getByRole("button", { name: "See job options" }).click();
    await expect(
      page.getByRole("heading", { name: "Your career plan" }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
    if (width === 390)
      await page.screenshot({
        path: screenshot("employers-mobile.png"),
        fullPage: true,
      });
    await page
      .getByRole("button", { name: "System data", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "System health", exact: true }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
    await page.getByRole("button", { name: "Matching", exact: true }).click();
    await page
      .getByRole("button", { name: "Run matching inspection", exact: true })
      .click();
    await expect(page.locator(".inspector-output")).toBeVisible();
    await expectNoPageOverflow(page);
  });
}
