import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { PublicLayout } from "@/components/PublicLayout";
import { formatPhoneNumber, getPhoneError, getEmailError } from "@/lib/validation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Phone, MapPin, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export default function PublicContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    interest: "professional",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, interest: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to backend API to send contact form
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setFormData({
        name: "",
        email: "",
        company: "",
        phone: "",
        interest: "professional",
        message: "",
      });
      setSubmitted(false);
    }, 3000);
  };

  const contactInfo = [
    {
      icon: Mail,
      label: "Email",
      value: "hello@lendry.ai",
      href: "mailto:hello@lendry.ai",
    },
    {
      icon: Phone,
      label: "Phone",
      value: "(555) 123-4567",
      href: "tel:+15551234567",
    },
    {
      icon: MapPin,
      label: "Address",
      value: "123 Main St, New York, NY 10001",
      href: "#",
    },
    {
      icon: Clock,
      label: "Hours",
      value: "Mon-Fri, 9am-6pm EST",
      href: "#",
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
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We'd love to hear from you. Reach out to learn more about how
              Lendry.AI can transform your lending operations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>

                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                      <svg
                        className="w-6 h-6 text-accent"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      Thanks for reaching out!
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      We've received your message and will get back to you
                      shortly.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Name
                      </label>
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email
                      </label>
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        required
                      />
                      {getEmailError(formData.email) && <p className="text-xs text-destructive mt-1">{getEmailError(formData.email)}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Company
                      </label>
                      <Input
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Your Company"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Phone
                      </label>
                      <Input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange({ target: { name: "phone", value: formatPhoneNumber(e.target.value) } })}
                        placeholder="(555) 123-4567"
                      />
                      {getPhoneError(formData.phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(formData.phone)}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        I'm interested in...
                      </label>
                      <Select
                        value={formData.interest}
                        onValueChange={handleSelectChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">
                            Starter Plan
                          </SelectItem>
                          <SelectItem value="professional">
                            Professional Plan
                          </SelectItem>
                          <SelectItem value="enterprise">
                            Enterprise Plan
                          </SelectItem>
                          <SelectItem value="just-browsing">
                            Just Browsing
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Message
                      </label>
                      <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us more about your needs..."
                        rows={5}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      size="lg"
                    >
                      Send Message
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                )}
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
                <p className="text-muted-foreground mb-8">
                  Get in touch with our team. We're here to answer any questions
                  and help you get started.
                </p>
              </div>

              <div className="space-y-4">
                {contactInfo.map((info, idx) => {
                  const Icon = info.icon;
                  return (
                    <motion.a
                      key={idx}
                      href={info.href}
                      variants={itemVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-4 p-4 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-1">
                          {info.label}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {info.value}
                        </p>
                      </div>
                    </motion.a>
                  );
                })}
              </div>

              {/* Map placeholder */}
              <div className="rounded-lg overflow-hidden bg-secondary h-64 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Map placeholder
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Response Time Section */}
      <section className="py-16 lg:py-24 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold">
              We typically respond within 24 hours
            </h3>
            <p className="text-muted-foreground">
              If you need immediate assistance, feel free to call us at{" "}
              <span className="font-semibold text-foreground">
                (555) 123-4567
              </span>
            </p>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
