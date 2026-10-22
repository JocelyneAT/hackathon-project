"""Retrieve source-attributed job listings. Never manufacture missing vacancies."""

from __future__ import annotations

import asyncio
from collections import OrderedDict
from copy import deepcopy
from datetime import UTC, datetime
from html import unescape
import ipaddress
import os
import re
import time
from urllib.parse import urlsplit, urlunsplit

import httpx
from fastapi import APIRouter
from lxml import etree, html
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal

router = APIRouter(prefix="/api/v1/jobs", tags=["Job discovery"])
_cache: OrderedDict[tuple, tuple[float, dict]] = OrderedDict()
CACHE_SECONDS = 300
MAX_CACHE_ENTRIES = 64
MAX_RESPONSE_BYTES = 2_000_000


class JobSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    career: str = Field(min_length=2, max_length=150)
    location: str = Field(default="Malaysia", min_length=2, max_length=150)
    level: Literal["all", "junior", "senior", "lead", "freelance", "internship"] = "all"
    arrangement: Literal["any", "remote", "hybrid", "onsite"] = "any"


class JobSource(BaseModel):
    platform: str
    name: str
    url: str


class JobListing(BaseModel):
    id: str
    title: str
    company: str
    location: str
    posted_at: str | None = None
    posted_label: str | None = None
    salary: str | None = None
    employment_type: str | None = None
    arrangement: str | None = None
    description: str | None = None
    sources: list[JobSource]


class ProviderStatus(BaseModel):
    name: str
    status: Literal["available", "unavailable", "not_configured"]
    message: str


class JobSearchResult(BaseModel):
    jobs: list[JobListing]
    providers: list[ProviderStatus]
    fetched_at: str
    cached: bool = False
    query: JobSearchRequest
    notice: str = "Retrieved from job sources; availability can change. Confirm requirements and availability on the original listing."


def clean(value, limit=500) -> str:
    return re.sub(r"\s+", " ", unescape(str(value or ""))).strip()[:limit]


def source_link(url: str) -> dict | None:
    """Validate external links and derive the badge from the actual destination."""
    try:
        if not isinstance(url, str) or len(url) > 3000:
            return None
        parts = urlsplit(url)
        host = (parts.hostname or "").lower()
        if parts.scheme != "https" or parts.username or parts.password or "." not in host:
            return None
        if host.endswith((".local", ".localhost", ".internal")):
            return None
        try:
            ipaddress.ip_address(host)
            return None
        except ValueError:
            pass
        platform, name = "employer", host.removeprefix("www.")
        for domain, key, label in [
            ("linkedin.com", "linkedin", "LinkedIn"),
            ("jobstreet.com", "jobstreet", "JobStreet"),
            ("indeed.com", "indeed", "Indeed"),
            ("seek.com", "seek", "SEEK"),
        ]:
            if host == domain or host.endswith("." + domain):
                platform, name = key, label
                break
        if platform == "linkedin":
            match = re.search(r"/jobs/view/(?:[^/?]+-)?(\d+)(?:/|$)", parts.path)
            if not match:
                return None
            url = f"https://www.linkedin.com/jobs/view/{match[1]}/"
        else:
            url = urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))
        return {"platform": platform, "name": name[:80], "url": url}
    except (ValueError, TypeError):
        return None


async def read_response(client: httpx.AsyncClient, url: str, params: dict) -> str:
    async with client.stream("GET", url, params=params) as response:
        response.raise_for_status()
        chunks = bytearray()
        async for chunk in response.aiter_bytes():
            chunks.extend(chunk)
            if len(chunks) > MAX_RESPONSE_BYTES:
                raise ValueError("Job source response too large")
        return chunks.decode("utf-8", errors="replace")


