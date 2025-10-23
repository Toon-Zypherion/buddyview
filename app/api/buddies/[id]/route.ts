import { NextResponse } from "next/server";
import { loadBuddyDetail } from "@/lib/buddyData";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params; // ✅ unwrap the promise
  const buddy = await loadBuddyDetail(id);

  if (!buddy) {
    return NextResponse.json(
      { error: "Buddy not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(buddy);
}
