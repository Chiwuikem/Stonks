#!/usr/bin/env python
import argparse
import os
from urllib.parse import urljoin
import requests

DEFAULT_BASE_URL = os.getenv("STREETLENS_BASE_URL", "http://localhost:7070")

def screen(
    csv_path: str,
    base_url: str = DEFAULT_BASE_URL,
    save: bool = False,
    limit: int = 25,
    min_volume: int | None = None,
    min_oi: int | None = None,
    max_spread: float | None = None,
    dte_min: int | None = None,
    dte_max: int | None = None,
    delta_min: float | None = None,
    delta_max: float | None = None,
):
    """
    Calls Java API GET /screen and returns parsed JSON.
    """
    endpoint = urljoin(base_url.rstrip("/") + "/", "screen")
    params = {
        "csv": csv_path.replace("\\", "/"),  # Java side expects forward slashes
        "save": "true" if save else "false",
        "limit": str(limit),
    }
    # only include filters if provided
    if min_volume is not None: params["minVolume"] = str(min_volume)
    if min_oi is not None:     params["minOi"] = str(min_oi)
    if max_spread is not None: params["maxSpread"] = str(max_spread)
    if dte_min is not None:    params["dteMin"] = str(dte_min)
    if dte_max is not None:    params["dteMax"] = str(dte_max)
    if delta_min is not None:  params["deltaMin"] = str(delta_min)
    if delta_max is not None:  params["deltaMax"] = str(delta_max)

    resp = requests.get(endpoint, params=params, timeout=20)
    resp.raise_for_status()
    return resp.json()

def _main():
    ap = argparse.ArgumentParser(description="StreetLens Python client for /screen")
    ap.add_argument("--csv", required=True, help="Absolute/relative path to options CSV")
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL (default: %(default)s)")
    ap.add_argument("--save", action="store_true", help="Ask server to persist results")
    ap.add_argument("--limit", type=int, default=25)

    ap.add_argument("--min-volume", type=int)
    ap.add_argument("--min-oi", type=int)
    ap.add_argument("--max-spread", type=float)
    ap.add_argument("--dte-min", type=int)
    ap.add_argument("--dte-max", type=int)
    ap.add_argument("--delta-min", type=float)
    ap.add_argument("--delta-max", type=float)

    args = ap.parse_args()

    data = screen(
        csv_path=args.csv,
        base_url=args.base_url,
        save=args.save,
        limit=args.limit,
        min_volume=args.min_volume,
        min_oi=args.min_oi,
        max_spread=args.max_spread,
        dte_min=args.dte_min,
        dte_max=args.dte_max,
        delta_min=args.delta_min,
        delta_max=args.delta_max,
    )

    # Minimal console output: count + first few rows
    count = data.get("count") or (len(data.get("results", [])) if isinstance(data, dict) else None)
    print(f"Count: {count}")
    results = (data.get("results", []) if isinstance(data, dict) else [])
    for i, row in enumerate(results[:10], start=1):
        # print a compact subset if present
        fields = {k: row.get(k) for k in ["symbol","type","strike","dte","mid","spread","volume","openInterest","delta","score"] if k in row}
        print(f"{i:02d}. {fields}")

if __name__ == "__main__":
    _main()
