import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublicLayout } from "@/components/PublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, X, ArrowRight, TrendingUp, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function PublicPricingPage() {
  const tiers = [
    {
      name: "Broker",
      tagline: "For individual brokers getting started with automation",
      description: "Everything you need to automate your loan pipeline and close deals faster.",
      features: [
        "Up to 10 active loans",
        "Up to 3 users",
        "All 3 AI Agents",
        "AI Chat (29 tools)",
        "E-Signatures",
        "Basic reporting",
      ],
      highlighted: false,
    },
    {
      name: "Originator",
      tagline: "For growing lending teams ready to scale",
      description: "Unlock higher volume, cloud sync, and advanced analytics for your team.",
      features: [
        "Up to 50 active loans",
        "Unlimited users",
        "All 3 AI Agents",
        "AI Chat (29 tools)",
        "E-Signatures",
        "Cloud Storage Sync",
        "Advanced reporting",
      ],
      highlighted: true,
    },
    {
      name: "Enterprise",
      tagline: "For high-volume operations needing full customization",
      description: "Custom integrations, dedicated deployment, and white-glove onboarding.",
      features: [
        "100+ active loans",
        "Unlimited users",
        "All 3 AI Agents",
        "AI Chat (29 tools)",
        "E-Signatures",
        "Cloud Storage Sync",
        "Custom Integrations",
        "Dedicated Deployment",
      ],
      highlighted: false,
    },
  ];

  const comparisonFeatures = [
    { feature: "AI Document Intelligence", lendry: "GPT-4o agents", bigGuys: "None", industry: "Basic summaries", lendryHas: true, bigGuysHas: false, industryHas: false },
    { feature: "AI Deal Analysis", lendry: "Processor Agent", bigGuys: "None", industry: "None", lendryHas: true, bigGuysHas: false, industryHas: false },
    { feature: "AI Communication Drafts", lendry: "Auto email/SMS", bigGuys: "Manual", industry: "Not specified", lendryHas: true, bigGuysHas: false, industryHas: false },
    { feature: "AI Assistant Chat (29 tools)", lendry: "Natural language", bigGuys: "None", industry: "None", lendryHas: true, bigGuysHas: false, industryHas: false },
    { feature: "Daily AI Briefings", lendry: "Per processor", bigGuys: "None", industry: "None", lendryHas: true, bigGuysHas: false, industryHas: false },
    { feature: "E-Signature Integration", lendry: "PandaDoc", bigGuys: "E-sign ready", industry: "Native", lendryHas: true, bigGuysHas: true, industryHas: true },
    { feature: "Cloud Storage Sync", lendry: "GDrive + OneDrive", bigGuys: "None", industry: "None", lendryHas: true, bigGuysHas: false, industryHas: false },
    { feature: "Borrower/Broker Portal", lendry: "Self-service", bigGuys: "Portal", industry: "White-labeled", lendryHas: true, bigGuysHas: true, industryHas: true },
    { feature: "Modern UX", lendry: "React/Tailwind", bigGuys: "Dated/clunky", industry: "Clean UI", lendryHas: true, bigGuysHas: false, industryHas: true },
    { feature: "Unlimited Users", lendry: "Included", bigGuys: "Per-user pricing", industry: "Included", lendryHas: true, bigGuysHas: false, industryHas: true },
  ];

  const faqs = [
    {
      question: "How does the demo work?",
      answer:
        "We'll walk you through the platform live, tailored to your specific lending workflow. After the demo, we'll recommend the right tier for your team and provide a custom quote. No commitment required.",
    },
    {
      question: "Why is pricing loan-based instead of per-user?",
      answer:
        "Because our costs scale with deal volume, not team size. All tiers include unlimited users (Broker starts with 3) and full AI capabilities. AI is standard — customization is the upsell.",
    },
    {
      question: "Can I change plans anytime?",
      answer:
        "Yes, absolutely. Upgrade or downgrade your plan at any time. Changes take effect immediately. If you upgrade mid-billing cycle, we'll prorate the difference. If you downgrade, the new rate applies to your next billing date.",
    },
    {
      question: "What happens if I exceed my active loan limit?",
      answer:
        "We'll notify you when you're approaching your limit. You have two options: upgrade to a higher tier immediately, or pay per additional loan depending on your tier. No service interruption.",
    },
    {
      question: "Do you offer annual pricing?",
      answer:
        "Yes, we offer discounts for annual billing on all tiers. Request a demo and we'll share the details based on your needs.",
    },
    {
      question: "Can you build a custom plan for my team?",
      answer:
        "Absolutely. If our standard tiers don't match your needs, our team can create a custom Enterprise plan. Request a demo and we'll work with you to build the perfect solution.",
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="py-24 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 mb-12"
          >
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
              Three Tiers. One Powerful Platform.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Loan-based pricing that scales with your business, not your headcount. All tiers include full AI capabilities. Request a demo to get a custom quote.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {tiers.map((tier, idx) => (
              <motion.div key={idx} variants={itemVariants}>
                <Card
                  className={`p-6 h-full flex flex-col relative bg-white ${
                    tier.highlighted ? "ring-2 ring-blue-500 shadow-lg" : ""
                  }`}
                >
                  {tier.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {tier.tagline}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tier.description}
                    </p>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {tier.features.map((feature, featureIdx) => (
                      <li key={featureIdx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/contact">
                    <Button
                      className={`w-full ${
                        tier.highlighted
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                      size="lg"
                      data-testid={`button-request-demo-${tier.name.toLowerCase()}`}
                    >
                      Request a Demo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ROI Argument Section */}
      <section className="py-24 lg:py-32 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-blue-600 tracking-wide uppercase mb-3">
              The ROI Argument
            </p>
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Dramatically Reduce Your Operating Costs
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Replace manual processes and fragmented tools with a single automated platform.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
          >
            {/* Without Lendry */}
            <Card className="p-8 border-red-200 bg-red-50/50">
              <h3 className="text-lg font-bold text-red-700 uppercase tracking-wide mb-6">
                Without Lendry
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Loan processors</span>
                  <span className="text-sm font-semibold text-red-600">High salary costs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">CRM + LOS subscriptions</span>
                  <span className="text-sm font-semibold text-red-600">Multiple tools</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Manual document review</span>
                  <span className="text-sm font-semibold text-red-600">Hours per deal</span>
                </div>
                <div className="border-t border-red-200 pt-4">
                  <p className="text-sm font-bold text-red-700">Fragmented, expensive, and slow</p>
                </div>
              </div>
            </Card>

            {/* With Lendry */}
            <Card className="p-8 border-green-200 bg-green-50/50">
              <h3 className="text-lg font-bold text-green-700 uppercase tracking-wide mb-6">
                With Lendry
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">AI-powered processing</span>
                  <span className="text-sm font-semibold text-green-600">Automated</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">All-in-one platform</span>
                  <span className="text-sm font-semibold text-green-600">One subscription</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">AI document review</span>
                  <span className="text-sm font-semibold text-green-600">Seconds per deal</span>
                </div>
                <div className="border-t border-green-200 pt-4">
                  <p className="text-sm font-bold text-green-700">Unified, affordable, and instant</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ROI Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { icon: TrendingUp, value: "85%", label: "Reduction in Processing Costs" },
              { icon: Clock, value: "10x", label: "Faster Document Review" },
              { icon: Users, value: "4-6", label: "Employees Replaced at Scale" },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card key={idx} className="p-6 text-center">
                  <Icon className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </Card>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              How We Compare
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Lendry.AI is a Loan Automation System — AI is the foundation, not a feature. See how we stack up.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="overflow-x-auto"
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-500 w-1/4">Capability</th>
                  <th className="text-center py-4 px-4 text-sm font-bold text-blue-600 w-1/4">Lendry.AI</th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-gray-500 w-1/4">The Big Guys</th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-gray-500 w-1/4">Industry Standard</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, idx) => (
                  <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                    <td className="py-3.5 px-4 text-sm font-medium text-gray-700">
                      {row.feature}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-sm ${row.lendryHas ? 'text-green-600 font-medium' : 'text-red-500'}`}>
                        {row.lendryHas ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {row.lendry}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-sm ${row.bigGuysHas ? 'text-green-600' : 'text-red-500'}`}>
                        {row.bigGuysHas ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {row.bigGuys}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-sm ${row.industryHas ? 'text-green-600' : 'text-red-500'}`}>
                        {row.industryHas ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {row.industry}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 lg:py-32 bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Have questions? We're here to help.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`}>
                  <AccordionTrigger className="hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-4">
                Ready to Process More Deals?
              </h2>
              <p className="text-xl text-muted-foreground">
                See Lendry.AI in action. Request a personalized demo today.
              </p>
            </div>

            <Link href="/contact">
              <Button size="lg" className="bg-primary hover:bg-primary/90" data-testid="button-request-demo-cta">
                Request a Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
