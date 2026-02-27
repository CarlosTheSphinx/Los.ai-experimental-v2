import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublicLayout } from "@/components/PublicLayout";
import {
  Briefcase,
  Building,
  Users,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export default function PublicUseCasesPage() {
  const useCases = [
    {
      icon: Briefcase,
      title: "Mortgage Brokers",
      description:
        "Processing applications manually = bottleneck that kills growth. Lendry.AI automates the busywork so you close more deals.",
      benefits: [
        "Auto-qualify borrowers in minutes",
        "Instant document verification",
        "Real-time borrower updates",
        "5x deal volume increase",
      ],
    },
    {
      icon: Building,
      title: "Community Banks",
      description:
        "Limited staff can't keep up with loan volume without hiring. Lendry.AI lets your existing team do more with less.",
      benefits: [
        "Automate repetitive tasks",
        "Free up loan officers for relationship building",
        "Reduce approval times by 60%",
        "Stay competitive with larger banks",
      ],
    },
    {
      icon: Users,
      title: "Credit Unions",
      description:
        "Legacy systems can't scale with member demand. Modernize your lending operations without replacing everything.",
      benefits: [
        "Seamless integration with existing systems",
        "Member satisfaction through visibility",
        "Compliance automation built-in",
        "99% member satisfaction",
      ],
    },
    {
      icon: BarChart3,
      title: "Private Lenders",
      description:
        "Manual underwriting = slower closings and lost deals. Move faster with AI-powered risk assessment and due diligence.",
      benefits: [
        "AI-powered risk assessment",
        "Quick turnaround on due diligence",
        "Competitive edge with speed",
        "3-day average closing time",
      ],
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="py-24 lg:py-32 bg-gradient-to-b from-background to-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
              Built for Every Lender
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you're a broker, bank, or alternative lender — Lendry.AI scales with you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {useCases.map((useCase, idx) => {
              const Icon = useCase.icon;
              return (
                <motion.div key={idx} variants={itemVariants}>
                  <Card className="p-8 h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold">{useCase.title}</h3>
                    </div>

                    <p className="text-muted-foreground mb-6">
                      {useCase.description}
                    </p>

                    <div className="space-y-3 mb-8">
                      {useCase.benefits.map((benefit, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-2"></div>
                          <p className="text-sm">{benefit}</p>
                        </div>
                      ))}
                    </div>

                    <Link href="/contact">
                      <Button variant="outline" className="w-full">
                        Learn More
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 lg:py-32 bg-foreground text-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-4">
                Impact Across the Industry
              </h2>
              <p className="text-background/80 max-w-2xl mx-auto">
                Lendry.AI is trusted by lending teams of all sizes to automate operations and scale without overhead.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  value: "200+",
                  label: "Lending Teams Trust Us",
                },
                {
                  value: "$50M+",
                  label: "In Loans Processed",
                },
                {
                  value: "1.2M+",
                  label: "Applications Automated",
                },
                {
                  value: "99.9%",
                  label: "Uptime SLA",
                },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="text-4xl font-bold mb-2">{stat.value}</div>
                  <p className="text-background/80">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Integration Highlight */}
      <section className="py-24 lg:py-32 bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-8"
          >
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-4">
                Works with Your Existing Stack
              </h2>
              <p className="text-muted-foreground">
                Seamlessly integrate with tools you already use. Don't see your tool? We support custom API integrations.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "Encompass",
                "Salesforce",
                "DocuSign",
                "Stripe",
                "Slack",
                "Zapier",
                "Loan Depot",
                "Webhooks",
              ].map((integration, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-background border border-border text-sm font-medium"
                >
                  {integration}
                </div>
              ))}
            </div>

            <Link href="/contact">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                See All Integrations
              </Button>
            </Link>
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
                Your Lending Automation Starts Here
              </h2>
              <p className="text-xl text-muted-foreground">
                See how your team could benefit. Schedule a personalized demo.
              </p>
            </div>

            <Link href="/contact">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Schedule a Demo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
