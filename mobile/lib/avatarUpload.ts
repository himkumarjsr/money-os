import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";

/**
 * Uploads a locally-picked image to the shared `avatars` Storage bucket
 * (same bucket/path convention as the web app's Settings → Profile photo
 * upload) and writes the resulting public URL onto `users.avatar_url`.
 */
export async function uploadAvatar(
  userId: string,
  localUri: string,
): Promise<{ publicUrl?: string; error?: string }> {
  try {
    const extMatch = localUri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
    const ext = (extMatch?.[1] || "jpg").toLowerCase();
    const contentType = ext === "png" ? "image/png" : "image/jpeg";
    const fileName = `${userId}-avatar.${ext}`;

    const file = new File(localUri);
    const bytes = await file.arrayBuffer();

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(fileName, bytes, { contentType, upsert: true });
    if (upErr) return { error: upErr.message };

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: dbErr } = await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);
    if (dbErr) return { error: dbErr.message };

    return { publicUrl };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not upload photo",
    };
  }
}
