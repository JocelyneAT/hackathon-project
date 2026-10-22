"""Document extraction without retention; framework temporary uploads are closed."""

import io
import re
import zipfile

from docx import Document
from fastapi import HTTPException, UploadFile
from pypdf import PdfReader

from .engines import detect_skills

MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
MAX_CHARACTERS = 100_000


def sections(text: str) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {
        key: [] for key in ["education", "experience", "projects", "certifications", "responsibilities"]
    }
    heading_map = {
        "education": "education",
        "academic": "education",
        "experience": "experience",
        "employment": "experience",
        "projects": "projects",
        "project": "projects",
        "certifications": "certifications",
        "certificates": "certifications",
        "responsibilities": "responsibilities",
    }
    current = None
    for line in text.splitlines():
        clean = line.strip()
        heading = clean.lower().rstrip(":")
        if heading in heading_map:
            current = heading_map[heading]
        elif current and clean:
            # Only bounded snippets are returned for review; never contact details.
            snippet = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[email omitted]", clean)
            snippet = re.sub(r"\+?\d[\d\s()-]{7,}\d", "[contact omitted]", snippet)
            if len(result[current]) < 8:
                result[current].append(snippet[:250])
    return result


def extract_text(content: bytes, extension: str) -> str:
    try:
        if extension == "txt":
            return content.decode("utf-8-sig")
        if extension == "pdf":
            if not content.startswith(b"%PDF-"):
                raise ValueError("Invalid PDF signature")
            reader = PdfReader(io.BytesIO(content))
            if reader.is_encrypted:
                raise HTTPException(
                    422, "Encrypted PDFs are unsupported. Upload an unencrypted text-based document."
                )
            if len(reader.pages) > 50:
                raise HTTPException(422, "Use a CV of 50 pages or fewer.")
            text = "\n".join((page.extract_text() or "")[:MAX_CHARACTERS] for page in reader.pages)
            if not text.strip():
                raise HTTPException(
                    422,
                    "No readable PDF text found. Scanned PDFs require OCR, which is not implemented. Upload TXT, DOCX, or a text-based PDF.",
                )
            return text
        if extension == "docx":
            if not zipfile.is_zipfile(io.BytesIO(content)):
                raise ValueError("Invalid DOCX container")
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                if sum(entry.file_size for entry in archive.infolist()) > 20 * 1024 * 1024:
                    raise HTTPException(413, "The expanded DOCX exceeds the safe extraction limit.")
                if "word/document.xml" not in archive.namelist():
                    raise ValueError("Not a Word document")
            document = Document(io.BytesIO(content))
            paragraphs = [p.text for p in document.paragraphs]
            paragraphs.extend(
                cell.text for table in document.tables for row in table.rows for cell in row.cells
            )
            return "\n".join(paragraphs)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            422, "The document could not be read. Upload a valid UTF-8 TXT, DOCX, or text-based PDF."
        ) from exc
    raise HTTPException(415, "Only PDF, DOCX and TXT files are supported.")


def profile_fields(text: str) -> dict:
    """Extract only explicitly labelled demographics; never infer from names."""
    result = {}
    age = re.search(r"(?im)^\s*age\s*:\s*(\d{2})\b", text)
    if age and 16 <= int(age[1]) <= 100:
        result["age"] = int(age[1])
    gender = re.search(r"(?im)^\s*gender\s*:\s*(woman|man|female|male|non-binary)\s*$", text)
    if gender:
        result["gender"] = {"female": "Woman", "male": "Man"}.get(gender[1].lower(), gender[1].capitalize())
    country = re.search(r"(?im)^\s*(?:country(?: of origin)?|nationality)\s*:\s*([\w -]+)\s*$", text)
    if country:
        names = {
            "malaysia": "MY",
            "singapore": "SG",
            "indonesia": "ID",
            "philippines": "PH",
            "thailand": "TH",
            "vietnam": "VN",
            "brunei": "BN",
            "cambodia": "KH",
            "laos": "LA",
            "myanmar": "MM",
            "timor-leste": "TL",
        }
        code = names.get(country[1].strip().lower())
        if code:
            result["country"] = code
    years = re.search(r"\b(\d{1,2})\+?\s+years?\s+(?:of\s+)?(?:professional\s+)?experience\b", text, re.I)
    if years and int(years[1]) <= 65:
        result["experience_years"] = int(years[1])
        result["career_stage"] = "professional" if int(years[1]) else "starter"
    return result


async def extract_upload(file: UploadFile) -> dict:
    extension = (file.filename or "").rsplit(".", 1)[-1].lower()
    if extension not in {"txt", "pdf", "docx"}:
        await file.close()
        raise HTTPException(415, "Only PDF, DOCX and TXT files are supported.")
    try:
        content = await file.read(MAX_DOCUMENT_BYTES + 1)
        if len(content) > MAX_DOCUMENT_BYTES:
            raise HTTPException(413, "CV must be 5 MB or smaller.")
        if not content:
            raise HTTPException(422, "The uploaded file is empty.")
        text = extract_text(content, extension)
        if not text.strip():
            raise HTTPException(422, "No readable text found in this document.")
        if len(text) > MAX_CHARACTERS:
            raise HTTPException(
                413, "Extracted document text exceeds 100,000 characters. Upload a shorter CV."
            )
        return {
            "skills": [
                {
                    **s,
                    "estimated_proficiency": None,
                    "status": "Detected",
                    "confidence": "Low",
                    "verification": "Not assessed",
                }
                for s in detect_skills(text)
            ],
            "sections": sections(text),
            "profile_fields": profile_fields(text),
            "characters": len(text),
            "warnings": [
                "Rule-based extraction identifies possible skills only. Review and correct these suggestions.",
                "The document is not retained. Upload streams and any framework temporary storage are closed after extraction.",
            ],
        }
    finally:
        await file.close()
