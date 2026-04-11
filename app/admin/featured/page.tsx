import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  FeaturedItemRow,
  AddBusinessForm,
  AddCategoryForm,
} from "./FeaturedActions";

export default async function FeaturedAdminPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const [featuredRes, businessesRes, categoriesRes] = await Promise.all([
    supabase
      .from("featured_content")
      .select("*")
      .order("content_type")
      .order("sort_order"),
    supabase
      .from("businesses")
      .select("id, name")
      .eq("status", "active")
      .order("name")
      .limit(200),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  const featured = (featuredRes.data ?? []) as {
    id: number;
    content_type: string;
    reference_id: string | null;
    title: string;
    description: string | null;
    badge: string | null;
    sort_order: number;
    is_active: boolean;
  }[];

  const businesses = (businessesRes.data ?? []) as {
    id: string;
    name: string;
  }[];
  const categories = (categoriesRes.data ?? []) as {
    id: number;
    name: string;
  }[];

  const featuredBusinesses = featured.filter(
    (f) => f.content_type === "business"
  );
  const featuredCategories = featured.filter(
    (f) => f.content_type === "category"
  );
  const featuredTowns = featured.filter((f) => f.content_type === "town");
  const featuredCollections = featured.filter(
    (f) => f.content_type === "collection"
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Featured Content
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage what appears in featured sections on the homepage.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-teal-600 hover:text-teal-700"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-2xl font-semibold text-zinc-900">
            {featuredBusinesses.length}
          </p>
          <p className="text-sm text-zinc-600">Featured Businesses</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-2xl font-semibold text-zinc-900">
            {featuredCategories.length}
          </p>
          <p className="text-sm text-zinc-600">Featured Categories</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-2xl font-semibold text-zinc-900">
            {featuredTowns.length}
          </p>
          <p className="text-sm text-zinc-600">Town Spotlights</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-2xl font-semibold text-zinc-900">
            {featuredCollections.length}
          </p>
          <p className="text-sm text-zinc-600">Collections</p>
        </div>
      </div>

      {/* Add Featured Business */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Add Featured Business
        </h2>
        <AddBusinessForm businesses={businesses} />
      </div>

      {/* Add Featured Category */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Add Featured Category
        </h2>
        <AddCategoryForm categories={categories} />
      </div>

      {/* Featured Businesses Table */}
      {featuredBusinesses.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <h2 className="font-semibold text-zinc-900">Featured Businesses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Badge</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {featuredBusinesses.map((item) => (
                  <FeaturedItemRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Featured Categories Table */}
      {featuredCategories.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <h2 className="font-semibold text-zinc-900">Featured Categories</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Badge</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {featuredCategories.map((item) => (
                  <FeaturedItemRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Other Featured Content */}
      {(featuredTowns.length > 0 || featuredCollections.length > 0) && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <h2 className="font-semibold text-zinc-900">
              Other Featured Content
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Badge</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[...featuredTowns, ...featuredCollections].map((item) => (
                  <FeaturedItemRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {featured.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
          <p className="text-zinc-500">
            No featured content yet. Use the forms above to add items, or use
            the{" "}
            <Link
              href="/admin/data-pipeline/featured"
              className="text-teal-600 hover:underline"
            >
              Data Pipeline
            </Link>{" "}
            for bulk curation via ChatGPT.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Usage</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            - <strong>Featured Businesses</strong> appear on the homepage when
            the <code>featured_business</code> flag is enabled
          </li>
          <li>
            - <strong>Featured Categories</strong> can be used for homepage
            category highlights
          </li>
          <li>
            - Use the <strong>sort order</strong> arrows to control display
            order
          </li>
          <li>
            - Toggle <strong>active/inactive</strong> to show/hide without
            deleting
          </li>
        </ul>
      </div>
    </div>
  );
}
