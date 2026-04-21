import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient,
  supabaseAdmin,
  uploadFile,
} from "@/lib/supabase-server";

// Admin check helper
async function isAdmin(): Promise<boolean> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Agar ADMIN_EMAIL set hai toh match karo
  const adminEmail =
    process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (adminEmail) {
    return user.email === adminEmail;
  }

  // ADMIN_EMAIL set nahi hai (local dev) — koi bhi logged-in user
  return true;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const subject_id = formData.get("subject_id") as string;
    const exam_year = parseInt(formData.get("exam_year") as string);
    const type = formData.get("type") as "question" | "solution";
    const price = parseInt(formData.get("price") as string) || 29;
    const is_free_preview = formData.get("is_free_preview") === "true";

    if (!file || !subject_id || !exam_year || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Sirf PDF files allowed hain" },
        { status: 400 },
      );
    }

    // Subject code fetch karo path ke liye
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("code")
      .eq("id", subject_id)
      .single();

    const subjectCode =
      subject?.code?.toLowerCase().replace("bpt-", "") || subject_id;
    const filePath = `papers/${subjectCode}/${exam_year}_${type}.pdf`;

    // Supabase Storage mein upload karo
    const fileBuffer = await file.arrayBuffer();
    await uploadFile(filePath, Buffer.from(fileBuffer), "application/pdf");

    // Database mein update/insert karo
    const { data, error } = await supabaseAdmin
      .from("papers")
      .upsert(
        {
          subject_id,
          exam_year,
          type,
          file_path: filePath,
          file_size: file.size,
          price,
          is_free_preview,
          is_active: true,
        },
        {
          onConflict: "subject_id,exam_year,type",
        },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      paper: data,
      file_path: filePath,
      message: `${exam_year} ${type} uploaded successfully!`,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
