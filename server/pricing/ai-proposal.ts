import OpenAI from "openai";
import { z } from "zod";
import { pricingRulesSchema } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface GuidelineAnalysisRequest {
  guidelineText: string;
  loanType: 'rtl' | 'dscr';
  programName: string;
}

export interface ProposalResult {
  success: boolean;
  proposal?: z.infer<typeof pricingRulesSchema>;
  explanation?: string;
  error?: string;
}

const SYSTEM_PROMPT = `You are an expert loan pricing analyst. Your job is to analyze loan program guidelines and extract structured pricing rules.

You will receive program guidelines for either RTL (Real Estate/Fix & Flip) or DSCR (Debt Service Coverage Ratio) loans.

Your task is to extract and structure:

1. **Base Rates** - The starting interest rates by loan sub-type
   - For RTL: light_rehab, heavy_rehab, bridge_no_rehab, guc (ground-up construction)
   - For DSCR: 30yr_fixed, 5yr_arm, 7yr_arm, 10yr_arm, interest_only

2. **Points** - Default origination points (usually 1-3%)

3. **Adjusters** - Rate/point adjustments based on conditions like:
   - FICO score tiers (e.g., FICO < 700 adds +0.25%)
   - LTV thresholds (e.g., LTV > 75% adds +0.25%)
   - Property type (multifamily, commercial)
   - Loan purpose (cash_out, refinance)
   - Borrower experience tier
   - Special conditions (midstream, rural)

4. **Leverage Caps** - Maximum LTV/LTC/LTAIV/LTARV by borrower tier:
   - institutional, experienced, new_investor, no_experience

5. **Overlays** - Geographic or situational restrictions that modify leverage caps:
   - MSA-specific restrictions
   - State-specific rules

6. **Eligibility Rules** - Hard disqualifications:
   - Minimum FICO requirements
   - Prohibited combinations (e.g., no cash-out bridge for inexperienced)

Output a valid JSON object matching this exact schema:
{
  "product": "RTL" | "DSCR",
  "baseRates": { [loanSubType]: number },
  "points": { "default": number },
  "adjusters": [
    {
      "id": "unique_id",
      "label": "Human readable description",
      "when": { /* conditions */ },
      "rateAdd": number,
      "pointsAdd": number
    }
  ],
  "leverageCaps": [
    {
      "tier": "institutional" | "experienced" | "new_investor" | "no_experience",
      "loanTypes": ["loan_type1", "loan_type2"],
      "max": { "ltv": 0.XX, "ltc": 0.XX, "ltaiv": 0.XX, "ltarv": 0.XX }
    }
  ],
  "overlays": [
    {
      "id": "unique_id",
      "label": "Description",
      "when": { /* conditions */ },
      "effects": { "ltcAdd": -0.05, etc. }
    }
  ],
  "eligibilityRules": [
    {
      "id": "unique_id",
      "label": "Description",
      "when": { /* conditions */ },
      "result": "ineligible"
    }
  ]
}

Condition operators you can use in "when" clauses:
- ficoLt, ficoLte, ficoGt, ficoGte: FICO score comparisons
- ltvLt, ltvLte, ltvGt, ltvGte: LTV percentage comparisons
- dscrLt, dscrLte, dscrGt, dscrGte: DSCR ratio comparisons
- state: Single state code (e.g., "FL")
- stateIn: Array of state codes
- msaIn: Array of MSA names
- loanType: Specific loan sub-type
- tier: Borrower tier
- purpose: "purchase", "refinance", "cash_out"
- propertyType: Property type
- isMidstream: boolean
- isRural: boolean

Be conservative - only include rules you can clearly extract from the guidelines. If something is ambiguous, omit it rather than guess.`;

export async function analyzeGuidelines(request: GuidelineAnalysisRequest): Promise<ProposalResult> {
  try {
    const userPrompt = `Analyze the following ${request.loanType.toUpperCase()} loan program guidelines for "${request.programName}" and extract structured pricing rules.

PROGRAM GUIDELINES:
---
${request.guidelineText}
---

Extract all pricing rules, adjustments, and eligibility criteria. Return a JSON object with the complete pricing ruleset.

Also provide a brief explanation of what you extracted and any assumptions you made.

Format your response as:
{
  "ruleset": { /* the complete pricing rules JSON */ },
  "explanation": "Brief explanation of extracted rules and assumptions"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "No response from AI" };
    }

    const parsed = JSON.parse(content);
    
    // Validate the ruleset against our schema
    const rulesetResult = pricingRulesSchema.safeParse(parsed.ruleset);
    
    if (!rulesetResult.success) {
      console.error("Ruleset validation failed:", rulesetResult.error);
      return { 
        success: false, 
        error: `Generated ruleset validation failed: ${rulesetResult.error.errors.map(e => e.message).join(", ")}` 
      };
    }

    return {
      success: true,
      proposal: rulesetResult.data,
      explanation: parsed.explanation || "Successfully extracted pricing rules from guidelines."
    };
  } catch (error) {
    console.error("AI analysis error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to analyze guidelines" 
    };
  }
}

export async function refineProposal(
  currentRuleset: z.infer<typeof pricingRulesSchema>,
  feedback: string
): Promise<ProposalResult> {
  try {
    const userPrompt = `I have the following pricing ruleset that needs refinement:

CURRENT RULESET:
${JSON.stringify(currentRuleset, null, 2)}

USER FEEDBACK:
${feedback}

Please modify the ruleset based on the feedback and return the updated version.

Format your response as:
{
  "ruleset": { /* the updated pricing rules JSON */ },
  "explanation": "What changes were made based on the feedback"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "No response from AI" };
    }

    const parsed = JSON.parse(content);
    
    const rulesetResult = pricingRulesSchema.safeParse(parsed.ruleset);
    
    if (!rulesetResult.success) {
      return { 
        success: false, 
        error: `Refined ruleset validation failed: ${rulesetResult.error.errors.map(e => e.message).join(", ")}` 
      };
    }

    return {
      success: true,
      proposal: rulesetResult.data,
      explanation: parsed.explanation || "Successfully refined pricing rules."
    };
  } catch (error) {
    console.error("AI refinement error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to refine ruleset" 
    };
  }
}
