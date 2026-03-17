import { NextResponse } from "next/server";
import { runScheduledIngestion } from "@/lib/ingestion/scheduler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runScheduledIngestion();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown scheduled ingestion error",
      },
      { status: 500 }
    );
  }
}

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const userAgent = request.headers.get("user-agent") ?? "";

  if (secret && authHeader === `Bearer ${secret}`) {
    return true;
  }

  return userAgent.toLowerCase().includes("vercel-cron");
}
