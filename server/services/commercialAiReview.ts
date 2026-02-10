import { storage } from "../storage";

export async function reviewCommercialSubmission(submissionId: number): Promise<{
  decision: 'auto_approved' | 'needs_review' | 'auto_declined';
  reason: string;
  riskFactors: string[];
  strengths: string[];
  score: number;
}> {
  const fallback = {
    decision: 'needs_review' as const,
    reason: 'AI review unavailable - manual review required',
    riskFactors: [] as string[],
    strengths: [] as string[],
    score: 50,
  };

  try {
    const submission = await storage.getCommercialSubmissionById(submissionId);
    if (!submission) {
      return { ...fallback, reason: 'Submission not found' };
    }

    const reviewRules = await storage.getSubmissionReviewRules();
    const criteria = await storage.getSubmissionCriteria();

    const activeRules = reviewRules.filter((r: any) => r.isActive !== false);
    const autoDeclineRules = activeRules.filter((r: any) => r.ruleCategory === 'auto_decline');
    const requestMoreInfoRules = activeRules.filter((r: any) => r.ruleCategory === 'request_more_info');
    const autoApproveRules = activeRules.filter((r: any) => r.ruleCategory === 'auto_approve');

    const activeCriteria = criteria.filter((c: any) => c.isActive !== false);
    const minLoanCriteria = activeCriteria.find((c: any) => c.criteriaType === 'min_loan_amount');
    const maxLoanCriteria = activeCriteria.find((c: any) => c.criteriaType === 'max_loan_amount');
    const approvedClassesCriteria = activeCriteria.filter((c: any) => c.criteriaType === 'approved_asset_class');
    const approvedStatesCriteria = activeCriteria.filter((c: any) => c.criteriaType === 'approved_state');

    const minLoan = minLoanCriteria?.criteriaValue || 'Not specified';
    const maxLoan = maxLoanCriteria?.criteriaValue || 'Not specified';
    const approvedClasses = approvedClassesCriteria.map((c: any) => c.criteriaValue);
    const approvedStates = approvedStatesCriteria.map((c: any) => c.criteriaValue);

    const systemPrompt = `You are a commercial loan underwriting AI assistant. Analyze this commercial deal submission and provide a structured review.

REVIEW RULES:
Auto-Decline Rules:
${autoDeclineRules.length > 0 ? autoDeclineRules.map((r: any) => `- ${r.ruleDescription}`).join('\n') : '- No auto-decline rules configured'}

Request More Info Rules:
${requestMoreInfoRules.length > 0 ? requestMoreInfoRules.map((r: any) => `- ${r.ruleDescription}`).join('\n') : '- No request-more-info rules configured'}

Auto-Approve Rules:
${autoApproveRules.length > 0 ? autoApproveRules.map((r: any) => `- ${r.ruleDescription}`).join('\n') : '- No auto-approve rules configured'}

SUBMISSION CRITERIA:
Min Loan: $${minLoan}
Max Loan: $${maxLoan}
Approved Asset Classes: ${approvedClasses.length > 0 ? approvedClasses.join(', ') : 'Not specified'}
Approved States: ${approvedStates.length > 0 ? approvedStates.join(', ') : 'Not specified'}

DEAL DETAILS:
Submitter: ${submission.brokerOrDeveloperName} (${submission.companyName})
Role on Deal: ${submission.roleOnDeal}
Email: ${submission.email}
Phone: ${submission.phone}

Loan Type: ${submission.loanType}
Requested Loan Amount: $${submission.requestedLoanAmount?.toLocaleString() || 'N/A'}
Requested LTV: ${submission.requestedLTV || 'N/A'}%
Requested LTC: ${submission.requestedLTC || 'N/A'}%
Interest Only: ${submission.interestOnly ? 'Yes' : 'No'}
Desired Close Date: ${submission.desiredCloseDate ? new Date(submission.desiredCloseDate).toLocaleDateString() : 'N/A'}
Loan Purpose: ${submission.loanPurpose || 'N/A'}
Requested Loan Term: ${submission.requestedLoanTerm || 'N/A'} months
Exit Strategy: ${submission.exitStrategyType || 'N/A'} - ${submission.exitStrategyDetails || 'N/A'}

Property Details:
Property Name: ${submission.propertyName}
Address: ${submission.propertyAddress}, ${submission.city}, ${submission.state} ${submission.zip}
County: ${submission.county || 'N/A'}
Property Type: ${submission.propertyType}
Occupancy Type: ${submission.occupancyType}
Units/SqFt: ${submission.unitsOrSqft}
Square Footage: ${submission.squareFootage || 'N/A'}
Year Built: ${submission.yearBuilt || 'N/A'}
Property Condition: ${submission.propertyCondition || 'N/A'}
Current Occupancy: ${submission.currentOccupancy ? `${submission.currentOccupancy}%` : 'N/A'}
Zoning: ${submission.zoning || 'N/A'}
Zoning Compliant: ${submission.zoningCompliant !== null ? (submission.zoningCompliant ? 'Yes' : 'No') : 'N/A'}
Environmental Issues: ${submission.environmentalIssues ? 'Yes' : 'No'}
${submission.environmentalDescription ? `Environmental Details: ${submission.environmentalDescription}` : ''}

Financial Details:
Purchase Price: $${submission.purchasePrice?.toLocaleString() || 'N/A'}
As-Is Value: $${submission.asIsValue?.toLocaleString() || 'N/A'}
ARV/Stabilized Value: $${submission.arvOrStabilizedValue?.toLocaleString() || 'N/A'}
Current NOI: $${submission.currentNOI?.toLocaleString() || 'N/A'}
In-Place Rent: $${submission.inPlaceRent?.toLocaleString() || 'N/A'}
Pro Forma NOI: $${submission.proFormaNOI?.toLocaleString() || 'N/A'}
LTV Calculated: ${submission.ltvCalculated || 'N/A'}%
DSCR Calculated: ${submission.dscrCalculated || 'N/A'}
Market Rent PSF: $${submission.marketRentPsf || 'N/A'}
Property Taxes Annual: $${submission.propertyTaxesAnnual?.toLocaleString() || 'N/A'}
Insurance Annual: $${submission.insuranceAnnual?.toLocaleString() || 'N/A'}

Construction/Capex Budget:
Total Capex Budget: $${submission.capexBudgetTotal?.toLocaleString() || 'N/A'}
Total Project Cost: $${submission.totalProjectCost?.toLocaleString() || 'N/A'}
Land Acquisition Cost: $${submission.landAcquisitionCost?.toLocaleString() || 'N/A'}
Hard Costs: $${submission.hardCosts?.toLocaleString() || 'N/A'}
Soft Costs: $${submission.softCosts?.toLocaleString() || 'N/A'}
Contingency: $${submission.contingency?.toLocaleString() || 'N/A'} (${submission.contingencyPercent || 'N/A'}%)
Project Timeline: ${submission.projectTimeline || 'N/A'} months
General Contractor: ${submission.generalContractor || 'N/A'}
GC Licensed/Bonded: ${submission.gcLicensedBonded !== null ? (submission.gcLicensedBonded ? 'Yes' : 'No') : 'N/A'}

Sponsor Information:
Primary Sponsor: ${submission.primarySponsorName}
Experience: ${submission.primarySponsorExperienceYears} years
Similar Projects Completed: ${submission.numberOfSimilarProjects}
Net Worth: $${submission.netWorth?.toLocaleString() || 'N/A'}
Liquidity: $${submission.liquidity?.toLocaleString() || 'N/A'}
Credit Score: ${submission.sponsorCreditScore || 'N/A'}
Personal Liquidity: $${submission.personalLiquidity?.toLocaleString() || 'N/A'}
Personal Net Worth: $${submission.personalNetWorth?.toLocaleString() || 'N/A'}

Entity Information:
Entity Name: ${submission.entityName || 'N/A'}
Entity Type: ${submission.entityType || 'N/A'}
Ownership Structure: ${submission.ownershipStructure || 'N/A'}

Portfolio/Track Record:
Total Units/SF Owned: ${submission.totalUnitsSfOwned || 'N/A'}
Current Portfolio Value: $${submission.currentPortfolioValue?.toLocaleString() || 'N/A'}
Similar Deals Last 3 Years: ${submission.similarDealsLast3Years || 'N/A'}
Ever Defaulted: ${submission.everDefaulted ? 'Yes' : 'No'}
${submission.defaultExplanation ? `Default Explanation: ${submission.defaultExplanation}` : ''}
Current Litigation: ${submission.currentLitigation ? 'Yes' : 'No'}
${submission.litigationExplanation ? `Litigation Explanation: ${submission.litigationExplanation}` : ''}
Bankruptcy Last 7 Years: ${submission.bankruptcyLast7Years ? 'Yes' : 'No'}
${submission.bankruptcyExplanation ? `Bankruptcy Explanation: ${submission.bankruptcyExplanation}` : ''}

Existing Debt:
Current Lender: ${submission.currentLender || 'N/A'}
Current Loan Balance: $${submission.currentLoanBalance?.toLocaleString() || 'N/A'}
Current Interest Rate: ${submission.currentInterestRate || 'N/A'}%
Loan Maturity Date: ${submission.loanMaturityDate ? new Date(submission.loanMaturityDate).toLocaleDateString() : 'N/A'}

Business Plan Summary:
${submission.businessPlanSummary || 'N/A'}

Additional Notes:
${submission.additionalNotes || 'None'}

Analyze this deal and return ONLY valid JSON (no markdown, no code blocks):
{
  "decision": "auto_approved" | "needs_review" | "auto_declined",
  "reason": "A clear explanation of why this decision was made",
  "riskFactors": ["list of risk factors identified"],
  "strengths": ["list of deal strengths"],
  "score": 0-100
}`;

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please analyze this commercial deal submission and provide your structured review.' },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return fallback;
    }

    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const validDecisions = ['auto_approved', 'needs_review', 'auto_declined'];
    const decision = validDecisions.includes(parsed.decision) ? parsed.decision : 'needs_review';
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 50;

    const result = {
      decision: decision as 'auto_approved' | 'needs_review' | 'auto_declined',
      reason: parsed.reason || 'No reason provided',
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      score,
    };

    await storage.createSubmissionAiReview({
      submissionId,
      decision: result.decision,
      decisionReason: result.reason,
      strengths: JSON.stringify(result.strengths),
      concerns: JSON.stringify(result.riskFactors),
      rulesChecked: activeRules.length,
      rulesPassed: result.decision === 'auto_approved' ? activeRules.length : 0,
      rulesFailed: result.decision === 'auto_declined' ? 1 : 0,
    });

    return result;
  } catch (error) {
    console.error('AI review error for submission', submissionId, error);
    return fallback;
  }
}
