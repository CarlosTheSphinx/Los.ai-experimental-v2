import type { RuleCondition } from "@shared/schema";

export interface PricingInputs {
  loanType?: string;
  purpose?: string;
  tier?: string;
  propertyType?: string;
  state?: string;
  fico?: number;
  ltv?: number;
  dscr?: number;
  loanAmount?: number;
  isMidstream?: boolean;
  isRural?: boolean;
  msa?: string;
  [key: string]: unknown;
}

/**
 * Matches rule conditions against pricing inputs.
 * 
 * Important behavior for numeric comparisons:
 * - If a comparator condition exists (e.g., ficoLt: 700) but the corresponding
 *   input is undefined, the condition returns FALSE (conservative approach).
 *   This prevents rules from accidentally applying when data is missing.
 */
export function matches(when: RuleCondition | undefined, inputs: PricingInputs): boolean {
  if (!when) return true;

  // Exact match conditions for string fields
  for (const key of ["loanType", "purpose", "tier", "propertyType", "state"] as const) {
    if (when[key] !== undefined && when[key] !== inputs[key]) return false;
  }

  // FICO score comparisons (with all variants: Lt, Lte, Gt, Gte)
  if (typeof when.ficoLt === "number") {
    if (inputs.fico === undefined || !(inputs.fico < when.ficoLt)) return false;
  }
  if (typeof when.ficoLte === "number") {
    if (inputs.fico === undefined || !(inputs.fico <= when.ficoLte)) return false;
  }
  if (typeof when.ficoGt === "number") {
    if (inputs.fico === undefined || !(inputs.fico > when.ficoGt)) return false;
  }
  if (typeof when.ficoGte === "number") {
    if (inputs.fico === undefined || !(inputs.fico >= when.ficoGte)) return false;
  }

  // LTV comparisons (with all variants)
  if (typeof when.ltvLt === "number") {
    if (inputs.ltv === undefined || !(inputs.ltv < when.ltvLt)) return false;
  }
  if (typeof when.ltvLte === "number") {
    if (inputs.ltv === undefined || !(inputs.ltv <= when.ltvLte)) return false;
  }
  if (typeof when.ltvGt === "number") {
    if (inputs.ltv === undefined || !(inputs.ltv > when.ltvGt)) return false;
  }
  if (typeof when.ltvGte === "number") {
    if (inputs.ltv === undefined || !(inputs.ltv >= when.ltvGte)) return false;
  }

  // DSCR comparisons (with all variants)
  if (typeof when.dscrLt === "number") {
    if (inputs.dscr === undefined || !(inputs.dscr < when.dscrLt)) return false;
  }
  if (typeof when.dscrLte === "number") {
    if (inputs.dscr === undefined || !(inputs.dscr <= when.dscrLte)) return false;
  }
  if (typeof when.dscrGt === "number") {
    if (inputs.dscr === undefined || !(inputs.dscr > when.dscrGt)) return false;
  }
  if (typeof when.dscrGte === "number") {
    if (inputs.dscr === undefined || !(inputs.dscr >= when.dscrGte)) return false;
  }

  // Loan amount comparisons (with all variants)
  if (typeof when.loanAmountLt === "number") {
    if (inputs.loanAmount === undefined || !(inputs.loanAmount < when.loanAmountLt)) return false;
  }
  if (typeof when.loanAmountLte === "number") {
    if (inputs.loanAmount === undefined || !(inputs.loanAmount <= when.loanAmountLte)) return false;
  }
  if (typeof when.loanAmountGt === "number") {
    if (inputs.loanAmount === undefined || !(inputs.loanAmount > when.loanAmountGt)) return false;
  }
  if (typeof when.loanAmountGte === "number") {
    if (inputs.loanAmount === undefined || !(inputs.loanAmount >= when.loanAmountGte)) return false;
  }

  // Boolean conditions
  if (when.isMidstream === true && inputs.isMidstream !== true) return false;
  if (when.isRural === true && inputs.isRural !== true) return false;

  // Array membership conditions
  if (Array.isArray(when.msaIn)) {
    if (!inputs.msa || !when.msaIn.includes(inputs.msa)) return false;
  }
  
  if (Array.isArray(when.stateIn)) {
    if (!inputs.state || !when.stateIn.includes(inputs.state)) return false;
  }

  return true;
}
