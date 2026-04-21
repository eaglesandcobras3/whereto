"use client";

import { useTransition } from "react";
import {
  toggleFeaturedAction,
  deleteFeaturedAction,
  reorderFeaturedAction,
} from "./actions";

type FeaturedItem = {
  id: number;
  content_type: string;
  reference_id: string | null;
  title: string;
  description: string | null;
  badge: string | null;
  sort_order: number;
  is_active: boolean;
};

export function FeaturedItemRow({ item }: { item: FeaturedItem }) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleFeaturedAction(item.id, !item.is_active);
    });
  }

  function handleDelete() {
    if (!confirm("Delete this featured item?")) return;
    startTransition(async () => {
      await deleteFeaturedAction(item.id);
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await reorderFeaturedAction(item.id, direction);
    });
  }

  return (
    <tr className={isPending ? "opacity-50" : ""}>
      <td className="px-4 py-3 text-sm text-zinc-900">{item.sort_order}</td>
      <td className="px-4 py-3">
        <div className="font-medium text-zinc-900">{item.title}</div>
        {item.description && (
          <div className="text-sm text-zinc-500 line-clamp-1">
            {item.description}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600">{item.content_type}</td>
      <td className="px-4 py-3">
        {item.badge && (
          <span className="inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
            {item.badge}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            item.is_active
              ? "bg-green-100 text-green-800"
              : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {item.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleMove("up")}
            disabled={isPending}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            title="Move up"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
          <button
            onClick={() => handleMove("down")}
            disabled={isPending}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            title="Move down"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            onClick={handleToggle}
            disabled={isPending}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            title={item.is_active ? "Deactivate" : "Activate"}
          >
            {item.is_active ? (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AddBusinessForm({
  businesses,
}: {
  businesses: { id: string; name: string }[];
}) {
  return (
    <form
      action={async (formData) => {
        const { addFeaturedBusinessAction } = await import("./actions");
        const result = await addFeaturedBusinessAction(formData);
        if (result.error) {
          alert(result.error);
        }
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Business
          </label>
          <select
            name="business_id"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Select a business...</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Badge (optional)
          </label>
          <select
            name="badge"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">No badge</option>
            <option value="EDITOR'S PICK">Editor&apos;s Pick</option>
            <option value="LOCAL FAVORITE">Local Favorite</option>
            <option value="BEST VALUE">Best Value</option>
            <option value="ROMANTIC">Romantic</option>
            <option value="FAMILY FRIENDLY">Family Friendly</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Title
        </label>
        <input
          name="title"
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="Featured title for display"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Description (optional)
        </label>
        <textarea
          name="description"
          rows={2}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="Why this is featured..."
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        Add Featured Business
      </button>
    </form>
  );
}

export function AddCategoryForm({
  categories,
}: {
  categories: { id: number; name: string }[];
}) {
  return (
    <form
      action={async (formData) => {
        const { addFeaturedCategoryAction } = await import("./actions");
        const result = await addFeaturedCategoryAction(formData);
        if (result.error) {
          alert(result.error);
        }
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Category
          </label>
          <select
            name="category_id"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Select a category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Headline
        </label>
        <input
          name="title"
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="Catchy headline for homepage"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          rows={2}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="Description for homepage display..."
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        Add Featured Category
      </button>
    </form>
  );
}

export function AddTownForm({
  towns,
}: {
  towns: { id: number; name: string }[];
}) {
  return (
    <form
      action={async (formData) => {
        const { addFeaturedTownAction } = await import("./actions");
        const result = await addFeaturedTownAction(formData);
        if (result.error) {
          alert(result.error);
        }
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Town
          </label>
          <select
            name="town_id"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Select a town...</option>
            {towns.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Headline
        </label>
        <input
          name="title"
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="Town spotlight headline"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          rows={2}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="What this town is known for..."
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        Add Town Spotlight
      </button>
    </form>
  );
}
