/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = "https://endpoint.whitemantis.ae/api";

// ── News (Blogs) ─────────────────────────────────────────────────────────────

export interface NewsArticle {
  id: number;
  title: string;
  tagline: string;
  minutesToRead: string;
  date: string;
  image: string;
  content: string; // plain text extracted from Lexical JSON
  isFeatured: boolean;
  slug: string;
}

/** Extract plain text from PayloadCMS Lexical rich-text JSON */
function lexicalToPlainText(root: any): string {
  if (!root) return "";
  const walk = (node: any): string => {
    if (node.type === "text") return node.text ?? "";
    if (Array.isArray(node.children)) return node.children.map(walk).join(" ");
    return "";
  };
  return walk(root).replace(/\s+/g, " ").trim();
}

function normImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `https://endpoint.whitemantis.ae${url}`;
}

function mapBlogDoc(d: any): NewsArticle {
  const imageUrl = normImageUrl(
    d.featuredImage?.url ?? d.featuredImage?.thumbnailURL ?? null
  );
  const plainContent = lexicalToPlainText(d.content?.root ?? d.content ?? null);
  const dateStr = d.scheduledFor ?? d.updatedAt ?? d.createdAt ?? "";
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return {
    id: d.id,
    title: d.title ?? "",
    tagline: d.meta?.description ?? d.tagline ?? "",
    minutesToRead: `${d.readTime ?? 1} min read`,
    date: formattedDate,
    image: imageUrl,
    content: plainContent,
    isFeatured: d.isFeatured ?? false,
    slug: d.slug ?? String(d.id),
  };
}

/**
 * Fetch all published blogs (shown as "News" in the app).
 * Uses scheduledFor filter so future-scheduled posts are excluded.
 */
export async function getBlogs(): Promise<NewsArticle[]> {
  const now = new Date().toISOString();
  const params = new URLSearchParams({
    "where[and][0][_status][equals]": "published",
    "where[and][1][or][0][scheduledFor][less_than_equal]": now,
    "where[and][1][or][1][scheduledFor][exists]": "false",
    limit: "50",
    depth: "1",
  });

  const res = await fetch(`${API_BASE}/blogs?${params.toString()}`, {
    method: "GET",
  });

  if (!res.ok) throw new Error(`Blogs fetch failed: ${res.status}`);

  const data = await res.json();
  const docs: any[] = data?.docs ?? [];
  return docs.map(mapBlogDoc);
}

/**
 * Fetch a single blog by numeric id.
 */
export async function getBlogById(id: number): Promise<NewsArticle> {
  const res = await fetch(`${API_BASE}/blogs/${id}?depth=1`, {
    method: "GET",
  });

  if (!res.ok) throw new Error(`Blog fetch failed: ${res.status}`);

  const d = await res.json();
  return mapBlogDoc(d);
}
