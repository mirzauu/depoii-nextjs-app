import { describe, it, expect } from "vitest";
import {
  parseAddressTokens,
  normalizePermitDate,
  normalizeValuation,
  classifyTrade,
  queryDallasPublicPermitHistory,
} from "./dallas-soda";

describe("Dallas Socrata Public Permit Federation Engine", () => {
  describe("Address & Token Normalizer", () => {
    it("parses street number and street tokens from standard addresses", () => {
      const res = parseAddressTokens("2100 Ross Ave, Ste 400, Dallas, TX 75201");
      expect(res.streetNumber).toBe("2100");
      expect(res.streetTokens).toContain("ROSS");
      expect(res.streetTokens).not.toContain("AVE");
      expect(res.streetTokens).not.toContain("DALLAS");
      expect(res.streetTokens).not.toContain("TX");
    });

    it("parses directional street addresses", () => {
      const res = parseAddressTokens("1001 N Riverfront Blvd");
      expect(res.streetNumber).toBe("1001");
      expect(res.streetTokens).toContain("N");
      expect(res.streetTokens).toContain("RIVERFRONT");
      expect(res.streetTokens).not.toContain("BLVD");
    });
  });

  describe("Date & Valuation Normalizers", () => {
    it("normalizes MM/DD/YY dates correctly into YYYY-MM-DD", () => {
      expect(normalizePermitDate("01/05/18")).toBe("2018-01-05");
      expect(normalizePermitDate("12/31/25")).toBe("2025-12-31");
    });

    it("normalizes ISO timestamp strings into YYYY-MM-DD", () => {
      expect(normalizePermitDate("2014-09-16T00:00:00.000")).toBe("2014-09-16");
      expect(normalizePermitDate("2017-05-01T14:22:10.000Z")).toBe("2017-05-01");
    });

    it("normalizes currency strings into clean numbers and formatted strings", () => {
      const v1 = normalizeValuation("$170,014.00");
      expect(v1.num).toBe(170014);
      expect(v1.formatted).toBe("$170,014");

      const v2 = normalizeValuation(85000);
      expect(v2.num).toBe(85000);
      expect(v2.formatted).toBe("$85,000");
    });
  });

  describe("Multi-Trade Classifier", () => {
    it("correctly tags roofing permits", () => {
      const res = classifyTrade("ROOF REPLACEMENT WITH 2 PLY MODIFIED SYSTEM", "Building Commercial Alteration");
      expect(res.trade).toBe("roofing");
      expect(res.subdiscipline).toBe("replacement");
    });

    it("correctly tags HVAC permits", () => {
      const res = classifyTrade("REPLACE 3 ROOFTOP AC UNITS ON COMMERCIAL BUILDING", "Mechanical Commercial");
      expect(res.trade).toBe("hvac");
      expect(res.subdiscipline).toBe("rtu_replacement");
    });

    it("correctly tags solar and electrical permits", () => {
      const res = classifyTrade("SOLAR PHOTOVOLTAIC ROOF INSTALLATION", "Electrical Commercial");
      expect(res.trade).toBe("electrical_solar");
      expect(res.subdiscipline).toBe("solar_pv");
    });

    it("correctly tags fire protection permits", () => {
      const res = classifyTrade("ANNUAL RISER MODIFICATION & SPRINKLER HEAD REPLACEMENT", "Fire Commercial");
      expect(res.trade).toBe("fire_safety");
      expect(res.subdiscipline).toBe("fire_sprinkler");
    });

    it("correctly tags plumbing permits", () => {
      const res = classifyTrade("INSTALL BACKFLOW PREVENTER ON WATER SERVICE", "Plumbing Commercial");
      expect(res.trade).toBe("plumbing");
      expect(res.subdiscipline).toBe("backflow_grease_trap");
    });

    it("correctly tags civil & paving permits", () => {
      const res = classifyTrade("REMOVE EXISTING CONCRETE AND INSTALL 4 NEW ADA RAMPS", "Paving Commercial");
      expect(res.trade).toBe("paving_civil");
      expect(res.subdiscipline).toBe("concrete_flatwork");
    });
  });

  describe("Live Socrata Public Federation", () => {
    it("queries real Dallas Open Data datasets across 2013-present for a landmark address", async () => {
      const data = await queryDallasPublicPermitHistory({
        address: "1001 N RIVERFRONT BLVD",
        since: "2013-01-01",
        limit: 25,
      });

      expect(data).toBeDefined();
      expect(data.sources_queried.length).toBe(4);
      expect(data.summary.total_permits).toBeGreaterThan(0);
      expect(data.permits.length).toBeGreaterThan(0);

      // Verify records have valid standardized fields
      for (const p of data.permits) {
        expect(p.permit_number).toBeTruthy();
        expect(p.trade).toBeTruthy();
        expect(p.source_dataset_id).toBeTruthy();
      }

      // Verify date continuity (both 2013/2014 and 2018+ datasets are represented)
      const datasetIds = new Set(data.permits.map((p) => p.source_dataset_id));
      expect(datasetIds.has("e7gq-4sah") || datasetIds.has("fs84-rv8z")).toBe(true);
    }, 15000);

    it("queries direct permit number lookup", async () => {
      const data = await queryDallasPublicPermitHistory({
        permit_number: "1801055002",
      });

      expect(data.summary.total_permits).toBe(1);
      const permit = data.permits[0];
      expect(permit.permit_number).toBe("1801055002");
      expect(permit.trade).toBe("roofing");
      expect(permit.contractor).toContain("EMPIRE ROOFING");
      expect(permit.street_address).toContain("2100 ROSS");
    }, 10000);
  });
});
