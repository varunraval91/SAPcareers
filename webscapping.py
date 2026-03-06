import csv
from playwright.sync_api import sync_playwright

# Option A: Put the direct URL of the "My Applications" page if you have it.
# Option B: Put the career site URL and navigate after login.
APPLICATIONS_URL ="https://career5.successfactors.eu/portalcareer?company=SAP&rcm%5fsite%5flocale=en%5fUS&&navBarLevel=MY_PROFILE&_s.crb=aHCG167iVEGk1%252blzQGZ3nlXUAOz2%252bBd7UEVJPCe4vvk%253d"

OUT_CSV = "sap_applied_jobs.csv"


def export_table_to_csv(page, out_csv: str) -> int:
    """
    Tries to locate an applications table and export visible rows.
    You may need to tweak selectors depending on the portal theme.
    """

    # Common patterns: table rows, or div-based grids
    candidate_selectors = [
        "table tbody tr",              # classic HTML table
        '[role="row"]',                # ARIA grid/table
        ".application-list-item",      # some portals use list items
    ]

    rows = []
    chosen = None
    for sel in candidate_selectors:
        page.wait_for_timeout(500)
        count = page.locator(sel).count()
        if count and count > 1:
            chosen = sel
            break

    if not chosen:
        raise RuntimeError(
            "Could not find rows automatically. Open DevTools and identify the row selector "
            "for the applications list, then replace candidate_selectors."
        )

    loc = page.locator(chosen)
    n = loc.count()

    for i in range(n):
        text = loc.nth(i).inner_text().strip()
        # Convert the row text into columns by splitting lines.
        # You can customize this to match what you see (Job Title / Location / Date / Status).
        cols = [c.strip() for c in text.splitlines() if c.strip()]
        if cols:
            rows.append(cols)

    # Write as a simple CSV with generic column names.
    max_cols = max(len(r) for r in rows) if rows else 0
    headers = [f"col_{i+1}" for i in range(max_cols)]

    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows([r + [""] * (max_cols - len(r)) for r in rows])

    return len(rows)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # shows the browser so you can login
        context = browser.new_context()
        page = context.new_page()

        page.goto(APPLICATIONS_URL, wait_until="domcontentloaded")

        print("\n1) Log in normally in the opened browser.")
        print("2) Navigate to: Candidate Profile -> My Applications / Application History.")
        print("3) Once you see your applications list, return here and press Enter.\n")
        input("Press Enter after the applications list is visible...")

        # Optional: wait a bit for table to fully load
        page.wait_for_timeout(1500)

        count = export_table_to_csv(page, OUT_CSV)
        print(f"\nExported {count} rows to: {OUT_CSV}")

        context.close()
        browser.close()


if __name__ == "__main__":
    main()