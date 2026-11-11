// app/analytics/brands/BrandAnalyticsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { BrandAnalytics } from "../brands";
import { AlertCircle, Check, Copy } from "lucide-react";

interface Props {
  data: BrandAnalytics;
}

type Tab = "drift" | "inventory" | "distribution";
type DriftConfidence =
  | "high_confidence_drift"
  | "likely_drift"
  | "single_or_noise";

const CONFIDENCE_LABEL: Record<DriftConfidence, string> = {
  high_confidence_drift: "Real drift",
  likely_drift: "Likely drift",
  single_or_noise: "Edge case",
};

const CONFIDENCE_STYLE: Record<DriftConfidence, string> = {
  high_confidence_drift:
    "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 border-red-200 dark:border-red-900",
  likely_drift:
    "bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-900",
  single_or_noise:
    "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};
function generateAnalyticsMarkdown(data: BrandAnalytics): string {
  const now = new Date().toISOString();
  const L: string[] = [];

  L.push(`# Brand & SKU Prefix Analytics Report`);
  L.push(``);
  L.push(`**Generated:** ${now}`);
  L.push(``);
  L.push(`## Context`);
  L.push(``);
  L.push(
    `This report analyzes SKU prefix drift across the product catalog. ` +
      `Brands are detected data-driven from \`product_specifications\` ` +
      `(\`brand_name\`, \`brand\`, \`manufacturer\`) with a fallback to the first word of the title. ` +
      `"Drift" means the same brand appears under multiple SKU prefixes ` +
      `(e.g. \`RAZ-\` and \`RAZE-\` for Razer), indicating the SKU generator was non-deterministic. ` +
      `Prefixes ideally ≤4 chars; total SKU segments ideally 4-5.`,
  );
  L.push(``);

  // Summary
  L.push(`## Summary`);
  L.push(``);
  L.push(`| Metric | Value |`);
  L.push(`|---|---:|`);
  L.push(`| Total products | ${data.summary.total_products} |`);
  L.push(`| Brands detected | ${data.summary.distinct_brands} |`);
  L.push(`| Products with brand match | ${data.summary.matched_products} |`);
  L.push(
    `| Low-confidence products (noise) | ${data.summary.noise_products} |`,
  );
  L.push(`| Low-confidence brands | ${data.summary.noise_brands} |`);
  L.push(``);

  // Source breakdown
  L.push(`## Brand detection sources`);
  L.push(``);
  L.push(`| Source | Products | % | Distinct brands |`);
  L.push(`|---|---:|---:|---:|`);
  for (const s of data.sourceBreakdown) {
    L.push(
      `| ${s.brand_source} | ${s.products} | ${s.pct}% | ${s.distinct_brands} |`,
    );
  }
  L.push(``);

  // Drift
  L.push(`## SKU Prefix Drift`);
  L.push(``);
  L.push(`**Confidence legend:**`);
  L.push(
    `- **Real drift** — same brand, ≥2 prefixes, ≥5 products. High priority.`,
  );
  L.push(
    `- **Likely drift** — same brand, ≥2 prefixes, 2-4 products. Investigate.`,
  );
  L.push(`- **Edge case** — few products, may be noise. Low priority.`);
  L.push(``);
  if (data.drift.length === 0) {
    L.push(`_No drift detected._`);
  } else {
    L.push(`| Brand | # Prefixes | Products | Confidence | Prefixes (count) |`);
    L.push(`|---|---:|---:|---|---|`);
    for (const d of data.drift) {
      const pStr = d.prefixesParsed
        .map((p) => `\`${p.prefix}\`(${p.count})`)
        .join(", ");
      L.push(
        `| ${d.brand} | ${d.distinct_prefixes} | ${d.total_products} | ${CONFIDENCE_LABEL[d.confidence]} | ${pStr} |`,
      );
    }
  }
  L.push(``);

  // Collisions
  const collisions = data.prefixInventory.filter(
    (p) => p.status === "collision",
  );
  L.push(`## Prefix collisions (same prefix, multiple brands)`);
  L.push(``);
  if (collisions.length === 0) {
    L.push(`_None. Every prefix is exclusive to one brand._`);
  } else {
    L.push(`| Prefix | Products | Brands | Categories | Brands using |`);
    L.push(`|---|---:|---:|---:|---|`);
    for (const c of collisions) {
      L.push(
        `| \`${c.sku_prefix}\` | ${c.products} | ${c.distinct_brands} | ${c.distinct_categories} | ${c.brands_using} |`,
      );
    }
  }
  L.push(``);

  // Prefix inventory
  L.push(`## Prefix inventory (all distinct prefixes)`);
  L.push(``);
  L.push(`| Prefix | Products | Brands | Categories | Status |`);
  L.push(`|---|---:|---:|---:|---|`);
  for (const p of data.prefixInventory) {
    L.push(
      `| \`${p.sku_prefix}\` | ${p.products} | ${p.distinct_brands} | ${p.distinct_categories} | ${p.status} |`,
    );
  }
  L.push(``);

  // Prefix length distribution
  L.push(`## Prefix length distribution`);
  L.push(``);
  L.push(`Internal SKU grammar recommends ≤4 characters per segment.`);
  L.push(``);
  L.push(`| Prefix length | Distinct prefixes | Products | % |`);
  L.push(`|---:|---:|---:|---:|`);
  for (const r of data.prefixLengthDist) {
    L.push(
      `| ${r.prefix_len} chars | ${r.distinct_prefixes} | ${r.total_products} | ${r.pct}% |`,
    );
  }
  L.push(``);

  // Segment count distribution
  L.push(`## Segment count distribution`);
  L.push(``);
  L.push(
    `How many hyphen-separated segments each SKU has. Variance within a brand signals grammar drift.`,
  );
  L.push(``);
  L.push(`| Segment count | Distinct prefixes | Products |`);
  L.push(`|---:|---:|---:|`);
  for (const r of data.segmentCountDist) {
    L.push(
      `| ${r.segment_count} | ${r.distinct_prefixes} | ${r.total_products} |`,
    );
  }
  L.push(``);

  // Category × Brand aggregated
  L.push(`## Category × Brand (top 20 brands)`);
  L.push(``);
  const catMap = new Map<string, Map<string, number>>();
  for (const row of data.categoryBrandMatrix) {
    if (!catMap.has(row.category)) catMap.set(row.category, new Map());
    catMap.get(row.category)!.set(row.brand, row.products);
  }
  L.push(`| Category | Brands (product count) |`);
  L.push(`|---|---|`);
  for (const [cat, brands] of [...catMap.entries()].sort()) {
    const brandsStr = [...brands.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([b, c]) => `${b}(${c})`)
      .join(", ");
    L.push(`| ${cat} | ${brandsStr} |`);
  }
  L.push(``);

  // Suggested prompts
  L.push(`## Suggested questions for analysis`);
  L.push(``);
  L.push(`1. Which brands are highest priority to normalize, and why?`);
  L.push(`2. For each real-drift brand, which prefix should become canonical?`);
  L.push(
    `3. Do prefix-length or segment-count patterns suggest a grammar rule change?`,
  );
  L.push(
    `4. Which prefix collisions are risky (co-branding vs accidental reuse)?`,
  );
  L.push(
    `5. Given the source breakdown, what data quality fix would most improve brand detection?`,
  );
  L.push(
    `6. Produce a prioritized action plan with the exact SQL pattern to use per brand.`,
  );
  L.push(``);

  return L.join("\n");
}
export default function BrandAnalyticsClient({ data }: Props) {
  const [tab, setTab] = useState<Tab>("drift");

  const highDriftCount = data.drift.filter(
    (d) => d.confidence === "high_confidence_drift",
  ).length;
  const likelyDriftCount = data.drift.filter(
    (d) => d.confidence === "likely_drift",
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Brand Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Data-driven SKU prefix drift analysis. Brand signal comes from specs
            first, title fallback second.
          </p>
        </div>
        <CopyMarkdownButton data={data} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total products" value={data.summary.total_products} />
        <StatCard
          label="Brands detected"
          value={data.summary.distinct_brands}
        />
        <StatCard
          label="Matched products"
          value={data.summary.matched_products}
          tone="success"
        />
        <StatCard
          label="Noise (low-conf)"
          value={data.summary.noise_products}
          tone="warning"
        />
        <StatCard
          label="Real drift brands"
          value={highDriftCount}
          tone="danger"
        />
      </div>

      {/* Source breakdown */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
          How brand was detected
        </h2>
        <div className="space-y-2">
          {data.sourceBreakdown.map((s) => (
            <div
              key={s.brand_source}
              className="flex items-center gap-3 text-sm"
            >
              <span className="w-40 font-mono text-xs text-gray-600 dark:text-gray-400">
                {s.brand_source}
              </span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded h-2 overflow-hidden">
                <div
                  className="bg-blue-500 dark:bg-blue-400 h-full"
                  style={{ width: `${s.pct}%` }}
                />
              </div>
              <span className="w-28 text-right tabular-nums text-gray-700 dark:text-gray-300">
                {s.products} · {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 flex gap-1">
        <TabButton active={tab === "drift"} onClick={() => setTab("drift")}>
          Drift ({highDriftCount + likelyDriftCount})
        </TabButton>
        <TabButton
          active={tab === "inventory"}
          onClick={() => setTab("inventory")}
        >
          Prefix inventory ({data.prefixInventory.length})
        </TabButton>
        <TabButton
          active={tab === "distribution"}
          onClick={() => setTab("distribution")}
        >
          Distributions
        </TabButton>
      </div>

      {tab === "drift" && <DriftView data={data} />}
      {tab === "inventory" && <InventoryView data={data} />}
      {tab === "distribution" && <DistributionView data={data} />}
    </div>
  );
}

// ---------- Sub-components ----------

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral:
      "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100",
    success:
      "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/50 text-green-900 dark:text-green-100",
    warning:
      "border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/50 text-orange-900 dark:text-orange-100",
    danger:
      "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-100",
  }[tone];

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-1">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
        active
          ? "border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-medium"
          : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
function CopyMarkdownButton({ data }: { data: BrandAnalytics }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = async () => {
    try {
      const md = generateAnalyticsMarkdown(data);
      await navigator.clipboard.writeText(md);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2200);
    } catch (err) {
      console.error("[copy markdown]", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2200);
    }
  };

  const baseClass =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500";
  const stateClass =
    status === "copied"
      ? "bg-green-100 dark:bg-green-950/60 border-green-300 dark:border-green-800 text-green-800 dark:text-green-200"
      : status === "error"
        ? "bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200"
        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700";

  return (
    <button
      onClick={handleCopy}
      className={`${baseClass} ${stateClass}`}
      title="Copy full report as Markdown for pasting into an LLM"
      aria-live="polite"
    >
      {status === "copied" ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle className="h-4 w-4" />
          Copy failed
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy as Markdown
        </>
      )}
    </button>
  );
}
function DriftView({ data }: { data: BrandAnalytics }) {
  const [filter, setFilter] = useState<DriftConfidence | "all">("all");

  const rows = useMemo(() => {
    if (filter === "all") return data.drift;
    return data.drift.filter((d) => d.confidence === filter);
  }, [data.drift, filter]);

  const grouped = useMemo(() => {
    const g: Record<DriftConfidence, typeof data.drift> = {
      high_confidence_drift: [],
      likely_drift: [],
      single_or_noise: [],
    };
    for (const d of rows) g[d.confidence].push(d);
    return g;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-xs">
        {(
          [
            "all",
            "high_confidence_drift",
            "likely_drift",
            "single_or_noise",
          ] as const
        ).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded border transition-colors ${
              filter === f
                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100"
                : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
          >
            {f === "all" ? "All" : CONFIDENCE_LABEL[f]}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          No brands with multiple prefixes in this bucket.
        </p>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Brand</th>
                <th className="text-right px-4 py-2"># Prefixes</th>
                <th className="text-right px-4 py-2">Products</th>
                <th className="text-left px-4 py-2">Prefixes (count)</th>
                <th className="text-left px-4 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  "high_confidence_drift",
                  "likely_drift",
                  "single_or_noise",
                ] as const
              ).map((group) =>
                grouped[group].map((row) => (
                  <tr
                    key={row.brand}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                      {row.brand}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.distinct_prefixes}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.total_products}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {row.prefixesParsed.map((p) => (
                          <span
                            key={p.prefix}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-mono"
                          >
                            {p.prefix}
                            <span className="text-gray-500 dark:text-gray-400">
                              ({p.count})
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded border ${CONFIDENCE_STYLE[row.confidence]}`}
                      >
                        {CONFIDENCE_LABEL[row.confidence]}
                      </span>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InventoryView({ data }: { data: BrandAnalytics }) {
  const collisions = data.prefixInventory.filter(
    (p) => p.status === "collision",
  );

  return (
    <div className="space-y-4">
      {collisions.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-3 text-sm">
          <span className="font-semibold text-red-800 dark:text-red-200">
            {collisions.length} prefix{collisions.length === 1 ? "" : "es"} used
            by multiple brands
          </span>
          <span className="text-red-700 dark:text-red-300 ml-2">
            — possible co-branding or accidental prefix reuse. Investigate
            before renaming.
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2">Prefix</th>
              <th className="text-right px-4 py-2">Products</th>
              <th className="text-right px-4 py-2">Brands</th>
              <th className="text-right px-4 py-2">Categories</th>
              <th className="text-left px-4 py-2">Brand(s)</th>
              <th className="text-left px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.prefixInventory.map((row) => (
              <tr
                key={row.sku_prefix}
                className={`border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                  row.status === "collision"
                    ? "bg-red-50/50 dark:bg-red-950/20"
                    : ""
                }`}
              >
                <td className="px-4 py-2 font-mono font-medium text-gray-900 dark:text-gray-100">
                  {row.sku_prefix}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.products}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.distinct_brands}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.distinct_categories}
                </td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                  {row.brands_using}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded border ${
                      row.status === "exclusive"
                        ? "bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-200 border-green-200 dark:border-green-900"
                        : row.status === "collision"
                          ? "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 border-red-200 dark:border-red-900"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DistributionView({ data }: { data: BrandAnalytics }) {
  const maxPrefixLen = Math.max(
    ...data.prefixLengthDist.map((r) => r.total_products),
  );
  const maxSegCount = Math.max(
    ...data.segmentCountDist.map((r) => r.total_products),
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
          Prefix length distribution
        </h3>
        <div className="space-y-2">
          {data.prefixLengthDist.map((row) => {
            const pct = maxPrefixLen
              ? (row.total_products / maxPrefixLen) * 100
              : 0;
            const tone =
              row.prefix_len <= 4
                ? "bg-green-500 dark:bg-green-400"
                : row.prefix_len <= 6
                  ? "bg-orange-500 dark:bg-orange-400"
                  : "bg-red-500 dark:bg-red-400";
            return (
              <div
                key={row.prefix_len}
                className="flex items-center gap-3 text-xs"
              >
                <span className="w-10 font-mono tabular-nums text-gray-700 dark:text-gray-300">
                  {row.prefix_len} ch
                </span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded h-4 overflow-hidden">
                  <div
                    className={`${tone} h-full`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-24 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {row.total_products} ({row.pct}%)
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Green = compliant (≤4), orange = 5-6, red = 7+. Aim for a single mode
          at 4.
        </p>
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
          Segment count distribution
        </h3>
        <div className="space-y-2">
          {data.segmentCountDist.map((row) => {
            const pct = maxSegCount
              ? (row.total_products / maxSegCount) * 100
              : 0;
            return (
              <div
                key={row.segment_count}
                className="flex items-center gap-3 text-xs"
              >
                <span className="w-10 font-mono tabular-nums text-gray-700 dark:text-gray-300">
                  {row.segment_count} seg
                </span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded h-4 overflow-hidden">
                  <div
                    className="bg-blue-500 dark:bg-blue-400 h-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-24 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {row.total_products}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Segment count should be stable per brand — variance signals prompt
          drift.
        </p>
      </section>
    </div>
  );
}
