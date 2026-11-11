// app/(pages)/analytics/specifications/SpecificationsAnalyticsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { Copy, Check, AlertCircle } from "lucide-react";
import { SpecificationsAnalytics } from "../specifications";

interface Props {
  data: SpecificationsAnalytics;
}

const CLASSIFICATION_LABEL = {
  brand_candidate: "Brand candidate",
  identifier_candidate: "Identifier candidate",
  other: "Other",
};

const CLASSIFICATION_STYLE = {
  brand_candidate:
    "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-900",
  identifier_candidate:
    "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-900",
  other:
    "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

// ---------- Markdown export ----------

function generateMarkdown(data: SpecificationsAnalytics): string {
  const L: string[] = [];
  const now = new Date().toISOString();

  L.push(`# Product Specifications Analytics`);
  L.push(``);
  L.push(`**Generated:** ${now}`);
  L.push(``);
  L.push(`## Context`);
  L.push(``);
  L.push(
    `This report inventories every key present in \`product_specifications\` ` +
      `so we can decide whether to add more keys to the brand detection CTE. ` +
      `Current brand source keys: \`brand_name\`, \`brand\`, \`manufacturer\`. ` +
      `The question: are there other keys (vendor, publisher, mfr, mpn, etc.) ` +
      `that would improve coverage for the ~${data.summary.products_missing_current_brand} products ` +
      `currently falling back to title parsing?`,
  );
  L.push(``);

  L.push(`## Summary`);
  L.push(``);
  L.push(`| Metric | Value |`);
  L.push(`|---|---:|`);
  L.push(`| Total spec rows | ${data.summary.total_spec_rows} |`);
  L.push(`| Distinct keys | ${data.summary.distinct_keys} |`);
  L.push(`| Products with specs | ${data.summary.products_with_specs} |`);
  L.push(`| Products total | ${data.summary.products_total} |`);
  L.push(
    `| Products with current brand | ${data.summary.products_with_current_brand} |`,
  );
  L.push(
    `| Products missing current brand | ${data.summary.products_missing_current_brand} |`,
  );
  L.push(``);

  L.push(`## Potential gain — adding these keys to the brand CTE`);
  L.push(``);
  L.push(
    `For each candidate key: how many products have it, and how many of those ` +
      `currently fall through to title parsing (i.e. would be newly covered if added).`,
  );
  L.push(``);
  L.push(`| Key | Classification | Products with key | Would cover (newly) |`);
  L.push(`|---|---|---:|---:|`);
  for (const r of data.potentialGain) {
    L.push(
      `| \`${r.key}\` | ${r.classification} | ${r.products_with_key} | ${r.products_without_brand} |`,
    );
  }
  L.push(``);

  L.push(`## Full key inventory (with samples)`);
  L.push(``);
  L.push(
    `Every distinct key with product count, distinct value count, and 5 samples. ` +
      `This is the raw data to decide what to add.`,
  );
  L.push(``);
  for (const r of data.keyInventory) {
    const samples = r.sampleValues
      .map((s) => `"${s.replace(/"/g, '\\"')}"`)
      .join(", ");
    const marker = r.isCurrentBrandKey ? " **[current]**" : "";
    L.push(`### \`${r.key}\`${marker}`);
    L.push(``);
    L.push(`- Classification: ${CLASSIFICATION_LABEL[r.classification]}`);
    L.push(`- Products: ${r.products}`);
    L.push(`- Distinct values: ${r.distinct_values}`);
    L.push(`- Samples: ${samples || "_(none)_"}`);
    L.push(``);
  }

  L.push(`## Orphan products (no brand from current keys)`);
  L.push(``);
  L.push(
    `${data.summary.products_missing_current_brand} products currently have no ` +
      `\`brand_name\` / \`brand\` / \`manufacturer\` spec. What keys DO they have?`,
  );
  L.push(``);
  L.push(`| Key | Orphan count |`);
  L.push(`|---|---:|`);
  for (const r of data.orphanKeys) {
    L.push(`| \`${r.key}\` | ${r.orphan_count} |`);
  }
  L.push(``);
  L.push(`### Random orphan samples`);
  L.push(``);
  for (const r of data.orphanSamples) {
    L.push(`- **${r.title}**`);
    L.push(`  - Keys: \`${r.keys_present}\``);
  }
  L.push(``);

  L.push(`## Suggested questions for analysis`);
  L.push(``);
  L.push(
    `1. Which candidate keys in "Potential gain" contain real brand values (from samples) and should be added to the brand CTE?`,
  );
  L.push(
    `2. Which candidate keys are useless (empty, duplicates of current keys, or wrong data)?`,
  );
  L.push(
    `3. For orphan products, what's the best fallback key — or does title parsing need to stay?`,
  );
  L.push(
    `4. Given the samples, can any key be a source of \`mpn\` for the duplicate-check feature?`,
  );
  L.push(
    `5. Recommend the exact updated \`CURRENT_BRAND_KEYS\` list and any fallback chain order.`,
  );
  L.push(``);

  return L.join("\n");
}

// ---------- Main component ----------

export default function SpecificationsAnalyticsClient({ data }: Props) {
  const [tab, setTab] = useState<"potential" | "inventory" | "orphans">(
    "potential",
  );

  const brandCandidates = data.potentialGain.filter(
    (p) => p.classification === "brand_candidate",
  );
  const usefulCandidates = brandCandidates.filter(
    (p) => p.products_without_brand > 0,
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Specifications Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Every key in{" "}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
              product_specifications
            </code>
            . Use this to decide which extra keys should feed brand detection.
          </p>
        </div>
        <CopyMarkdownButton data={data} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Distinct keys" value={data.summary.distinct_keys} />
        <StatCard label="Spec rows" value={data.summary.total_spec_rows} />
        <StatCard
          label="Current brand coverage"
          value={data.summary.products_with_current_brand}
          sub={`of ${data.summary.products_total}`}
          tone="success"
        />
        <StatCard
          label="Missing brand"
          value={data.summary.products_missing_current_brand}
          sub="fall through to title"
          tone="warning"
        />
      </div>

      {/* Coverage gap highlight */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
          Improvement potential
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {usefulCandidates.length === 0 ? (
            <>
              No brand candidate keys have products that aren&apos;t already
              covered. Current keys are optimal.
            </>
          ) : (
            <>
              <strong>{usefulCandidates.length}</strong> brand candidate{" "}
              {usefulCandidates.length === 1 ? "key" : "keys"} would improve
              coverage. Best candidate:{" "}
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                {usefulCandidates[0].key}
              </code>{" "}
              → would cover{" "}
              <strong>+{usefulCandidates[0].products_without_brand}</strong>{" "}
              more products.
            </>
          )}
        </p>
      </section>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 flex gap-1">
        <TabButton
          active={tab === "potential"}
          onClick={() => setTab("potential")}
        >
          Potential gain ({data.potentialGain.length})
        </TabButton>
        <TabButton
          active={tab === "inventory"}
          onClick={() => setTab("inventory")}
        >
          All keys ({data.keyInventory.length})
        </TabButton>
        <TabButton active={tab === "orphans"} onClick={() => setTab("orphans")}>
          Orphans ({data.summary.products_missing_current_brand})
        </TabButton>
      </div>

      {tab === "potential" && <PotentialView data={data} />}
      {tab === "inventory" && <InventoryView data={data} />}
      {tab === "orphans" && <OrphanView data={data} />}
    </div>
  );
}

// ---------- Sub-components ----------

function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: number;
  sub?: string;
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
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
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

function PotentialView({ data }: { data: SpecificationsAnalytics }) {
  const brand = data.potentialGain.filter(
    (p) => p.classification === "brand_candidate",
  );
  const identifier = data.potentialGain.filter(
    (p) => p.classification === "identifier_candidate",
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
          Brand candidates — sorted by potential gain
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          &quot;Would cover&quot; = products that have this key but NO current
          brand key. Add keys with high coverage here. Verify samples first (in
          All keys tab).
        </p>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Key</th>
                <th className="text-right px-4 py-2">Products with key</th>
                <th className="text-right px-4 py-2">Would cover (newly)</th>
              </tr>
            </thead>
            <tbody>
              {brand.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    No brand candidate keys found.
                  </td>
                </tr>
              ) : (
                brand.map((r) => (
                  <tr
                    key={r.key}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">
                      {r.key}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.products_with_key}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums font-medium ${
                        r.products_without_brand > 0
                          ? "text-green-700 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-500"
                      }`}
                    >
                      +{r.products_without_brand}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
          Identifier candidates (mpn / model / upc / ean / gtin)
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          These don&apos;t feed brand detection, but they feed duplicate
          detection (`mpn_norm`). Tracked here for completeness.
        </p>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Key</th>
                <th className="text-right px-4 py-2">Products with key</th>
                <th className="text-right px-4 py-2">Would cover (newly)</th>
              </tr>
            </thead>
            <tbody>
              {identifier.map((r) => (
                <tr
                  key={r.key}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">
                    {r.key}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.products_with_key}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-500">
                    +{r.products_without_brand}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InventoryView({ data }: { data: SpecificationsAnalytics }) {
  const [showOnlyCandidates, setShowOnlyCandidates] = useState(false);

  const rows = useMemo(() => {
    if (!showOnlyCandidates) return data.keyInventory;
    return data.keyInventory.filter((k) => k.classification !== "other");
  }, [data.keyInventory, showOnlyCandidates]);

  return (
    <div className="space-y-3">
      <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={showOnlyCandidates}
          onChange={(e) => setShowOnlyCandidates(e.target.checked)}
          className="rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800"
        />
        Show only brand + identifier candidates
      </label>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2">Key</th>
              <th className="text-left px-4 py-2">Class</th>
              <th className="text-right px-4 py-2">Products</th>
              <th className="text-right px-4 py-2">Distinct</th>
              <th className="text-left px-4 py-2">Samples</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.key}
                className={`border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                  r.isCurrentBrandKey ? "bg-blue-50/30 dark:bg-blue-950/10" : ""
                }`}
              >
                <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">
                  {r.key}
                  {r.isCurrentBrandKey && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-sans">
                      ● current
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded border ${CLASSIFICATION_STYLE[r.classification]}`}
                  >
                    {CLASSIFICATION_LABEL[r.classification]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {r.products}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {r.distinct_values}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {r.sampleValues.slice(0, 3).map((s, i) => (
                      <span
                        key={i}
                        className="inline-block px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs max-w-[160px] truncate"
                        title={s}
                      >
                        {s}
                      </span>
                    ))}
                    {r.sampleValues.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        +{r.sampleValues.length - 3}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrphanView({ data }: { data: SpecificationsAnalytics }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
          Keys present in orphan products
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          {data.summary.products_missing_current_brand} products have no brand
          from current keys. These are the keys they DO have — the candidates
          for improving coverage.
        </p>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Key</th>
                <th className="text-right px-4 py-2">Orphan count</th>
              </tr>
            </thead>
            <tbody>
              {data.orphanKeys.map((r) => (
                <tr
                  key={r.key}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">
                    {r.key}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.orphan_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
          Sample orphan products
        </h3>
        <div className="space-y-2">
          {data.orphanSamples.map((o) => (
            <div
              key={o.product_id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3"
            >
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {o.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                {o.keys_present}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------- Copy button ----------

function CopyMarkdownButton({ data }: { data: SpecificationsAnalytics }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = async () => {
    try {
      const md = generateMarkdown(data);
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
      title="Copy full specifications report as Markdown"
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
