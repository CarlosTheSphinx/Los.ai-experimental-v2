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
  msa?: string;
  [key: string]: unknown;
}

export function matches(when: RuleCondition | undefined, inputs: PricingInputs): boolean {
  if (!when) return true;

  for (const key of ["loanType", "purpose", "tier", "propertyType", "state"] as const) {
    if (when[key] !== undefined && when[key] !== inputs[key]) return false;
  }

  if (typeof when.ficoLt === "number" && inputs.fico !== undefined) {
    if (!(inputs.fico < when.ficoLt)) return false;
  }
  if (typeof when.ficoGte === "number" && inputs.fico !== undefined) {
    if (!(inputs.fico >= when.ficoGte)) return false;
  }

  if (typeof when.ltvLt === "number" && inputs.ltv !== undefined) {
    if (!(inputs.ltv < when.ltvLt)) return false;
  }
  if (typeof when.ltvGte === "number" && inputs.ltv !== undefined) {
    if (!(inputs.ltv >= when.ltvGte)) return false;
  }

  if (typeof when.dscrLt === "number" && inputs.dscr !== undefined) {
    if (!(inputs.dscr < when.dscrLt)) return false;
  }
  if (typeof when.dscrGte === "number" && inputs.dscr !== undefined) {
    if (!(inputs.dscr >= when.dscrGte)) return false;
  }

  if (typeof when.loanAmountLt === "number" && inputs.loanAmount !== undefined) {
    if (!(inputs.loanAmount < when.loanAmountLt)) return false;
  }
  if (typeof when.loanAmountGte === "number" && inputs.loanAmount !== undefined) {
    if (!(inputs.loanAmount >= when.loanAmountGte)) return false;
  }

  if (when.isMidstream === true && inputs.isMidstream !== true) return false;

  if (Array.isArray(when.msaIn)) {
    if (!inputs.msa || !when.msaIn.includes(inputs.msa)) return false;
  }

  return true;
}