def parse_linkedin(text: str) -> list[dict]:
    if not text.strip():
        return []
    document = html.fromstring(text)
    cards = document.xpath('//*[contains(concat(" ", normalize-space(@class), " "), " job-search-card ")]')
    jobs = []
    for card in cards[:25]:

        def content(class_name):
            nodes = card.xpath(
                './/*[contains(concat(" ", normalize-space(@class), " "), $class_name)]',
                class_name=" " + class_name + " ",
            )
            return clean(nodes[0].text_content()) if nodes else ""

        links = card.xpath('.//a[contains(@class,"base-card__full-link")]/@href')
        source = source_link(links[0]) if links else None
        title, company = content("base-search-card__title"), content("base-search-card__subtitle")
        if not source or not title or not company:
            continue
        dates = card.xpath(".//time/@datetime")
        date = dates[0] if dates and re.fullmatch(r"\d{4}-\d{2}-\d{2}", dates[0]) else None
        jobs.append(
            {
                "id": "linkedin-" + source["url"].rstrip("/").split("/")[-1],
                "title": title,
                "company": company,
                "location": content("job-search-card__location") or "Location not supplied",
                "posted_at": date,
                "posted_label": content("job-search-card__listdate")
                or content("job-search-card__listdate--new")
                or None,
                "salary": content("job-search-card__salary-info") or None,
                "sources": [source],
            }
        )
    return jobs


def linkedin_params(request: JobSearchRequest) -> dict:
    params = {"keywords": request.career, "location": request.location, "start": "0", "f_TPR": "r2592000"}
    if request.level in {"junior", "senior", "lead", "internship"}:
        params["f_E"] = {"junior": "2", "senior": "4", "lead": "5", "internship": "1"}[request.level]
    if request.level in {"internship", "freelance"}:
        params["f_JT"] = "I" if request.level == "internship" else "C"
    if request.level == "lead":
        params["keywords"] = "Lead " + request.career
    if request.arrangement != "any":
        params["f_WT"] = {"onsite": "1", "remote": "2", "hybrid": "3"}[request.arrangement]
    return params


def parse_search_provider(payload: dict) -> list[dict]:
    jobs = []
    if not isinstance(payload.get("jobs_results", []), list):
        raise ValueError("Unreadable job listings")
    for item in payload.get("jobs_results", [])[:25]:
        if not isinstance(item, dict):
            continue
        sources = []
        options = item.get("apply_options", [])
        if not isinstance(options, list):
            continue
        for option in options[:8]:
            if not isinstance(option, dict):
                continue
            source = source_link(option.get("link", ""))
            if source and source["url"] not in {s["url"] for s in sources}:
                sources.append(source)
        title, company = clean(item.get("title")), clean(item.get("company_name"))
        if not sources or not title or not company:
            continue
        metadata = item.get("detected_extensions") or {}
        if not isinstance(metadata, dict):
            metadata = {}
        description = clean(re.sub(r"<[^>]*>", " ", str(item.get("description", ""))), 600)
        jobs.append(
            {
                "id": "search-" + str(len(jobs)),
                "title": title,
                "company": company,
                "location": clean(item.get("location")) or "Location not supplied",
                "posted_label": clean(metadata.get("posted_at")) or None,
                "salary": clean(metadata.get("salary")) or None,
                "employment_type": clean(metadata.get("schedule_type")) or None,
                "description": description or None,
                "sources": sources,
            }
        )
    return jobs


def matches_filters(job: dict, request: JobSearchRequest) -> bool:
    """Avoid obvious provider false positives without inventing missing metadata."""
    title = job["title"].casefold()
    words = set(re.findall(r"[a-z]+", request.career.casefold())) - {
        "senior",
        "junior",
        "lead",
        "specialist",
        "analyst",
        "assistant",
        "manager",
        "officer",
        "engineer",
    }
    aliases = {
        "support": {"support", "service", "success"},
        "administrative": {"administrative", "admin", "office"},
        "intelligence": {"intelligence", "bi"},
        "sustainability": {"sustainability", "esg"},
    }
    title_words = set(re.findall(r"[a-z]+", title))
    if words and not any(title_words & aliases.get(word, {word}) for word in words):
        return False
    if request.level == "junior" and re.search(r"\b(senior|sr\.?|lead|head|director|manager)\b", title):
        return False
    if request.level == "internship" and not re.search(
        r"\b(intern|internship|trainee)\b", title + " " + (job.get("employment_type") or "").casefold()
    ):
        return False
    if request.level == "senior" and not re.search(r"\b(senior|sr\.?|principal)\b", title):
        return False
    if request.level == "lead" and not re.search(r"\b(lead|head|director|manager)\b", title):
        return False
    return True


