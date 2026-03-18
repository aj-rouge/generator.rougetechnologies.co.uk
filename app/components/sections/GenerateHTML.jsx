"use client";

import { useState, useEffect } from "react";
import { html as beautify } from "js-beautify";

export default function GenerateHTML({ formData }) {
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState("");

  // Reset state if form data changes so user doesn't copy "old" version
  useEffect(() => {
    if (generatedHtml) {
      setGeneratedHtml("");
      setCopySuccess(false);
    }
  }, [formData]);

  const handleAction = async () => {
    // If HTML exists, this button acts as the Copy trigger
    if (generatedHtml) {
      copyToClipboard();
      return;
    }

    if (!formData?.title) {
      setError("Please fill in the title first");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to generate HTML");

      const html = await response.text();
      setGeneratedHtml(html);
    } catch (err) {
      setError(err.message);
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    // Copies the original minified one-line string from the API
    navigator.clipboard.writeText(generatedHtml).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // BEAUTIFIER LOGIC: Converts the 1-line string into readable code for the UI
  const getReadableHtml = (html) => {
    if (!html) return "";
    return beautify(html, {
      indent_size: 2,
      indent_char: " ",
      max_preserve_newlines: 1,
      preserve_newlines: true,
      wrap_line_length: 60,
      indent_inner_html: true,
    });
  };

  // Dynamic Button State
  const getButtonState = () => {
    if (isGenerating)
      return {
        text: "Generating...",
        style: "bg-blue-400 cursor-wait",
        disabled: true,
      };
    if (copySuccess)
      return {
        text: "✓ Copied to Clipboard!",
        style: "bg-green-600",
        disabled: false,
      };
    if (generatedHtml)
      return {
        text: "Copy Generated HTML",
        style: "bg-green-500 hover:bg-green-600",
        disabled: false,
      };

    return {
      text: "Generate HTML",
      style: "bg-blue-500 hover:bg-blue-600 disabled:opacity-50",
      disabled: !formData?.title,
    };
  };

  const state = getButtonState();

  return (
    <div className="w-full space-y-4">
      {/* Main Action Button */}
      <button
        onClick={handleAction}
        disabled={state.disabled}
        className={`${state.style} w-full text-white py-4 rounded-lg font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2`}
      >
        {state.text}
      </button>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">
            ⚠️ {error}
          </p>
        </div>
      )}

      {/* Preview Section */}
      {generatedHtml && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                HTML Code Preview
              </h3>
              <p className="text-sm text-gray-400 italic">
                The copied code is optimized as one-line text.
              </p>
            </div>
            <button
              onClick={() => setGeneratedHtml("")}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors underline"
            >
              Clear
            </button>
          </div>

          <div className="relative">
            <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-sm h-80 overflow-auto border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-mono leading-relaxed shadow-inner">
              <code>{getReadableHtml(generatedHtml)}</code>
            </pre>

            {/* Subtle Gradient to indicate more code below */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent pointer-events-none rounded-b-md" />
          </div>
        </div>
      )}
    </div>
  );
}
