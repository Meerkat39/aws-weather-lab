import { NextResponse } from "next/server";

// DynamoDB-backed favorites API removed.
// Favorites are implemented client-side in `src/lib/favoritesLocal.ts`.
// This route now returns 410 Gone to indicate the server-side
// favorites API is intentionally unavailable.

export async function GET() {
  return NextResponse.json({ error: "favorites_api_removed" }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: "favorites_api_removed" }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: "favorites_api_removed" }, { status: 410 });
}
