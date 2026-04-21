import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const year = req.nextUrl.searchParams.get("year");

    let query = supabaseAdmin
      .from("subjects")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (year) {
      query = query.eq("year", year);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ subjects: data ?? [] });
  } catch (error: any) {
    console.error("Subjects API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load subjects" },
      { status: 500 },
    );
  }
}
