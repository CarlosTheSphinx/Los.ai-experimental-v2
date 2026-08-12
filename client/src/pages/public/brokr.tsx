import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Mail,
  Zap,
  FileCheck,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Shield,
  Inbox,
  GitMerge,
  BrainCircuit,
  LayoutDashboard,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const valueProps = [
  {
    icon: Mail,
    title: "No new tools. No forms.",
    body: "Forward a deal email. Brokr.AI extracts the property type, loan amount, borrower profile, and all key fields automatically.",
  },
  {
    icon: Zap,
    title: "Right lender. Right program. In seconds.",
    body: "AI surfaces the top matching lender programs for every deal — no spreadsheet hunting, no lender portal logins.",
  },
  {
    icon: FileCheck,
    title: "One-click broker responses.",
    body: "Every matched deal generates a ready-to-send lender email. Review, edit, and send in minutes — not hours.",
  },
  {
    icon: Shield,
    title: "Human in the loop. Compliance-ready.",
    body: "Confidence-scored extraction, structured data fields, and a review step before anything goes out. Your audit trail is automatic.",
  },
];

const features = [
  {
    icon: Inbox,
    phase: "Phase 1",
    headline: "Every deal email. One place. No chaos.",
    body: "Commercial deal flow lives in email. Brokr.AI connects your inbox and organizes every deal thread — searchable, sortable, and tracked — without changing how you work today.",
    proofs: [
      "Auto-sort by deal type, amount, and status",
      "No manual tagging",
      "Works with your existing email",
    ],
  },
  {
    icon: GitMerge,
    phase: "Phase 2",
    headline: "Pin any email to your deal pipeline instantly.",
    body: "Stop copying and pasting. Click once to attach any email thread to a structured commercial deal record. Property details, loan amount, broker contact, and status — all linked and tracked automatically.",
    proofs: [
      "Full email thread history attached to each deal",
      "One-click pinning",
      "Never lose deal context again",
    ],
  },
  {
    icon: BrainCircuit,
    phase: "Phase 3",
    headline: "AI reads the deal. You review and send.",
    body: "When a broker email arrives, Brokr.AI's AI agent extracts every key field — asset type, loan amount, LTV, location, borrower profile — matches it to your active lender programs, and drafts the lender outreach. You review; it sends.",
    proofs: [
      "LLM-native extraction (not OCR)",
      "Confidence scores on every field",
      "Matches 50+ CRE program criteria in seconds",
    ],
  },
  {
    icon: LayoutDashboard,
    phase: "Phase 4",
    headline: "Your pipeline at a glance. Brokers always in the loop.",
    body: "Every deal surfaces as a status card. Know what's pending, what needs documents, and what's ready to close — at a glance. Brokers get automated email updates so they never need to call asking for status.",
    proofs: [
      "Real-time status cards",
      "Auto broker notifications",
      "No manual follow-up emails",
    ],
  },
];

const steps = [
  {
    number: "01",
    title: "Forward your deal email",
    body: "No data entry. No forms. Just forward the broker's email to Brokr.AI — or connect your inbox directly. We read it.",
  },
  {
    number: "02",
    title: "AI extracts, structures, and matches",
    body: "In seconds, Brokr.AI structures the deal, flags any missing fields, and surfaces the top matching lender programs for that deal type and size.",
  },
  {
    number: "03",
    title: "Review and send",
    body: "Review the pre-drafted lender outreach (or edit if you want). Approve it. Brokr.AI sends and tracks the submission automatically.",
  },
];

