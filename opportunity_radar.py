#!/usr/bin/env python3
"""Opportunity Radar: rank scholarship opportunities by strategic fit."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "outputs"


@dataclass
class Opportunity:
    id: str
    title: str
    sponsor: str
    amount_usd: int
    deadline: date
    locations: List[str]
    focus_areas: List[str]
    eligibility: str
    url: str


@dataclass
class ScoredOpportunity:
    opportunity: Opportunity
    score: float
    score_breakdown: Dict[str, float]
    days_until_deadline: int


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def load_opportunities(path: Path) -> List[Opportunity]:
    raw = load_json(path)
    opportunities = []
    for entry in raw:
        opportunities.append(
            Opportunity(
                id=entry["id"],
                title=entry["title"],
                sponsor=entry["sponsor"],
                amount_usd=int(entry["amount_usd"]),
                deadline=parse_date(entry["deadline"]),
                locations=list(entry["locations"]),
                focus_areas=list(entry["focus_areas"]),
                eligibility=entry["eligibility"],
                url=entry["url"],
            )
        )
    return opportunities


def calculate_score(
    opportunity: Opportunity,
    criteria: Dict[str, Any],
    today: date,
) -> ScoredOpportunity | None:
    if opportunity.deadline < today:
        return None

    weights = criteria["weights"]
    min_award = criteria["min_award_usd"]
    window = criteria["deadline_window_days"]
    focus_priorities = [f.lower() for f in criteria["focus_priorities"]]
    eligibility_keywords = [k.lower() for k in criteria["eligibility_keywords"]]

    # Award score favors opportunities above the minimum value.
    award_ratio = opportunity.amount_usd / max(min_award, 1)
    award_score = min(award_ratio, 2.0) / 2.0

    # Deadline score favors closer deadlines within the defined window.
    days_until = (opportunity.deadline - today).days
    if days_until <= 0:
        deadline_score = 1.0
    elif days_until > window:
        deadline_score = 0.0
    else:
        deadline_score = (window - days_until) / window

    # Focus score rewards coverage of priority areas.
    focus_hits = sum(
        1 for focus in opportunity.focus_areas if focus.lower() in focus_priorities
    )
    focus_score = min(focus_hits / max(len(focus_priorities), 1), 1.0)

    # Eligibility score counts keyword alignment.
    eligibility_text = opportunity.eligibility.lower()
    eligibility_hits = sum(1 for kw in eligibility_keywords if kw in eligibility_text)
    eligibility_score = min(eligibility_hits / max(len(eligibility_keywords), 1), 1.0)

    total_score = (
        award_score * weights["award"]
        + deadline_score * weights["deadline"]
        + focus_score * weights["focus"]
        + eligibility_score * weights["eligibility"]
    )

    breakdown = {
        "award": round(award_score, 3),
        "deadline": round(deadline_score, 3),
        "focus": round(focus_score, 3),
        "eligibility": round(eligibility_score, 3),
    }

    return ScoredOpportunity(
        opportunity=opportunity,
        score=round(total_score, 3),
        score_breakdown=breakdown,
        days_until_deadline=days_until,
    )


def rank_opportunities(
    opportunities: List[Opportunity],
    criteria: Dict[str, Any],
    today: date,
) -> List[ScoredOpportunity]:
    scored = []
    for opportunity in opportunities:
        scored_item = calculate_score(opportunity, criteria, today)
        if scored_item is not None:
            scored.append(scored_item)
    scored.sort(key=lambda item: (item.score, -item.opportunity.amount_usd), reverse=True)
    return scored


def format_currency(amount: int) -> str:
    return f"${amount:,.0f}"


def build_markdown_report(
    scored: List[ScoredOpportunity],
    today: date,
    top_n: int,
) -> str:
    top = scored[:top_n]
    upcoming = [item for item in scored if item.days_until_deadline <= 14]

    lines = [
        "# Group Scholar Opportunity Radar",
        "",
        f"Report date: {today.isoformat()}",
        "",
        "## Snapshot",
        f"- Opportunities scanned: {len(scored)}",
        f"- High-priority picks: {len(top)}",
        f"- Deadlines within 14 days: {len(upcoming)}",
        "",
        "## Top Picks",
    ]

    for item in top:
        opp = item.opportunity
        lines.extend(
            [
                f"### {opp.title}",
                f"- Sponsor: {opp.sponsor}",
                f"- Amount: {format_currency(opp.amount_usd)}",
                f"- Deadline: {opp.deadline.isoformat()} ({item.days_until_deadline} days)",
                f"- Focus: {', '.join(opp.focus_areas)}",
                f"- Score: {item.score} (award {item.score_breakdown['award']}, deadline {item.score_breakdown['deadline']}, focus {item.score_breakdown['focus']}, eligibility {item.score_breakdown['eligibility']})",
                f"- Link: {opp.url}",
                "",
            ]
        )

    lines.append("## Pipeline")
    lines.append("| Opportunity | Amount | Deadline | Score |")
    lines.append("| --- | --- | --- | --- |")
    for item in scored:
        opp = item.opportunity
        lines.append(
            f"| {opp.title} | {format_currency(opp.amount_usd)} | {opp.deadline.isoformat()} | {item.score} |"
        )

    if upcoming:
        lines.extend(["", "## Immediate Actions", ""])
        for item in upcoming:
            opp = item.opportunity
            lines.append(
                f"- Prep submission materials for {opp.title} (deadline {opp.deadline.isoformat()}, {item.days_until_deadline} days)."
            )

    return "\n".join(lines)


def serialize_scored(scored: List[ScoredOpportunity]) -> List[Dict[str, Any]]:
    payload = []
    for item in scored:
        opp = item.opportunity
        payload.append(
            {
                "id": opp.id,
                "title": opp.title,
                "sponsor": opp.sponsor,
                "amount_usd": opp.amount_usd,
                "deadline": opp.deadline.isoformat(),
                "locations": opp.locations,
                "focus_areas": opp.focus_areas,
                "eligibility": opp.eligibility,
                "url": opp.url,
                "score": item.score,
                "score_breakdown": item.score_breakdown,
                "days_until_deadline": item.days_until_deadline,
            }
        )
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rank scholarship opportunities by strategic fit."
    )
    parser.add_argument(
        "--opportunities",
        type=Path,
        default=DATA_DIR / "sample_opportunities.json",
        help="Path to opportunities JSON file.",
    )
    parser.add_argument(
        "--criteria",
        type=Path,
        default=DATA_DIR / "criteria.json",
        help="Path to criteria JSON file.",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=3,
        help="Number of top opportunities to highlight.",
    )
    parser.add_argument(
        "--today",
        type=str,
        default=None,
        help="Override today's date (YYYY-MM-DD).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_DIR / "radar_report.md",
        help="Output markdown report path.",
    )
    parser.add_argument(
        "--json-output",
        type=Path,
        default=OUTPUT_DIR / "radar_scored.json",
        help="Output JSON path.",
    )
    args = parser.parse_args()

    today = parse_date(args.today) if args.today else date.today()
    opportunities = load_opportunities(args.opportunities)
    criteria = load_json(args.criteria)

    scored = rank_opportunities(opportunities, criteria, today)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    report = build_markdown_report(scored, today, args.top)
    args.output.write_text(report, encoding="utf-8")

    scored_payload = serialize_scored(scored)
    args.json_output.write_text(
        json.dumps(scored_payload, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )

    print(f"Wrote report to {args.output}")
    print(f"Wrote scored opportunities to {args.json_output}")


if __name__ == "__main__":
    main()
