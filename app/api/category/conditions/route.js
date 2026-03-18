// app/api/category/conditions/route.js
import { NextResponse } from "next/server";
import { db } from "../../../utils/d1/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categoryName = searchParams.get("name");
  const currentCondition = searchParams.get("current"); // Optional: validate a specific condition

  if (!categoryName) {
    return NextResponse.json(
      { success: false, error: "Category name is required" },
      { status: 400 },
    );
  }

  try {
    // First, get the category and its condition group
    const categoryResult = await db.execute(
      `SELECT 
        c.slug,
        c.name,
        c.condition_group_id,
        cond.group_key,
        cond.group_name
       FROM categories c
       LEFT JOIN conditions cond ON c.condition_group_id = cond.id
       WHERE c.name = ?`,
      [categoryName],
    );

    if (!categoryResult || categoryResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Category not found",
        },
        { status: 404 },
      );
    }

    const category = categoryResult[0];

    // If no condition group is mapped, return empty options
    if (!category.condition_group_id) {
      return NextResponse.json({
        success: true,
        data: {
          category: {
            name: category.name,
            slug: category.slug,
          },
          conditionGroup: null,
          options: [],
          metadata: {
            totalOptions: 0,
            defaultOption: null,
            hasValidMapping: false,
          },
        },
      });
    }

    // Get condition options for this group using the view
    const optionsResult = await db.execute(
      `SELECT 
        option_value,
        option_order
       FROM condition_options 
       WHERE condition_group_id = ? 
       ORDER BY option_order ASC`,
      [category.condition_group_id],
    );

    // Format options for the dropdown
    const options = optionsResult.map((row) => ({
      value: row.option_value,
      label: row.option_value,
    }));

    // Get default option (first in list)
    const defaultOption = options.length > 0 ? options[0].value : null;

    // Validate current condition if provided
    let isValidCondition = null;
    let suggestedCondition = null;

    if (currentCondition && options.length > 0) {
      isValidCondition = options.some((opt) => opt.value === currentCondition);

      if (!isValidCondition) {
        // Suggest the first option as default
        suggestedCondition = defaultOption;
      }
    }

    // Get all condition groups for reference (useful for debugging)
    const allGroupsResult = await db.execute(
      `SELECT 
        id,
        group_key,
        group_name
       FROM conditions
       ORDER BY group_name`,
    );

    return NextResponse.json({
      success: true,
      data: {
        category: {
          name: category.name,
          slug: category.slug,
        },
        conditionGroup: {
          id: category.condition_group_id,
          group_key: category.group_key,
          group_name: category.group_name,
        },
        options,
        metadata: {
          totalOptions: options.length,
          defaultOption,
          hasValidMapping: true,
          ...(currentCondition && {
            currentCondition,
            isValid: isValidCondition,
            suggestedCondition,
          }),
        },
      },
      debug: {
        allGroups: allGroupsResult, // Optional: remove in production
      },
    });
  } catch (error) {
    console.error("Error fetching condition options:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch condition options",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

// Optional: POST endpoint to validate a condition
export async function POST(request) {
  try {
    const body = await request.json();
    const { categoryName, condition } = body;

    if (!categoryName || !condition) {
      return NextResponse.json(
        { success: false, error: "Category name and condition are required" },
        { status: 400 },
      );
    }

    // Get category and validate condition
    const categoryResult = await db.execute(
      `SELECT 
        c.condition_group_id
       FROM categories c
       WHERE c.name = ?`,
      [categoryName],
    );

    if (!categoryResult || categoryResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Category not found",
        },
        { status: 404 },
      );
    }

    const category = categoryResult[0];

    if (!category.condition_group_id) {
      return NextResponse.json({
        success: true,
        data: {
          isValid: false,
          message: "Category has no condition group mapped",
        },
      });
    }

    // Check if condition exists in the group
    const validationResult = await db.execute(
      `SELECT 
        COUNT(*) as count
       FROM condition_options 
       WHERE condition_group_id = ? AND option_value = ?`,
      [category.condition_group_id, condition],
    );

    const isValid = validationResult[0]?.count > 0;

    // Get suggested condition if invalid
    let suggestedCondition = null;
    if (!isValid) {
      const defaultResult = await db.execute(
        `SELECT 
          option_value
         FROM condition_options 
         WHERE condition_group_id = ? 
         ORDER BY option_order ASC 
         LIMIT 1`,
        [category.condition_group_id],
      );
      suggestedCondition = defaultResult[0]?.option_value || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        isValid,
        suggestedCondition,
        message: isValid
          ? "Condition is valid for this category"
          : "Condition is not valid for this category",
      },
    });
  } catch (error) {
    console.error("Error validating condition:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate condition" },
      { status: 500 },
    );
  }
}