export default function BrokrLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a1628]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              Brokr<span className="text-teal-400">.AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition-colors">Product</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pilot" className="hover:text-white transition-colors">Pilot</a>
          </div>
          <a href="#pilot">
            <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold">
              Join Pilot — Free
            </Button>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-sm font-medium mb-6">
              The first LLM-native CRE deal intake platform · Pilot open now · No setup fees
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
              Deal intake that lenders{" "}
              <span className="text-teal-400">actually love.</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed mb-10">
              Brokr.AI reads your deal emails, structures every submission, and drafts
              lender responses — automatically. Built for commercial mortgage brokers
              handling $1M–$25M CRE deals.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#pilot">
                <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold px-8 w-full sm:w-auto">
                  Join the Pilot — Free <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="border-white/20 hover:border-white/40 text-white w-full sm:w-auto">
                  Already doing this manually? See how it&apos;s different →
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* VALUE PROPOSITIONS */}
      <section className="py-20 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {valueProps.map((vp, i) => (
              <motion.div key={i} variants={itemVariants}>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full hover:border-teal-500/30 transition-colors">
                  <div className="w-10 h-10 bg-teal-500/15 rounded-xl flex items-center justify-center mb-4">
                    <vp.icon className="w-5 h-5 text-teal-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{vp.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{vp.body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-teal-400 tracking-widest uppercase mb-3">
              Four Phases. One Platform.
            </p>
            <h2 className="text-4xl md:text-5xl font-bold">
              Everything you need to run{" "}
              <br className="hidden md:block" />
              a structured deal intake operation.
            </h2>
          </motion.div>

          <div className="space-y-16">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className={`flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} gap-12 items-center`}
              >
                {/* Copy side */}
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold mb-4">
                    {f.phase}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">{f.headline}</h3>
                  <p className="text-white/65 leading-relaxed mb-6">{f.body}</p>
                  <ul className="space-y-2">
                    {f.proofs.map((p, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual side */}
                <div className="flex-1 w-full">
                  <div className="bg-gradient-to-br from-[#112240] to-[#0a1628] border border-white/10 rounded-2xl p-8 aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-teal-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <f.icon className="w-8 h-8 text-teal-400" />
                      </div>
                      <p className="text-white/40 text-sm">{f.phase} — {f.headline.split(".")[0]}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 bg-[#071120] border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-teal-400 tracking-widest uppercase mb-3">
              Quick Setup
            </p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Three simple steps.</h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              From inbox to structured submission in under 5 minutes. Without retyping a single field.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {steps.map((step, i) => (
              <motion.div key={i} variants={itemVariants}>
                <div className="relative bg-white/5 border border-white/10 rounded-2xl p-8 h-full">
                  <div className="text-5xl font-bold text-teal-500/30 mb-4">{step.number}</div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-white/60 leading-relaxed">{step.body}</p>
                  {i < steps.length - 1 && (
                    <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 text-teal-500/40 z-10" />
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* DIFFERENTIATION */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The first LLM-native CRE intake platform.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6">
              <h4 className="font-bold text-red-300 mb-4">The old way</h4>
              <ul className="space-y-3 text-sm text-white/60">
                {["OCR + manual field entry", "Spreadsheet-based lender matching", "One-by-one lender portal logins", "Email follow-ups written from scratch"].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-teal-900/10 border border-teal-500/20 rounded-2xl p-6">
              <h4 className="font-bold text-teal-300 mb-4">The Brokr.AI way</h4>
              <ul className="space-y-3 text-sm text-white/60">
                {["LLM reads unstructured deal emails natively", "Instant AI-powered program matching", "All lenders in one dashboard", "Pre-drafted outreach generated automatically"].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PILOT CTA */}
      <section id="pilot" className="py-24 px-4 bg-[#071120] border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Be one of 10 founding brokers.
              </h2>
              <p className="text-lg text-white/70 leading-relaxed mb-8">
                We&apos;re running a free pilot with 10 commercial mortgage brokers this quarter. No forms,
                no contracts, no setup fees. Bring your existing deal flow — we bring the AI that turns it
                into structured lender submissions.
              </p>
              <div className="text-left inline-block bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 w-full max-w-md mx-auto">
                <p className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider">Pilot brokers get:</p>
                <ul className="space-y-2">
                  {[
                    "Free access to all 4 platform features",
                    "Direct line to the founding team",
                    "Founding member pricing when we launch commercially",
                  ].map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-white/80 text-sm">
                      <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold px-8 w-full sm:w-auto">
                  Apply for the Pilot <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white/20 hover:border-white/40 text-white w-full sm:w-auto">
                  Book a 20-min demo →
                </Button>
              </Link>
            </div>

            <p className="text-sm text-white/40">
              Pilot is free. No credit card. We won&apos;t email you without permission.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <span className="font-bold text-white/60">
            Brokr<span className="text-teal-400">.AI</span>
          </span>
          <div className="flex gap-6">
            <Link href="/contact" className="hover:text-white/70 transition-colors">Contact</Link>
            <a href="/privacy" className="hover:text-white/70 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white/70 transition-colors">Terms</a>
          </div>
          <span>© 2026 Brokr.AI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
