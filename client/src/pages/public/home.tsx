import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublicLayout } from "@/components/PublicLayout";
import {
  Zap,
  FileCheck,
  Users,
  BarChart3,
  Building2,
  Shield,
  ArrowRight,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export default function PublicHomePage() {
  const features = [
    {
      icon: Zap,
      title: "AI-Powered Pricing",
      description:
        "Get instant, competitive rate quotes powered by machine learning. Our AI analyzes market conditions, borrower profiles, and your pricing rules in real-time.",
    },
    {
      icon: FileCheck,
      title: "Smart Document Management",
      description:
        "AI-powered document classification, extraction, and validation. Borrowers upload once, and our system handles the rest.",
    },
    {
      icon: Users,
      title: "Borrower Portal",
      description:
        "Give borrowers a premium, white-labeled experience. Real-time status tracking, secure document upload, and instant communication.",
    },
    {
      icon: BarChart3,
      title: "Deal Pipeline",
      description:
        "Visual pipeline management with Kanban boards, smart filters, and stage-based workflows. Never lose track of a deal.",
    },
    {
      icon: Building2,
      title: "Multi-Lender Platform",
      description:
        "One platform, unlimited lenders. Each lender gets their own branded experience with isolated data and custom workflows.",
    },
    {
      icon: Shield,
      title: "Bank-Level Security",
      description:
        "256-bit encryption, SOC 2 compliance, FCRA & TILA compliant. Your borrowers' data is our top priority.",
    },
  ];

  const steps = [
    {
      number: 1,
      title: "Configure Your Platform",
      description:
        "Set up your lending programs, pricing rules, and brand identity",
    },
    {
      number: 2,
      title: "Onboard Your Team",
      description:
        "Invite loan officers, processors, and underwriters with role-based access",
    },
    {
      number: 3,
      title: "Start Closing Loans",
      description:
        "Your borrowers apply through your branded portal, AI handles the rest",
    },
  ];

  const stats = [
    { value: "$2.4B+", label: "Loans Originated" },
    { value: "50+", label: "Lender Partners" },
    { value: "90%", label: "Borrower Completion Rate" },
    { value: "7hrs", label: "Saved Per Loan" },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background to-card pt-20">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-bold tracking-tight">
              Intelligent Lending,
              <br />
              <span className="text-primary">Simplified</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The AI-powered loan origination platform that helps lenders close
              faster, price smarter, and delight borrowers.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/contact">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Request a Demo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-border hover:bg-secondary"
              >
                Watch Overview
              </Button>
            </motion.div>

            {/* Trust bar */}
            <motion.div variants={itemVariants} className="pt-8">
              <p className="text-sm text-muted-foreground mb-4">
                Trusted by 50+ lenders nationwide
              </p>
              <div className="flex justify-center gap-4 flex-wrap">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-32 bg-secondary rounded-lg flex items-center justify-center text-xs text-muted-foreground font-medium"
                  >
                    Logo {i}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Why Lendry.AI?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to modernize your lending operations
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div key={idx} variants={itemVariants}>
                  <Card className="p-8 h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 lg:py-32 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get up and running in minutes
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
          >
            {/* Connection line (hidden on mobile) */}
            <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent z-0"></div>

            {steps.map((step, idx) => (
              <motion.div key={idx} variants={itemVariants} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-6 relative z-10 shadow-lg">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-24 lg:py-32 bg-foreground text-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat, idx) => (
              <motion.div key={idx} variants={itemVariants} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold mb-2">
                  {stat.value}
                </div>
                <div className="text-background/80">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
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
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Ready to Transform Your Lending?
              </h2>
              <p className="text-xl text-muted-foreground">
                Join the lenders who are already closing faster with AI.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/contact">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Request a Demo
                </Button>
              </Link>
              <p className="text-muted-foreground">
                Or call <span className="font-semibold text-foreground">(555) 123-4567</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
