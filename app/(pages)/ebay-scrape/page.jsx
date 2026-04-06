"use client";

import { useState } from "react";
import { scrapeEbayProduct } from "../../actions/scrape";

export default function EbayScraper() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [rawHtml, setRawHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  async function handleScrape(e) {
    e.preventDefault();
    setLoading(true);
    setCopied(false);
    setError("");
    const response = await scrapeEbayProduct(url);

    if (response.success) {
      setResult(response.data);
      setRawHtml(response.html);
    } else {
      setError(response.error);
    }
    setLoading(false);
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(rawHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Failed to copy!");
    }
  };

  // Helper to render a generic key-value table
  const renderTable = (
    title,
    data,
    keyLabel = "Field",
    valueLabel = "Value",
  ) => {
    if (!data || Object.keys(data).length === 0) return null;
    return (
      <div className="border rounded-lg shadow-sm overflow-hidden text-black">
        <h3 className="text-md font-semibold p-4 bg-gray-50 border-b">
          {title}
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border-b">{keyLabel}</th>
                <th className="p-3 border-b">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data).map(([key, val]) => (
                <tr key={key} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium capitalize">{key}</td>
                  <td className="p-3">
                    {typeof val === "object" ? JSON.stringify(val) : val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderImageGallery = (images) => {
    if (!images || images.length === 0) return <p>No images available.</p>;
    return (
      <div className="border rounded-lg shadow-sm p-4">
        <h3 className="text-md font-semibold mb-3">
          Product Images ({images.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <a
              key={idx}
              href={img}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={img}
                alt={`Product ${idx + 1}`}
                className="w-full h-auto border rounded hover:shadow-lg transition"
              />
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 ">eBay Scraper Tool</h1>

      <form onSubmit={handleScrape} className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Paste eBay URL here..."
          className="flex-1 p-2 border rounded text-black bg-white"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? "Scraping..." : "Extract Data"}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Extracted Data</h2>
            <button
              onClick={copyToClipboard}
              className={`text-sm text-black px-3 py-1 rounded border transition-all ${
                copied
                  ? "bg-green-100 border-green-500 text-green-700"
                  : "bg-gray-50 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {copied ? "✓ Copied HTML!" : "Copy Raw HTML"}
            </button>
          </div>

          {/* Product Details Table */}
          {renderTable("Product Details", {
            title: result.product.title,
            price: `${result.product.price} ${result.product.currency}`,
            condition: result.product.condition,
            quantity_available: result.product.quantityAvailable,
            brand: result.product.brand,
            mpn: result.product.mpn,
            availability: result.product.availability,
          })}

          {/* Seller Details Table */}
          {renderTable("Seller Information", {
            name: result.seller.name,
            feedback_score: result.seller.feedbackScore,
            positive_percent: result.seller.positivePercent,
            business_seller: result.seller.isBusinessSeller ? "Yes" : "No",
            joined: result.seller.joined,
            store_name: result.seller.storeName,
          })}

          {/* Shipping & Returns */}
          {renderTable("Shipping & Returns", {
            shipping: result.shipping,
            returns: result.returns,
            payments_accepted: result.payments.join(", "),
          })}

          {/* Item Specifics Table */}
          {result.itemSpecifics &&
            Object.keys(result.itemSpecifics).length > 0 &&
            renderTable("Item Specifics", result.itemSpecifics)}

          {/* Image Gallery */}
          {renderImageGallery(result.product.allImages)}

          {/* Description */}
          <div className="border rounded-lg shadow-sm p-4">
            <h3 className="text-md font-semibold mb-2">Description</h3>
            <div className="prose max-w-none whitespace-pre-wrap">
              {result.product.description}
            </div>
            {result.product.descriptionUrl !== "N/A" && (
              <p className="text-sm text-gray-500 mt-2">
                Source:{" "}
                <a
                  href={result.product.descriptionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View original description
                </a>
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400 italic">
            HTML size: {(rawHtml.length / 1024).toFixed(1)} KB. Click the button
            above to copy the full source.
          </p>
        </div>
      )}
    </div>
  );
}
