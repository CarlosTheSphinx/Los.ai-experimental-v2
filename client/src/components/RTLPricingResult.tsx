import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type RTLPricingResponse } from "@shared/schema";
import { CheckCircle2, XCircle, AlertTriangle, RotateCcw, TrendingUp, Percent, DollarSign, Building } from "lucide-react";

interface RTLPricingResultProps {
  result: RTLPricingResponse;
  onReset: () => void;
}

export function RTLPricingResult({ result, onReset }: RTLPricingResultProps) {
  if (!result.eligible) {
    return (
      <Card className="w-full bg-white/90 backdrop-blur-sm shadow-xl border-red-200/60 overflow-hidden">
        <CardHeader className="bg-red-50/50 border-b border-red-100 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-red-800">Not Eligible</CardTitle>
              <CardDescription className="text-red-600">
                This loan does not meet program requirements
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-slate-700">Disqualification Reasons:</h3>
            {result.disqualifiers?.map((dq, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <Badge variant="outline" className="text-xs mb-1 border-red-200 text-red-600">{dq.id}</Badge>
                  <p className="text-sm text-slate-700">{dq.message}</p>
                </div>
              </div>
            ))}
          </div>

          {result.flags && result.flags.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="font-semibold text-slate-700">Additional Flags:</h3>
              {result.flags.map((flag, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700">{flag.message}</p>
                </div>
              ))}
            </div>
          )}

          <Button onClick={onReset} variant="outline" className="w-full" data-testid="button-rtl-reset">
            <RotateCcw className="h-4 w-4 mr-2" />
            Start New Quote
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-white/90 backdrop-blur-sm shadow-xl border-green-200/60 overflow-hidden">
      <CardHeader className="bg-green-50/50 border-b border-green-100 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-green-800">Eligible</CardTitle>
            <CardDescription className="text-green-600">
              Loan meets program requirements
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Percent className="h-4 w-4" />
              <span className="text-sm font-medium">Interest Rate</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-800" data-testid="text-rtl-rate">
                {result.finalRate?.toFixed(3)}%
              </span>
              {result.baseRate && result.finalRate && result.baseRate !== result.finalRate && (
                <span className="text-sm text-slate-500">
                  (base: {result.baseRate}%)
                </span>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Points</span>
            </div>
            <span className="text-3xl font-bold text-slate-800" data-testid="text-rtl-points">
              {result.points?.toFixed(2)}
            </span>
          </div>
        </div>

        {result.caps && (
          <div className="mb-6">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Maximum Leverage Caps
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-center">
                <span className="text-xs text-blue-600 font-medium">Max LTC</span>
                <div className="text-xl font-bold text-blue-800" data-testid="text-max-ltc">
                  {result.caps.maxLTC}%
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-center">
                <span className="text-xs text-purple-600 font-medium">Max LTAIV</span>
                <div className="text-xl font-bold text-purple-800" data-testid="text-max-ltaiv">
                  {result.caps.maxLTAIV}%
                </div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-center">
                <span className="text-xs text-indigo-600 font-medium">Max LTARV</span>
                <div className="text-xl font-bold text-indigo-800" data-testid="text-max-ltarv">
                  {result.caps.maxLTARV}%
                </div>
              </div>
            </div>
          </div>
        )}

        {result.appliedAdjusters && result.appliedAdjusters.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-slate-700 mb-3">Rate Adjustments Applied:</h3>
            <div className="space-y-2">
              {result.appliedAdjusters.map((adj, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-100">
                  <span className="text-sm text-slate-700">{adj.label}</span>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                    +{adj.rateAdd.toFixed(2)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.flags && result.flags.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-slate-700 mb-3">Flags & Notes:</h3>
            <div className="space-y-2">
              {result.flags.map((flag, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700">{flag.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={onReset} variant="outline" className="w-full" data-testid="button-rtl-new-quote">
          <RotateCcw className="h-4 w-4 mr-2" />
          Start New Quote
        </Button>
      </CardContent>
    </Card>
  );
}
