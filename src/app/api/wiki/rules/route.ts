import { NextResponse } from "next/server";
import { getRuleSections } from "@/lib/rules-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sections = await getRuleSections();

  return NextResponse.json({ sections });
}
