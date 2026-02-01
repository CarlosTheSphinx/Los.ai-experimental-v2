import { Link, useLocation } from "wouter";
import { 
  Calculator, 
  FileText, 
  ClipboardList,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import sphinxLogo from "@assets/Sphinx_Capital_Logo_-_Blue_-_No_Background_(1)_1769811166428.jpeg";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/", label: "New Quote", icon: Calculator },
  { href: "/quotes", label: "Saved Quotes", icon: FileText },
  { href: "/agreements", label: "Agreements", icon: ClipboardList },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col transition-all duration-300 sticky top-0 h-screen",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn(
          "p-4 border-b border-slate-100 flex items-center gap-3",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img 
                src={sphinxLogo} 
                alt="Sphinx Capital" 
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
          {collapsed && (
            <img 
              src={sphinxLogo} 
              alt="Sphinx Capital" 
              className="h-8 w-8 object-contain"
            />
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || 
              (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-primary/10 text-primary font-medium",
                    collapsed && "justify-center px-2"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center"
            data-testid="button-toggle-sidebar"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
