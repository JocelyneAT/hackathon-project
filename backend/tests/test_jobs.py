"""Live discovery boundaries tested with explicitly synthetic source responses."""

import asyncio
from copy import deepcopy
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import jobs
from backend.app.main import app

CARD = """<li><div class="base-card job-search-card">
<a class="base-card__full-link" href="https://my.linkedin.com/jobs/view/example-data-analyst-123456?trackingId=private"></a>
<h3 class="base-search-card__title">Data Analyst &amp; Reporting</h3>
<h4 class="base-search-card__subtitle"><a>Example Test Employer</a></h4>
<span class="job-search-card__location">Kuala Lumpur, Malaysia</span>
<time class="job-search-card__listdate" datetime="2026-10-22">1 day ago</time>
</div></li>"""


@pytest.fixture(autouse=True)
def clean_cache(monkeypatch):
    jobs._cache.clear()
    monkeypatch.delenv("SERPAPI_API_KEY", raising=False)
    yield
    jobs._cache.clear()


def test_public_cards_extract_actual_fields_and_canonical_links():
    result = jobs.parse_linkedin(CARD)
    assert len(result) == 1
    item = result[0]
    assert item["company"] == "Example Test Employer"
    assert item["title"] == "Data Analyst & Reporting"
    assert item["posted_at"] == "2026-10-22"
    assert item["sources"] == [
        {"platform": "linkedin", "name": "LinkedIn", "url": "https://www.linkedin.com/jobs/view/123456/"}
    ]
    assert item["salary"] is None
    assert jobs.parse_linkedin(CARD.replace('class="base-card__full-link"', 'class="not-a-listing"')) == []


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "http://example.com/job",
        "https://localhost/job",
        "https://127.0.0.1/job",
        "https://user:secret@example.com/job",
        "https://app.internal/job",
        "https://www.linkedin.com/jobs/search/",
    ],
)
def test_invalid_or_nonspecific_links_never_become_listing_actions(url):
    assert jobs.source_link(url) is None


def test_platform_badge_is_derived_from_destination_not_untrusted_provider_label():
    data = {
        "jobs_results": [
            {
                "title": "Data Analyst",
                "company_name": "Example Test Employer",
                "location": "Malaysia",
                "apply_options": [
                    {"title": "LinkedIn", "link": "https://my.jobstreet.com/job/123456"},
                    {"title": "Indeed", "link": "javascript:alert(1)"},
                ],
            }
        ]
    }
    result = jobs.parse_search_provider(data)
    assert result[0]["sources"][0]["name"] == "JobStreet"
    assert len(result[0]["sources"]) == 1
    data["jobs_results"][0]["apply_options"] = []
    assert jobs.parse_search_provider(data) == []


def test_cross_platform_duplicates_merge_without_losing_source_links():
    first = jobs.parse_linkedin(CARD)[0]
    other = deepcopy(first)
    other["id"] = "provider-other"
    other["description"] = "Synthetic test description."
    other["sources"] = [
        {"platform": "jobstreet", "name": "JobStreet", "url": "https://my.jobstreet.com/job/123456"}
    ]
    result = jobs.merge_jobs([first, other, first], jobs.JobSearchRequest(career="Data Analyst"))
    assert len(result) == 1
    assert len(result[0]["sources"]) == 2
    assert result[0]["description"] == "Synthetic test description."


def test_filters_reject_obvious_role_mismatches_and_pass_provider_parameters():
    item = jobs.parse_linkedin(CARD)[0]
    assert not jobs.matches_filters(
        {**item, "title": "Senior Data Analyst"}, jobs.JobSearchRequest(career="Data Analyst", level="junior")
    )
    assert not jobs.matches_filters(
        {**item, "title": "Sales Executive"}, jobs.JobSearchRequest(career="Data Analyst")
    )
    assert not jobs.matches_filters(item, jobs.JobSearchRequest(career="Data Analyst", level="internship"))
    request = jobs.JobSearchRequest(career="Data Analyst", level="internship", arrangement="remote")
    params = jobs.linkedin_params(request)
    assert params["f_JT"] == "I"
    assert params["f_E"] == "1"
    assert params["f_WT"] == "2"


def test_source_failure_is_not_reported_as_a_successful_empty_search(monkeypatch):
    async def fail(*args, **kwargs):
        raise httpx.ConnectError("Unavailable")

    monkeypatch.setattr(jobs, "read_response", fail)
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/search", json={"career": "Data Analyst"})
    assert response.status_code == 200
    result = response.json()
    assert result["jobs"] == []
    assert result["providers"][0]["status"] == "unavailable"
    assert result["providers"][1]["status"] == "not_configured"


def test_successful_empty_feed_and_unreadable_feed_are_distinguished(monkeypatch):
    async def empty(*args, **kwargs):
        return ""

    monkeypatch.setattr(jobs, "read_response", empty)
    result = asyncio.run(jobs.retrieve_jobs(jobs.JobSearchRequest(career="Data Analyst")))
    assert result["providers"][0]["status"] == "available"

    async def unreadable(*args, **kwargs):
        return "<html><h1>Please sign in</h1></html>"

    monkeypatch.setattr(jobs, "read_response", unreadable)
    result = asyncio.run(jobs.retrieve_jobs(jobs.JobSearchRequest(career="Data Analyst")))
    assert result["providers"][0]["status"] == "unavailable"


def test_cached_requests_are_bounded_and_do_not_fetch_again(monkeypatch):
    calls = []

    async def feed(*args, **kwargs):
        calls.append(True)
        return CARD

    monkeypatch.setattr(jobs, "read_response", feed)
    monkeypatch.setattr(jobs, "MAX_CACHE_ENTRIES", 2)
    with TestClient(app) as client:
        first = client.post("/api/v1/jobs/search", json={"career": "Data Analyst"}).json()
        second = client.post("/api/v1/jobs/search", json={"career": "Data Analyst"}).json()
        assert first["jobs"] == second["jobs"]
        assert second["cached"]
        assert len(calls) == 1
        for name in ["Operations Analyst", "Business Analyst"]:
            client.post("/api/v1/jobs/search", json={"career": name})
    assert len(jobs._cache) == 2


def test_optional_provider_returns_attributed_jobs_when_primary_fails(monkeypatch):
    monkeypatch.setenv("SERPAPI_API_KEY", "test-key-never-public")

    async def feed(client, url, params):
        if "linkedin.com" in url:
            raise httpx.ConnectError("Unavailable")
        return json.dumps(
            {
                "jobs_results": [
                    {
                        "title": "Data Analyst",
                        "company_name": "Example Test Employer",
                        "location": "Malaysia",
                        "apply_options": [
                            {"title": "Indeed", "link": "https://malaysia.indeed.com/viewjob?jk=test123"}
                        ],
                    }
                ]
            }
        )

    monkeypatch.setattr(jobs, "read_response", feed)
    with TestClient(app) as client:
        result = client.post("/api/v1/jobs/search", json={"career": "Data Analyst"}).json()
    assert result["jobs"][0]["sources"][0]["name"] == "Indeed"
    assert "test-key-never-public" not in str(result)


def test_query_validation_rejects_unknown_filters_and_private_profile_payloads():
    with TestClient(app) as client:
        for payload in [
            {"career": ""},
            {"career": "Data Analyst", "level": "invented"},
            {"career": "Data Analyst", "profile": {"age": 20}},
        ]:
            assert client.post("/api/v1/jobs/search", json=payload).status_code == 422
