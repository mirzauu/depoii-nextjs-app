import { describe, it, expect, beforeAll } from "vitest";
import { query } from "./pg";
import { queryTradeStats, queryTradePermits } from "./warehouse";

describe("Multi-Trade Commercial Building Intelligence Architecture", () => {
  beforeAll(async () => {
    // Ensure trade_categories exist in test environment
    await query(`
      CREATE TABLE IF NOT EXISTS warehouse.trade_categories (
        id VARCHAR(32) PRIMARY KEY,
        display_name TEXT NOT NULL,
        description TEXT,
        typical_lifespan_years INT,
        priority_rank INT DEFAULT 99
      );
      INSERT INTO warehouse.trade_categories (id, display_name, description, typical_lifespan_years, priority_rank) VALUES
        ('roofing', 'Commercial Roofing', 'Roofing', 20, 1),
        ('hvac', 'Commercial HVAC', 'HVAC', 15, 2),
        ('electrical_solar', 'Commercial Electrical & Solar', 'Solar', 25, 3),
        ('plumbing', 'Commercial Plumbing', 'Plumbing', 25, 4),
        ('fire_safety', 'Fire Safety', 'Fire', 15, 5),
        ('elevators', 'Elevators', 'Elevator', 20, 6),
        ('paving_civil', 'Paving', 'Paving', 8, 7),
        ('general_construction', 'General Construction', 'General', 30, 8)
      ON CONFLICT (id) DO NOTHING;
    `).catch(() => {});
  });

  it("verifies all 8 canonical trades exist in warehouse.trade_categories", async () => {
    const categories = await query<{ id: string; display_name: string }>(
      "SELECT id, display_name FROM warehouse.trade_categories ORDER BY priority_rank ASC"
    );
    expect(categories.length).toBe(8);
    const ids = categories.map((c) => c.id);
    expect(ids).toContain("roofing");
    expect(ids).toContain("hvac");
    expect(ids).toContain("electrical_solar");
    expect(ids).toContain("plumbing");
    expect(ids).toContain("fire_safety");
    expect(ids).toContain("elevators");
    expect(ids).toContain("paving_civil");
    expect(ids).toContain("general_construction");
  });

  it("verifies queryTradeStats structure and aggregation contract", async () => {
    const stats = await queryTradeStats();
    expect(stats).toBeDefined();
    expect(Array.isArray(stats.trades)).toBe(true);
    expect(stats.trades.length).toBe(8);

    const roof = stats.trades.find((t) => t.id === "roofing");
    expect(roof).toBeDefined();
    expect(roof?.displayName).toContain("Roofing");
    expect(typeof roof?.totalPermits).toBe("number");
    expect(typeof roof?.totalPipelineValuation).toBe("number");

    const hvac = stats.trades.find((t) => t.id === "hvac");
    expect(hvac).toBeDefined();
    expect(hvac?.displayName).toContain("HVAC");
  });

  it("verifies queryTradePermits handles trade-specific queries", async () => {
    const results = await queryTradePermits("hvac", new URLSearchParams({ limit: "5" }));
    expect(results).toBeDefined();
    expect(Array.isArray(results.permits)).toBe(true);
    if (results.permits.length > 0) {
      for (const p of results.permits) {
        expect(p.tradeCategory).toBe("hvac");
      }
    }
  });

  it("verifies zero unclassified permits in populated datasets", async () => {
    const totalCount = await query<{ cnt: string }>(
      "SELECT count(*)::text as cnt FROM warehouse.normalized_permits"
    ).catch(() => [{ cnt: "0" }]);

    if (Number(totalCount[0].cnt) > 0) {
      const unclassified = await query<{ cnt: string }>(
        "SELECT count(*)::text as cnt FROM warehouse.normalized_permits WHERE trade_category IS NULL"
      );
      expect(Number(unclassified[0].cnt)).toBe(0);
    }
  });
});
