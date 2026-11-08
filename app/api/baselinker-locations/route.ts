// app/api/baselinker-locations/route.ts
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentUser } from "../../utils/auth";

interface BLWarehouse {
  warehouse_type: string;      // "bl" | "shop" | "warehouse" | ...
  warehouse_id: number;
  internal_warehouse_id?: number;
  name: string;
  description?: string;
  stock_edition?: boolean;
  is_default?: boolean;
  address?: string;
  postcode?: string;
  city?: string;
  country?: string;
}

export interface LocationItem {
  id: string;                  // "bl_205"
  name: string;                // "Default"
  type: string;                // "bl" | "shop" | ...
  city?: string;
  country?: string;
  is_default: boolean;
  has_stock_edition: boolean;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { env } = await getCloudflareContext({ async: true });
  const token =
    (env as any).BASELINKER_TOKEN ?? process.env.BASELINKER_TOKEN ?? null;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error:
          "BASELINKER_TOKEN is not configured (set it in Cloudflare secrets or .env).",
      },
      { status: 500 },
    );
  }

  try {
    const body = new URLSearchParams({
      method: "getInventoryWarehouses",
      parameters: "{}",
    });

    const res = await fetch("https://api.baselinker.com/connector.php", {
      method: "POST",
      headers: {
        "X-BLToken": token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      next: { revalidate: 300 },
    });

    const json = (await res.json()) as {
      status?: string;
      error_message?: string;
      error_code?: string;
      warehouses?: BLWarehouse[];
    };

    if (json.status !== "SUCCESS") {
      return NextResponse.json(
        {
          success: false,
          error:
            json.error_message ||
            `Baselinker returned status ${json.status ?? "unknown"}`,
        },
        { status: 502 },
      );
    }

    // Composite ID format matches addInventoryProduct /
    // updateInventoryProductsStock: `${warehouse_type}_${warehouse_id}`.
    const locations: LocationItem[] = (json.warehouses || [])
      .map((w) => ({
        id: `${w.warehouse_type}_${w.warehouse_id}`,
        name: w.name,
        type: w.warehouse_type,
        city: w.city || undefined,
        country: w.country || undefined,
        is_default: !!w.is_default,
        has_stock_edition: !!w.stock_edition,
      }))
      .sort((a, b) => {
        // Defaults first, then Base-native (bl), then alphabetical by name.
        if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
        if (a.type === "bl" && b.type !== "bl") return -1;
        if (a.type !== "bl" && b.type === "bl") return 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json(
      { success: true, locations },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (err: any) {
    console.error("[baselinker/locations] fetch failed:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Request to Baselinker failed" },
      { status: 500 },
    );
  }
}