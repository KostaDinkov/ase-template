import type { NextRequest } from "next/server";

export function GET(_req: NextRequest) {
  return Response.json({ status: "ok" });
}
