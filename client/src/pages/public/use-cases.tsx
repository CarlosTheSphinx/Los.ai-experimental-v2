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
        "Manage multiple lender relationships, compare rates instantly, and give borrowers a seamless application experience.",
      benefits: [
        "Connect to multiple lenders in seconds",
        "Real-time rate shopping",
        "Automated compliance checking",
        "Faster closings, higher volume",
      ],
    },
    {
      icon: Building,
      title: "Community Banks",
      description:
        "Modernize your lending operations with AI-powered underwriting while maintaining the personal touch your customers love.",
      benefits: [
        "Streamline local lending workflows",
        "Maintain customer relationships",
        "Reduce manual underwriting",
        "Stay competitive with larger banks",
      ],
    },
    {
      icon: Users,
      title: "Credit Unions",
      description:
        "Serve your members better with faster approvals, transparent pricing, and a mobile-first borrower experience.",
      benefits: [
        "Member-first experience",
        "Faster approval times",
        "Enhanced member communications",
        "Increased member satisfaction",
      ],
    },
    {
      icon: BarChart3,
      title: "Commercial Lenders",
      description:
        "Complex deal structures made simple. Multi-property portfolios, DSCR calculations, and commercial underwriting workflows.",
      benefits: [
        "Handle complex deal structures",
        "Automated property analysis",
        "DSCR and cash flow calculations",
        "Commercial deal pipeline management",
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
              Built for Every Type of Lender
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you're a broker, bank, credit union, or commercial lender,
              Lendry.AI has a solution for you.
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
                Helping Lenders Succeed
              </h2>
              <p className="text-background/80 max-w-2xl mx-auto">
                Our platform is trusted by lenders of all sizes to streamline
                their operations and improve borrower experiences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  value: "50%",
                  label: "Faster Loan Closings",
                },
                {
                  value: "60%",
                  label: "Reduced Manual Work",
                },
                {
                  value: "3x",
                  label: "More Loan Volume",
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
                Lendry.AI integrates seamlessly with the tools and systems you
                already use, from loan origination systems to document management
                platforms.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "LOS Integration",
                "Bank APIs",
                "Document Tools",
                "Compliance",
                "Analytics",
                "CRM Systems",
                "Email & SMS",
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
                Let's Find the Right Solution for You
              </h2>
              <p className="text-xl text-muted-foreground">
                Schedule a personalized demo with our lending experts.
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
