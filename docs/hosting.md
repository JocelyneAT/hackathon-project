# Hackathon Project hosting

## Hosted website

The website is live at <https://hackathon-project-xewk.onrender.com>. Your computer can be off. The free service may take about a minute to wake after being idle; see [Render's free service documentation](https://render.com/docs/free).

The first Render deployment became live on 22 October 2026 at 14:59 in the Asia/Makassar time zone. The homepage and `/api/v1/system/coverage` returned HTTP 200. All nine Playwright browser tests passed against the hosted website in 36.0 seconds, including the complete four-step flow, real backend calculations, mobile layouts, keyboard controls, failure recovery and no-chart checks.

The final plain-English browser title is live in commit `74347433e36301945a49c0dab1242a099e89bc41`, deployment `dep-dbcraiss728c73at25hg`, completed at 15:05. Its title, homepage and API were checked again successfully after deployment. The current profile form was also inspected in the browser, and the hosted mobile screenshot showed no clipping or charts.

The next update simplifies the visible controls and replaces milestone choices with one complete ordered learning plan. Before deployment, its production build, all 121 backend tests, all nine browser tests, formatting, TypeScript and strict UI audit passed. The desktop and mobile roadmap screenshots were inspected. Live verification of this update is recorded after the deployment finishes.

## Earlier temporary preview

The team preview uses a temporary Cloudflare Tunnel to the production frontend running on the development computer. The frontend forwards `/api/*` to the local FastAPI server. Both the website and backend must remain running, and the computer must stay connected and awake.

The current preview URL is stored in the ignored `.local/team-url.txt`. Starting a new temporary tunnel produces a different URL. Anyone with the link can open this preview; it has no sign-in page.

On 22 October 2026 the preview homepage and `/api/v1/system/coverage` returned HTTP 200. The browser test covering skill assessment, career options, scenarios, a learning plan, skill simulation and selected job projections passed through the public URL in 9.1 seconds. All nine browser tests also passed against the local production build in 25.2 seconds.

## Render deployment

A free Docker web service named `hackathon-project` runs in the Singapore region. The requested display name is Hackathon Project. No paid resources have been selected.

The deployment runs the Next.js frontend and one FastAPI worker in one service. Only the frontend listens on the public port. API calls stay on the same website origin. No LLM key is required.

SQLite and assessment sessions are temporary on this demo service. They may reset on a restart or deployment. The seed catalogue loads automatically. The site has no accounts or cross-device profile storage; keep production records elsewhere.

The reviewed source is uploaded to the private repository `RikoHalim/hackathon-project`, branch `codex/hackathon-project`. Git's existing credential helper completed the upload. Render's GitHub connection can read the repository. The first deployment uses commit `cec9e7d45cb1835f004ecd5115a81aa4187cdb5e`.

Service ID: `srv-dbcr7fvb9u1s73ckqq8g`. Dashboard: <https://dashboard.render.com/web/srv-dbcr7fvb9u1s73ckqq8g>. The startup supervisor was exercised locally with a production Next.js build: the frontend and healthy API both responded successfully. Python syntax and Ruff checks passed. Render successfully built and started the Linux container; a local Docker engine was unavailable.

Deploys start automatically when the connected branch changes. Check the deploy status and API after a new release. The seed database and in-memory assessment sessions restart with the service.
