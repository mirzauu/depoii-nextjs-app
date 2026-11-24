import { googleAuthConfigured } from "@/lib/auth";
import { getGoogleClientId } from "@/lib/auth-google";

export const dynamic = "force-dynamic";

export function GET() {
  const isGoogle = googleAuthConfigured();
  return Response.json({
    email: true,
    google: isGoogle,
    googleClientId: isGoogle ? getGoogleClientId() : null,
  });
}