def merge_jobs(jobs: list[dict], request: JobSearchRequest) -> list[dict]:
    merged = {}
    for job in jobs:
        if not matches_filters(job, request):
            continue
        key = tuple(re.sub(r"\W+", " ", job[k].casefold()).strip() for k in ("title", "company", "location"))
        if key in merged:
            existing = merged[key]
            existing["sources"].extend(
                s for s in job["sources"] if s["url"] not in {x["url"] for x in existing["sources"]}
            )
            for field in ["description", "salary", "employment_type", "posted_at", "posted_label"]:
                if not existing.get(field) and job.get(field):
                    existing[field] = job[field]
        else:
            merged[key] = deepcopy(job)
    return list(merged.values())[:40]


async def retrieve_jobs(request: JobSearchRequest) -> dict:
    jobs, providers = [], []
    async with httpx.AsyncClient(
        timeout=12,
        follow_redirects=False,
        headers={
            "User-Agent": "SHIFTOS/0.1 (public career listing discovery)",
            "Accept-Language": "en-MY,en;q=0.9",
        },
    ) as client:

        async def linkedin():
            try:
                text = await read_response(
                    client,
                    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search",
                    linkedin_params(request),
                )
                found = parse_linkedin(text)
                if (
                    not found
                    and text.strip()
                    and not any(marker in text.lower() for marker in ["no results", "no jobs", "no matching"])
                ):
                    return [], {
                        "name": "LinkedIn",
                        "status": "unavailable",
                        "message": "LinkedIn did not return readable listings. Try again later.",
                    }
                return found, {
                    "name": "LinkedIn",
                    "status": "available",
                    "message": "Public listings retrieved from LinkedIn.",
                }
            except (httpx.HTTPError, ValueError, etree.ParserError):
                return [], {
                    "name": "LinkedIn",
                    "status": "unavailable",
                    "message": "LinkedIn is temporarily unavailable. Try again later.",
                }

        async def search_provider():
            key = os.getenv("SERPAPI_API_KEY")
            if not key:
                return [], {
                    "name": "Additional job sources",
                    "status": "not_configured",
                    "message": "Additional job sources are not connected.",
                }
            query = " ".join(
                x
                for x in [
                    request.level if request.level != "all" else "",
                    request.career,
                    request.arrangement if request.arrangement != "any" else "",
                    request.location,
                ]
                if x
            )
            try:
                import json

                text = await read_response(
                    client,
                    "https://serpapi.com/search.json",
                    {"engine": "google_jobs", "q": query, "hl": "en", "api_key": key},
                )
                payload = json.loads(text)
                if not isinstance(payload, dict):
                    raise ValueError("Unreadable job source")
                if payload.get("error"):
                    raise ValueError("Job discovery unavailable")
                return parse_search_provider(payload), {
                    "name": "Additional job sources",
                    "status": "available",
                    "message": "Listings retrieved through the connected job-search provider.",
                }
            except (httpx.HTTPError, ValueError, TypeError, KeyError):
                return [], {
                    "name": "Additional job sources",
                    "status": "unavailable",
                    "message": "Additional job sources are temporarily unavailable.",
                }

        for found, status in await asyncio.gather(linkedin(), search_provider()):
            jobs.extend(found)
            providers.append(status)
    return {
        "jobs": merge_jobs(jobs, request),
        "providers": providers,
        "fetched_at": datetime.now(UTC).isoformat(),
        "cached": False,
        "query": request.model_dump(),
    }


@router.post("/search", response_model=JobSearchResult)
async def search_jobs(request: JobSearchRequest):
    key = (
        request.career.casefold(),
        request.location.casefold(),
        request.level,
        request.arrangement,
        bool(os.getenv("SERPAPI_API_KEY")),
    )
    cached = _cache.get(key)
    if cached and time.monotonic() - cached[0] < (CACHE_SECONDS if cached[1]["jobs"] else 30):
        _cache.move_to_end(key)
        return {**deepcopy(cached[1]), "cached": True}
    result = await retrieve_jobs(request)
    _cache[key] = (time.monotonic(), deepcopy(result))
    _cache.move_to_end(key)
    while len(_cache) > MAX_CACHE_ENTRIES:
        _cache.popitem(last=False)
    return result
