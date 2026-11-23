import { describe, it, expect, vi } from "vitest";
import { queryOwnersDirectory, ownerProfile } from "@/lib/warehouse";

describe("Owners & REITs intelligence module", () => {
  it("should query owners directory with valid pagination and structure", async () => {
    const q = new URLSearchParams({ limit: "5", min_properties: "2" });
    const result = await queryOwnersDirectory(q);

    expect(result).toBeDefined();
    expect(result.limit).toBe(5);
    expect(typeof result.total_owners).toBe("number");
    expect(Array.isArray(result.owners)).toBe(true);
    
    if (result.owners.length > 0) {
      const first = result.owners[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("canonicalName");
      expect(first).toHaveProperty("entityType");
      expect(first).toHaveProperty("totalProperties");
      expect(first).toHaveProperty("totalBuildingSqft");
      expect(first).toHaveProperty("agingRoofsCount");
    }
  });

  it("should fetch owner profile with linked parcels and decision makers", async () => {
    const q = new URLSearchParams({ limit: "1", min_properties: "2" });
    const dir = await queryOwnersDirectory(q);

    if (dir.owners.length > 0) {
      const ownerId = dir.owners[0].id;
      const profile = await ownerProfile(ownerId);

      expect(profile).toBeDefined();
      expect(profile.owner).not.toBeNull();
      expect(profile.owner?.id).toBe(ownerId);
      expect(Array.isArray(profile.owner?.parcels)).toBe(true);
      expect(Array.isArray(profile.owner?.contacts)).toBe(true);
    }
  });
});
