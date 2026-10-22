# Hackathon Project hosting

## Current team preview

The team preview uses a temporary Cloudflare Tunnel to the production frontend running on the development computer. The frontend forwards `/api/*` to the local FastAPI server. Both the website and backend must remain running, and the computer must stay connected and awake.

The current preview URL is stored in the ignored `.local/team-url.txt`. Starting a new temporary tunnel produces a different URL. Anyone with the link can open this preview; it has no sign-in page.

On 22 October 2026 the preview homepage and `/api/v1/system/coverage` returned HTTP 200. The browser test covering skill assessment, career options, scenarios, a learning plan, skill simulation and selected job projections passed through the public URL in 9.1 seconds. All nine browser tests also passed against the local production build in 25.2 seconds.

## Render deployment

Deployment preparation is in progress for a free Docker web service named `hackathon-project`, in the Singapore region. The requested display name is Hackathon Project. No paid resources have been selected.

The planned deployment runs the Next.js frontend and one FastAPI worker in one service. Only the frontend listens on the public port. API calls stay on the same website origin. No LLM key is required.

SQLite and assessment sessions are temporary on this demo service. They may reset on a restart or deployment. The seed catalogue loads automatically. The site has no accounts or cross-device profile storage; keep production records elsewhere.

The GitHub connection is authenticated. A browser sign-in is still needed to create the new private `hackathon-project` repository, because the connected GitHub tool does not provide repository creation. Once the repository is available, upload the reviewed source and start the Render deployment. A queued build is not evidence of successful hosting: verify a live deployment and repeat the public workflow check before recording its URL here.
