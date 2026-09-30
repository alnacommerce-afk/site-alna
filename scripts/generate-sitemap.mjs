// Regenerates public/sitemap.xml with every published product, plus the store's static pages.
// Run manually (`node scripts/generate-sitemap.mjs`) or automatically before a build (see the
// "prebuild" script in package.json) — either way it's a build-time step, not a live endpoint, so
// a freshly added/unpublished product only shows up in the sitemap after the next build/deploy.
import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";

const SITE_URL = "https://store.alna.sale";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !anonKey) {
  console.error("[generate-sitemap] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY ausentes — pulando.");
  process.exit(0); // never fail the build over this
}

const supabase = createClient(supabaseUrl, anonKey);

// Static pages — same list the old hand-written sitemap.xml had.
const staticUrls = [
  { loc: `${SITE_URL}/loja`, changefreq: "weekly", priority: "1.0" },
  { loc: `${SITE_URL}/politica-de-privacidade`, changefreq: "yearly", priority: "0.3" },
  { loc: `${SITE_URL}/termos-de-uso`, changefreq: "yearly", priority: "0.3" },
  { loc: `${SITE_URL}/politica-de-troca-e-devolucao`, changefreq: "yearly", priority: "0.3" },
  { loc: `${SITE_URL}/sobre`, changefreq: "yearly", priority: "0.4" },
  { loc: `${SITE_URL}/contato`, changefreq: "yearly", priority: "0.4" },
];

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("status", "published");

  if (error) {
    console.error("[generate-sitemap] Falha ao consultar produtos — mantendo o sitemap.xml existente.", error);
    process.exit(0);
  }

  const productUrls = (products ?? []).map((p) => ({
    loc: `${SITE_URL}/produto/${p.slug}`,
    lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
    changefreq: "weekly",
    priority: "0.8",
  }));

  const allUrls = [...staticUrls, ...productUrls];
  const body = allUrls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n` +
        (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : "") +
        `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  await writeFile(new URL("../public/sitemap.xml", import.meta.url), xml, "utf8");
  console.log(`[generate-sitemap] public/sitemap.xml atualizado com ${allUrls.length} URLs (${productUrls.length} produtos).`);
}

main();
