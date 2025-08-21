import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
      service: "finance-planner",
      version: "0.1.0",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        ok: false,
        ts: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 500 }
    );
  }
}
