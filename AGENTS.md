<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Operator tasks doc

When a change creates **work for the human operator** (new env vars, Supabase steps, Vercel/cron setup, manual SQL, compliance, etc.), update [docs/OPERATOR-TODO.md](docs/OPERATOR-TODO.md) in the same PR/change: keep sections accurate, add a row to **Changelog**, and add/remove checkboxes as needed.
<!-- END:nextjs-agent-rules -->

## Copy Voice Rule (Travel & Lifestyle)

For travel guides, restaurant posts, neighborhood features, and lifestyle content updates, use the Travel & Lifestyle Writing Voice defined in `content/README.md` under "Travel & Lifestyle Writing Voice".

Apply it to new copy and rewrites for public-facing editorial content.

## Image Source Rule

For all content types, markdown must not specify images.

- Do not add or rely on `hero_image` in markdown frontmatter
- Treat admin uploads / database image fields as the only valid image source
