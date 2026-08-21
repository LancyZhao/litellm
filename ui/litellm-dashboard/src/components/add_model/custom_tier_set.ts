import type { ComplexityTiers } from "./ComplexityRouterConfig";

export interface TierDraft {
  /** React key and fallback pointer target; never serialized. */
  id: string;
  name: string;
  /** Blank on a built-in name inherits the built-in criteria. */
  definition: string;
  models: string[];
}

// Absent means the built-in four-tier router and a payload identical to before this field existed.
export interface CustomTierSet {
  tiers: TierDraft[];
  fallback_tier_id: string;
}

const BUILT_IN_TIER_NAMES = Object.keys({
  SIMPLE: null,
  MEDIUM: null,
  COMPLEX: null,
  REASONING: null,
} satisfies Record<keyof ComplexityTiers, null>);

/**
 * The one rule for comparing two tier names, matching how the backend resolves them
 * (`casefold` in litellm/router_strategy/complexity_router/config.py). Every name lookup,
 * uniqueness check, and pointer resolution goes through here so they cannot disagree.
 */
export const foldTierName = (name: string): string => name.trim().toLowerCase();

export const tierNamesMatch = (left: string, right: string): boolean => foldTierName(left) === foldTierName(right);

export const findTierByName = <T extends { name: string }>(rows: readonly T[], name: string): T | undefined =>
  rows.find((row) => tierNamesMatch(row.name, name));

export const isBuiltInTierName = (name: string): boolean =>
  BUILT_IN_TIER_NAMES.some((tier) => tierNamesMatch(tier, name));

export const getCustomTierRowsError = (customTierSet: CustomTierSet): string | null => {
  const rows = customTierSet.tiers;
  if (rows.some((row) => !row.name.trim())) return "Name every tier";
  const names = rows.map((row) => foldTierName(row.name));
  if (new Set(names).size !== names.length) return "Tier names must be unique";
  if (rows.some((row) => !row.definition.trim() && !isBuiltInTierName(row.name)))
    return "Every custom tier needs a definition: it is the rubric the classifier routes on";
  if (rows.some((row) => row.models.length === 0)) return "Select at least one model for every tier";
  if (!rows.some((row) => row.id === customTierSet.fallback_tier_id))
    return "Pick a Fallback Tier for classifier failures";
  return null;
};
