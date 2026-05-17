"""
NetOps Tower - Analytics Routes

Endpoints for client-side difficulty curve monitoring:
- POST /api/analytics/report — client submits session analytics
- GET  /api/analytics/difficulty — aggregate difficulty curve (all players)
- GET  /api/analytics/categories — aggregate category stats (all players)

Storage: in-memory aggregate store (reset on server restart).
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, List
from collections import defaultdict

from ..models.schemas import (
    AnalyticsReportRequest,
    TierStatsModel,
    CategoryStatsModel,
    AggregateAnalyticsResponse,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# ─── In-memory aggregate storage ───────────────────────────────────────────
# Keyed by player_id → list of report snapshots
# We aggregate on the fly for simplicity (no persistent DB needed for demo)

class AnalyticsStore:
    """Thread-safe in-memory analytics store. Resets on server restart."""

    def __init__(self):
        # player_id -> list of submitted records
        self._records: Dict[str, list] = defaultdict(list)
        # player_id -> list of submitted snapshots
        self._snapshots: Dict[str, list] = defaultdict(list)

    def add_report(self, player_id: str, records: list, snapshot: dict | None = None) -> None:
        """Store a client analytics report."""
        self._records[player_id].extend(records)
        if snapshot:
            self._snapshots[player_id].append(snapshot)

    def get_aggregate(self) -> dict:
        """Compute aggregate stats across all players."""
        all_records = []
        for records in self._records.values():
            all_records.extend(records)

        player_count = len(self._records)
        ticket_count = len(all_records)

        # Per-tier aggregation
        tier_map: Dict[int, dict] = defaultdict(lambda: {
            "attempts": 0, "wins": 0, "losses": 0,
            "total_time": 0, "total_score": 0,
        })

        # Per-category aggregation
        category_map: Dict[str, dict] = defaultdict(lambda: {
            "attempts": 0, "wins": 0, "losses": 0,
        })

        total_wins = 0

        for r in all_records:
            diff = r.get("difficulty", 1)
            cat = r.get("category", "unknown")
            outcome = r.get("outcome", "failed")
            time_spent = r.get("time_spent_ms", 0)
            score = r.get("score", 0)

            tier = tier_map[diff]
            tier["attempts"] += 1
            tier["total_time"] += time_spent
            tier["total_score"] += score
            if outcome == "completed":
                tier["wins"] += 1
                total_wins += 1
            else:
                tier["losses"] += 1

            cat_entry = category_map[cat]
            cat_entry["attempts"] += 1
            if outcome == "completed":
                cat_entry["wins"] += 1
            else:
                cat_entry["losses"] += 1

        # Build tier stats
        tiers: list = []
        for diff in sorted(tier_map.keys()):
            t = tier_map[diff]
            tiers.append({
                "difficulty": diff,
                "attempts": t["attempts"],
                "wins": t["wins"],
                "losses": t["losses"],
                "win_rate": t["wins"] / t["attempts"] if t["attempts"] > 0 else 0,
                "avg_time_ms": t["total_time"] / t["attempts"] if t["attempts"] > 0 else 0,
                "avg_score": t["total_score"] / t["attempts"] if t["attempts"] > 0 else 0,
            })

        # Build category stats
        categories: list = []
        for cat, c in sorted(category_map.items(), key=lambda x: -x[1]["attempts"]):
            categories.append({
                "category": cat,
                "attempts": c["attempts"],
                "wins": c["wins"],
                "losses": c["losses"],
                "win_rate": c["wins"] / c["attempts"] if c["attempts"] > 0 else 0,
            })

        return {
            "total_players": player_count,
            "total_tickets": ticket_count,
            "tiers": tiers,
            "categories": categories,
            "overall_win_rate": total_wins / ticket_count if ticket_count > 0 else 0,
        }

    def clear(self) -> None:
        """Reset all analytics data."""
        self._records.clear()
        self._snapshots.clear()


_analytics_store = AnalyticsStore()


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.post("/report")
async def report_analytics(report: AnalyticsReportRequest):
    """
    Client submits session analytics.

    The server stores the raw ticket records and recomputes
    aggregate stats in-memory.
    """
    if not report.records:
        raise HTTPException(status_code=400, detail="No records provided")

    # Convert Pydantic models to plain dicts for storage
    records = [r.model_dump(by_alias=True) for r in report.records]

    snapshot = report.snapshot if report.snapshot else None

    _analytics_store.add_report(report.player_id, records, snapshot)

    return {"received": True, "player_id": report.player_id, "records_count": len(report.records)}


@router.get("/difficulty")
async def get_difficulty_curve():
    """Returns aggregate difficulty curve data across all players.

    Used by developers to monitor game balance — which tiers
    are too hard, which are too easy.
    """
    agg = _analytics_store.get_aggregate()
    return AggregateAnalyticsResponse(
        total_players=agg["total_players"],
        total_tickets=agg["total_tickets"],
        tiers=[TierStatsModel(**t) for t in agg["tiers"]],
        categories=[CategoryStatsModel(**c) for c in agg["categories"]],
        overall_win_rate=agg["overall_win_rate"],
    )


@router.get("/categories")
async def get_category_stats():
    """Returns per-category aggregate stats across all players."""
    agg = _analytics_store.get_aggregate()
    return [CategoryStatsModel(**c) for c in agg["categories"]]
