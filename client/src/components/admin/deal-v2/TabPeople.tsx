import { User, Mail, Phone, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function PersonCard({
  name,
  role,
  email,
  phone,
  icon: Icon,
}: {
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  icon: any;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-medium">{name || "—"}</span>
              <Badge variant="secondary" className="text-[10px]">{role}</Badge>
            </div>
            {email && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${email}`} className="hover:underline">{email}</a>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mt-0.5">
                <Phone className="h-3 w-3" />
                <a href={`tel:${phone}`} className="hover:underline">{phone}</a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TabPeople({ deal }: { deal: any }) {
  const people = [
    {
      name: deal.borrowerName,
      role: "Borrower",
      email: deal.borrowerEmail,
      phone: deal.borrowerPhone,
      icon: User,
    },
  ];

  // Add processors if available
  if (deal.processors && Array.isArray(deal.processors)) {
    deal.processors.forEach((p: any) => {
      people.push({
        name: p.user?.fullName || p.fullName || "Unknown",
        role: p.role || "Processor",
        email: p.user?.email || p.email,
        phone: p.user?.phone || p.phone,
        icon: Building2,
      });
    });
  }

  // Add broker if available
  if (deal.brokerName) {
    people.push({
      name: deal.brokerName,
      role: "Broker",
      email: deal.brokerEmail,
      phone: deal.brokerPhone,
      icon: User,
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[14px] font-semibold">People ({people.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {people.map((person, i) => (
          <PersonCard key={i} {...person} />
        ))}
      </div>
    </div>
  );
}
