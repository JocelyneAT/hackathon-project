# Individual job discovery

Implemented locally on 23 October 2026. The job page now retrieves individual related openings, replacing the former platform-directory cards. This update is local and has not been deployed to Render.

## Interface

Career results open `/jobs?career=...` in another tab. The page searches automatically after a short debounce and supports an explicit Search jobs action. Filters include location, arrangement, junior, senior, lead, internship and freelance (including contract work). Each card contains a source-supplied title, employer, location and optional date, salary, employment type and description. Small Found on badges identify the actual platform and link directly to its listing. A View opening action opens the primary original listing. Platform tabs filter the returned openings.

Matching title/company/location records merge across platforms and retain their source links. Empty results, loading, network failures and partial source failures have separate states. Changing the query cancels the previous request and prevents stale results from replacing the current search. Unknown metadata is omitted.

## Backend

`POST /api/v1/jobs/search` accepts `career`, `location`, `level` and `arrangement`. It does not accept a private profile. The response contains `jobs`, `providers`, `fetched_at`, `cached`, `query` and a source-availability notice.

Public LinkedIn guest listings are retrieved without an API key. The adapter passes native source filters, limits response size, strips tracking parameters from LinkedIn listing URLs and normalises the returned fields. The public feed is not a guaranteed contractual API; markup changes, rate limits, sign-in or source outages may make it unavailable. The application reports those cases rather than substituting fictional jobs.

Optional `SERPAPI_API_KEY` enables the documented [Google Jobs search adapter](https://serpapi.com/google-jobs-api). It reads actual `apply_options` URLs and derives platform badges from their destination domains. It may return JobStreet, Indeed, LinkedIn and employer career pages. Platform coverage depends on the provider result, not a preselected badge list. No paid provider request was made during this implementation; the adapter was tested using synthetic provider responses. Setting a provider key allows requests subject to that provider's account and usage limits.

Successful results are cached for five minutes in a bounded 64-query in-memory cache. Empty or failed results are cached for 30 seconds. Cached results retain their original retrieval timestamp. Source requests have bounded timeouts and do not follow redirects or bypass access controls. Only HTTPS external listing links are returned, with credentials, local addresses and nonspecific LinkedIn search links rejected.

## Live verification

The Customer Support Specialist / Malaysia query returned ten public LinkedIn openings through the running backend. Parsed records included listings from UOB, TP and Moomoo MY, each with a canonical individual LinkedIn listing URL. Direct JobStreet and Indeed requests returned HTTP 403, so the application does not claim it directly retrieved jobs from those platforms. Additional-platform behaviour is exercised with labelled synthetic test data only.

Availability can change after retrieval; confirm the vacancy and requirements on the source platform. The discovery adapter retrieves and filters source records; it does not generate job facts with a language model.

## Executed checks

- 159 backend tests passed, including 16 job discovery tests for parsing, destination-based badges, duplicate merging, filters, bounded caching, source failures and the optional provider adapter.
- 9 Edge browser tests passed, including individual opening cards, multiple source badges, platform filtering, query filter updates, source-unavailable feedback and mobile overflow.
- A separate browser check against the running live endpoint displayed ten real listings with no page errors and no horizontal overflow at 390px.
- Changed frontend files passed Prettier; Ruff lint and formatting passed. The production Webpack build and its TypeScript check passed.
- Live desktop and mobile screenshots are in `.local/screenshots/job-listings-live*.png`. Cross-platform test screenshots use explicitly synthetic intercepted responses and are separate from the live evidence.
