import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const createServerClient = () =>
  createRouteHandlerClient({ cookies });

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const BUCKET = "medicosebuddy-files";
const BUCKET_SIZE_LIMIT = "52428800";

async function ensureStorageBucket() {
  const { data, error } = await supabaseAdmin.storage.getBucket(BUCKET);

  if (!error && data) {
    return;
  }

  const bucketMissing =
    error &&
    typeof error.message === "string" &&
    error.message.toLowerCase().includes("not found");

  if (!bucketMissing) {
    throw error;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(
    BUCKET,
    {
      public: false,
      fileSizeLimit: BUCKET_SIZE_LIMIT,
      allowedMimeTypes: ["application/pdf"],
    },
  );

  if (createError) {
    throw createError;
  }
}

export async function getSignedUrl(filePath: string, expiresIn = 300) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function uploadFile(
  filePath: string,
  file: File | Buffer,
  contentType = "application/pdf",
) {
  await ensureStorageBucket();

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType,
      upsert: true,
    });

  if (error) throw error;
  return data;
}

export async function deleteFile(filePath: string) {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove([filePath]);

  if (error) throw error;
}

export async function checkPurchase(userId: string, itemId: string) {
  const { data } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .single();

  return !!data;
}

export async function checkSubscription(userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())
    .single();

  return data;
}
