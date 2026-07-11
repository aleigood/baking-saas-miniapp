import type {
  RecipeVersionChangeItem,
  RecipeVersionChangeSummary,
} from "@/types/api";

const formatNumber = (value: number) => Number(value.toFixed(4)).toString();

const formatValue = (
  value: number | undefined,
  unit?: RecipeVersionChangeItem["unit"],
) => {
  const numericValue = value ?? 0;
  if (unit === "RATIO") return `${formatNumber(numericValue * 100)}%`;
  if (unit === "PERCENT") return `${Number(numericValue.toFixed(1))}%`;
  if (unit === "GRAM") return `${formatNumber(numericValue)}g`;
  if (unit === "CELSIUS") return `${formatNumber(numericValue)}℃`;
  return formatNumber(numericValue);
};

const formatDelta = (item: RecipeVersionChangeItem) => {
  const delta = (item.after ?? 0) - (item.before ?? 0);
  return `${delta >= 0 ? "↑" : "↓"}${formatValue(Math.abs(delta), item.unit)}`;
};

const fieldLabels: Record<string, string> = {
  targetTemp: "目标温度",
  lossRatio: "损耗率",
  divisionLoss: "单份余量",
  customWaterContent: "含水量",
};

const productIngredientPrefix = (item: RecipeVersionChangeItem) =>
  item.productName ? `${item.productName} · ` : "";

export const formatChangeItem = (item: RecipeVersionChangeItem) => {
  switch (item.kind) {
    case "INITIAL_VERSION":
      return "初始版本";
    case "NO_CHANGES":
      return "内容未发生变化";
    case "LEGACY_TEXT":
      return item.text || "历史修改记录";
    case "INGREDIENT_ADDED":
      return `新增 ${item.name}${item.basis === "FLOUR_SHARE" ? "面粉占比" : ""}${item.after !== undefined ? ` ${formatValue(item.after, item.unit)}` : ""}`;
    case "INGREDIENT_REMOVED":
      return `移除 ${item.name}${item.basis === "FLOUR_SHARE" ? "面粉占比" : ""}${item.before !== undefined ? ` ${formatValue(item.before, item.unit)}` : ""}`;
    case "INGREDIENT_RATIO_CHANGED":
      return `${item.name}${item.basis === "FLOUR_SHARE" ? "面粉占比" : ""} ${formatDelta(item)}`;
    case "DEPENDENCY_VERSION_CHANGED": {
      const prefix = productIngredientPrefix(item);
      const name = item.name || "子配方";
      return `${prefix}更新${name}${name.endsWith("配方") ? "" : "配方"}`;
    }
    case "PRODUCT_ADDED":
      return `新增产品 ${item.name}`;
    case "PRODUCT_REMOVED":
      return `移除产品 ${item.name}`;
    case "PRODUCT_WEIGHT_CHANGED":
      return `${item.name} ${formatDelta(item)}`;
    case "PRODUCT_INGREDIENT_ADDED":
      return `${productIngredientPrefix(item)}新增${item.name} ${formatValue(item.after, item.unit)}${item.unit === "GRAM" ? "/个" : ""}`;
    case "PRODUCT_INGREDIENT_REMOVED":
      return `${productIngredientPrefix(item)}移除${item.name}`;
    case "PRODUCT_INGREDIENT_AMOUNT_CHANGED":
      return `${productIngredientPrefix(item)}${item.name} ${formatDelta(item)}${item.unit === "GRAM" ? "/个" : ""}`;
    case "PROCEDURE_CHANGED":
      return item.scope === "PRODUCT"
        ? `调整${item.name || ""}制作步骤`
        : "调整配方制作步骤";
    case "FIELD_CHANGED":
      return `${fieldLabels[item.field || ""] || item.field || "字段"} ${formatDelta(item)}`;
  }
};

export const formatRecipeChangeSummary = (
  summary: RecipeVersionChangeSummary | null | undefined,
) => {
  if (!summary?.items?.length) return "";
  return summary.items.map(formatChangeItem).filter(Boolean).join("，");
};

export const formatRecipeVersionDate = (dateInput: string) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
};
