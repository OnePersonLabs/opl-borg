def report(rows):
    return {"totals": [{"sku": row["sku"], "units": row["units"]} for row in rows], "skipped": 0}
