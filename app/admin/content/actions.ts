"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

function normalizeStatus(raw: string): "draft" | "published" | "archived" {
  if (raw === "published" || raw === "archived") return raw;
  return "draft";
}

export async function upsertContentEntryAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const id = String(formData.get("id") ?? "").trim();
  const contentType = String(formData.get("content_type") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const bodyMarkdown = String(formData.get("body_markdown") ?? "").trim() || null;
  const seoTitle = String(formData.get("seo_title") ?? "").trim() || null;
  const seoDescription = String(formData.get("seo_description") ?? "").trim() || null;
  const ogImageUrl = String(formData.get("og_image_url") ?? "").trim() || null;
  const status = normalizeStatus(String(formData.get("status") ?? "draft"));
  const publishedAt = status === "published" ? new Date().toISOString() : null;

  if (!contentType || !slug || !title) {
    redirect("/admin/content/new");
  }

  const basePayload = {
    content_type: contentType,
    slug,
    title,
    excerpt,
    body_markdown: bodyMarkdown,
    seo_title: seoTitle,
    seo_description: seoDescription,
    og_image_url: ogImageUrl,
    status,
    published_at: publishedAt,
  };

  let savedId = id;
  if (id) {
    const { error } = await supabase.from("content_entries").update(basePayload).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { data, error } = await supabase
      .from("content_entries")
      .insert(basePayload)
      .select("id")
      .single();
    if (error) {
      throw new Error(error.message);
    }
    savedId = data.id as string;
  }

  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${savedId}`);
  revalidatePath("/guide");
  redirect(`/admin/content/${savedId}`);
}

export async function deleteContentEntryAction(id: string): Promise<void> {
  await requireAdmin();
  const supabase = getServiceSupabase();
  await supabase.from("content_entries").delete().eq("id", id);
  revalidatePath("/admin/content");
}

