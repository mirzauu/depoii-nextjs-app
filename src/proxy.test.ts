import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import * as auth from "@/lib/auth";

describe("Proxy (Middleware) Route Protection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.DEPOII_LANDING_ONLY;
  });

  it("redirects unauthenticated root '/' visitor directly to '/login'", async () => {
    vi.spyOn(auth, "readSessionToken").mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/login");
  });

  it("redirects unauthenticated protected app route to '/login?next=...'", async () => {
    vi.spyOn(auth, "readSessionToken").mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/buildings");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/login?next=%2Fbuildings");
  });

  it("blocks unauthenticated /api/ routes with 401 JSON", async () => {
    vi.spyOn(auth, "readSessionToken").mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/records");
    const res = await proxy(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "Sign in required." });
  });

  it("allows unauthenticated visitor on /login", async () => {
    vi.spyOn(auth, "readSessionToken").mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/login");
    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  const mockUser: auth.SessionUser = {
    id: "user_1",
    email: "test@example.com",
    name: "Test User",
    orgId: "org_1",
    orgName: "Test Org",
    role: "admin",
    platformRole: "user",
  };

  it("redirects authenticated user visiting /login directly to '/'", async () => {
    vi.spyOn(auth, "readSessionToken").mockResolvedValue(mockUser);

    const req = new NextRequest("http://localhost:3000/login");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("allows authenticated user to access root '/' dashboard", async () => {
    vi.spyOn(auth, "readSessionToken").mockResolvedValue(mockUser);

    const req = new NextRequest("http://localhost:3000/");
    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows authenticated user to access protected routes", async () => {
    vi.spyOn(auth, "readSessionToken").mockResolvedValue(mockUser);

    const req = new NextRequest("http://localhost:3000/buildings");
    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects legacy '/welcome' immediately to 'https://depoii.com'", async () => {
    const req = new NextRequest("http://localhost:3000/welcome");
    const res = await proxy(req);

    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://depoii.com/");
  });

  it("allows access to public auth APIs without session", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login");
    const res = await proxy(req);

    expect(res.status).toBe(200);
  });
});
