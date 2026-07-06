import { NextResponse } from "next/server";
import { getLawDocuments } from "@/lib/laws-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const documents = (await getLawDocuments()).filter(
    (document) => document.published
  );

  return NextResponse.json({ documents });
}
