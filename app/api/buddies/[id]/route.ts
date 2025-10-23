import { NextRequest, NextResponse } from "next/server";
import { loadBuddyDetail } from "@/lib/buddyData";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const buddy = await loadBuddyDetail(id);

  if (!buddy) {
    return NextResponse.json(
      { error: "Buddy not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(buddy);
}
