import { query } from "@/lib/pg";
import { sendMail, smtpConfigured } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const email = (body.email || "").trim();
  if (!email || !email.includes("@")) {
    return Response.json({ error: "A valid email is required." }, { status: 400 });
  }

  const isPartial = Boolean(body.isPartial);
  const name = (body.name || (isPartial ? "Partial Lead (Step 1)" : "Commercial Contractor")).trim();
  const company = (body.company || (isPartial ? "Incomplete Form" : "Commercial Roofing Contractor")).trim();
  const territory = (body.territory || "Dallas–Fort Worth, TX").trim();
  const sizeRange = (body.sizeRange || (isPartial ? "Pending Step 2" : "Commercial 25k+ sq ft")).trim();
  const source = (body.source || "Landing Page").trim();

  // 1. Save to database if available
  try {
    await query(
      `insert into app.pilot_requests (name, company, email, territory, size_range, created_at) values ($1,$2,$3,$4,$5,$6)`,
      [name, company, email, territory, sizeRange, new Date().toISOString()],
    );
  } catch (dbErr) {
    console.warn("[pilot] DB insert warning:", dbErr);
  }

  // 2. Send notification to admin/pilot inbox
  const notifyTo = process.env.PILOT_NOTIFY_EMAIL || "mirzamailbox0@gmail.com";
  if (smtpConfigured() && notifyTo) {
    try {
      if (isPartial) {
        // Instant alert when user types email and clicks Next
        await sendMail({
          to: notifyTo,
          replyTo: email,
          fromName: "Depoii Lead Radar",
          subject: `⚡ [Step 1 Lead Captured] ${email} (${source})`,
          text: [
            "⚠️ Partial Lead Captured (Step 1 Submitted)",
            "------------------------------------------",
            "A prospective contractor entered their email and clicked 'Next'.",
            "If they abandon Step 2 without finishing, you can follow up with them immediately.",
            "",
            `Email: ${email}`,
            `Selected Tier: ${source}`,
            `Timestamp: ${new Date().toISOString()}`,
          ].join("\n"),
        });
      } else {
        // Full completion alert
        await sendMail({
          to: notifyTo,
          replyTo: email,
          fromName: "Depoii Pilot",
          subject: `🔥 [Full Pilot Lead] ${email} - ${company} (${territory})`,
          text: [
            "✅ Full Depoii Pilot / Lead Submission Completed",
            "------------------------------------------------",
            `Email: ${email}`,
            `Name: ${name}`,
            `Company: ${company}`,
            `Territory: ${territory}`,
            `Roof sizes: ${sizeRange}`,
            `Source: ${source}`,
            `Submitted at: ${new Date().toISOString()}`,
          ].join("\n"),
        });

        // 3. Send friendly confirmation to the user who submitted (only on full completion)
        try {
          await sendMail({
            to: email,
            replyTo: notifyTo,
            fromName: "Depoii Team",
            subject: "Your Depoii Territory Access Request",
            text: [
              `Hello ${name || "there"},`,
              ``,
              `Thank you for requesting territory access to Depoii for ${territory}.`,
              ``,
              `To protect contractor margins and lead exclusivity, Depoii caps active workspace access to a maximum of 2 commercial contractors per DFW territory.`,
              ``,
              `Our team has received your request and is checking availability for your bidding area. We will follow up with you within 1 business day.`,
              ``,
              `Best regards,`,
              `The Depoii Team`,
              `https://depoii.com`,
            ].join("\n"),
          });
        } catch (userMailErr) {
          console.warn("[pilot] User confirmation email failed:", userMailErr);
        }
      }
    } catch (err) {
      console.error("[pilot] Admin email notification failed:", err);
    }
  } else {
    console.warn("[pilot] SMTP not configured; request saved without email notification.");
  }

  return Response.json({ ok: true });
}
