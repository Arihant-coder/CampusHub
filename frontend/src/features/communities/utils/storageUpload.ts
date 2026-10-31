/**
 * @file storageUpload.ts
 * @description Uploads processed WebP images directly to the communities-images Supabase storage bucket,
 *              returning the permanent public CDN URL rather than storing heavy base64 strings in database rows.
 * @owner Communities Team
 */

import { supabase } from "@/lib/supabase";

/**
 * Converts a base64 dataUrl into a WebP Blob if needed.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/webp";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Uploads an image (Blob, File, or dataUrl string) to the communities-images bucket.
 * Returns the public CDN URL.
 */
export async function uploadCommunityImage(
  imageSource: Blob | File | string,
  userId: string
): Promise<string> {
  const blob = typeof imageSource === "string" ? dataUrlToBlob(imageSource) : imageSource;
  const fileName = `${userId}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("communities-images")
    .upload(fileName, blob, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from("communities-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

