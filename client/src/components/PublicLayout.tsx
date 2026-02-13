import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  // Close menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/use-cases", label: "Use Cases" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="flex items-center justify-center w-8 h-8 rounded bg-primary text-primary-foreground font-bold">
                L
              </div>
              <span className="text-lg font-bold text-foreground hidden sm:inline">
                Lendry.AI
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {link.label}
                </a>
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Request Demo
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors block py-2">
                    {link.label}
                  </a>
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="w-full justify-center">
                    Log In
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                    Request Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
            {/* Company Info */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded bg-primary text-primary-foreground font-bold">
                  L
                </div>
                <span className="text-sm font-bold text-foreground">
                  Lendry.AI
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                The intelligent loan origination platform for modern lenders.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Product
              </h3>
              <ul className="space-y-2 text-xs">
                {[
                  { href: "/#features", label: "Features" },
                  { href: "/pricing", label: "Pricing" },
                  { href: "/use-cases", label: "Use Cases" },
                  { href: "/contact", label: "Contact" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <a className="text-muted-foreground hover:text-foreground transition-colors">
                        {item.label}
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Company
              </h3>
              <ul className="space-y-2 text-xs">
                {[
                  { href: "/contact", label: "Contact" },
                  { href: "/pricing", label: "Pricing" },
                  { href: "/use-cases", label: "Use Cases" },
                  { href: "/login", label: "Sign In" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <a className="text-muted-foreground hover:text-foreground transition-colors">
                        {item.label}
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Legal
              </h3>
              <ul className="space-y-2 text-xs">
                {[
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/terms", label: "Terms of Service" },
                  { href: "/security", label: "Security" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <a className="text-muted-foreground hover:text-foreground transition-colors">
                        {item.label}
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Follow
              </h3>
              <div className="flex gap-3">
                {[
                  { name: "Twitter", href: "#" },
                  { name: "LinkedIn", href: "#" },
                  { name: "GitHub", href: "#" },
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="w-8 h-8 rounded bg-secondary hover:bg-primary/10 flex items-center justify-center text-xs text-muted-foreground hover:text-primary transition-colors"
                    aria-label={social.name}
                  >
                    {social.name.charAt(0)}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-border pt-8 text-xs text-muted-foreground text-center">
            <p>
              &copy; {new Date().getFullYear()} Lendry.AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
