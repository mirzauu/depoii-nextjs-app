import { googleAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    email: true,
    google: googleAuthConfigured(),
  });
}
