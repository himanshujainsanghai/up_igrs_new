import React, { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  Send,
  HelpCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  Headphones,
} from "lucide-react";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    }, 3000);
  };

  const contactMethods = [
    {
      title: "Email Support",
      description: "Send us an email and we'll respond within 24-48 hours",
      icon: Mail,
      color: "bg-blue-50 text-blue-700 border-blue-100",
      value: "jansunwai-up@gov.in",
      link: "mailto:jansunwai-up@gov.in",
    },
    {
      title: "Phone Helpline",
      description: "Call our helpline during business hours for immediate assistance",
      icon: Phone,
      color: "bg-green-50 text-green-700 border-green-100",
      value: "+91 522 432 1111",
      link: "tel:+915224321111",
    },
    {
      title: "Office Address",
      description: "Visit our office for in-person support and document submission",
      icon: MapPin,
      color: "bg-amber-50 text-amber-700 border-amber-100",
      value: "Lucknow, Uttar Pradesh",
      link: null,
    },
  ];

  const supportHours = [
    { day: "Monday - Friday", hours: "9:00 AM - 6:00 PM" },
    { day: "Saturday", hours: "10:00 AM - 2:00 PM" },
    { day: "Sunday & Holidays", hours: "Closed" },
  ];

  const quickLinks = [
    { title: "Track Your Grievance", path: "/track", icon: FileText },
    { title: "File a Complaint", path: "/file-complaint", icon: MessageSquare },
    { title: "FAQs", path: "/faq", icon: HelpCircle },
    { title: "Privacy Policy", path: "/privacy-policy", icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 text-gray-900">
      {/* Hero */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 mb-10">
        <div className="relative overflow-hidden bg-[#1e3a5f] text-white rounded-none sm:rounded-2xl shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#244a76] to-[#2b5b8f] opacity-90" />
          <div className="relative z-10 px-6 sm:px-10 lg:px-16 py-12 lg:py-16">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
              <div className="space-y-5 max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                  <Headphones className="h-4 w-4" />
                  Support & Help
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  Contact & Support
                </h1>
                <p className="text-base sm:text-lg text-white/80 leading-relaxed">
                  Need help with your grievance? Have questions about the system?
                  Get in touch with our support team through multiple channels.
                  We're here to assist you.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Clock className="h-4 w-4" />
                    24-48 hour response
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Multiple channels
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <HelpCircle className="h-4 w-4" />
                    Expert assistance
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-6 w-full max-w-md space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white/10">
                    <MessageSquare className="h-6 w-6 text-amber-200" />
                  </div>
                  <div>
                    <p className="text-sm text-white/80">
                      For faster assistance, please have your grievance reference
                      number ready when contacting support.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <p className="text-white/70">Response time</p>
                    <p className="font-semibold">24-48 hours</p>
                  </div>
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <p className="text-white/70">Support languages</p>
                    <p className="font-semibold">Hindi & English</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Contact Methods */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contactMethods.map((method) => {
            const Icon = method.icon;
            return (
              <div
                key={method.title}
                className={`rounded-2xl border ${method.color} p-6 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-white shadow-inner">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{method.title}</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  {method.description}
                </p>
                {method.link ? (
                  <a
                    href={method.link}
                    className="text-sm font-semibold text-gray-900 hover:underline"
                  >
                    {method.value}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-gray-900">
                    {method.value}
                  </p>
                )}
              </div>
            );
          })}
        </section>

        {/* Contact Form & Support Hours */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Form */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="h-5 w-5 text-[#1e3a5f]" />
              <h3 className="text-2xl font-semibold">Send us a Message</h3>
            </div>

            {submitted ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Message Sent!</p>
                  <p className="text-sm text-green-700">
                    We'll respond to your inquiry within 24-48 hours.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full"
                    placeholder="+91 1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="w-full"
                    placeholder="Brief description of your query"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    required
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full min-h-[120px]"
                    placeholder="Please provide details about your inquiry, including grievance reference number if applicable..."
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </form>
            )}
          </div>

          {/* Support Hours & Quick Links */}
          <div className="space-y-6">
            {/* Support Hours */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-[#1e3a5f]" />
                <h3 className="text-2xl font-semibold">Support Hours</h3>
              </div>
              <div className="space-y-3">
                {supportHours.map((schedule) => (
                  <div
                    key={schedule.day}
                    className="flex justify-between items-center p-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <span className="font-medium text-gray-900">
                      {schedule.day}
                    </span>
                    <span className="text-sm text-gray-700">
                      {schedule.hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Office Address */}
            <div className="rounded-2xl bg-[#1e3a5f] text-white shadow-xl p-6 lg:p-8 border border-[#2a4a6f]">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="h-5 w-5" />
                <h3 className="text-2xl font-semibold">Office Location</h3>
              </div>
              <p className="text-sm text-white/80 leading-relaxed mb-4">
                Department of Public Grievances
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-white/90">
                  Government of Uttar Pradesh
                  <br />
                  Lucknow, Uttar Pradesh - 226001
                </p>
                <p className="text-white/70 mt-4">
                  For in-person visits, please bring a valid ID and relevant
                  documents.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="h-5 w-5 text-[#1e3a5f]" />
            <h3 className="text-2xl font-semibold">Quick Help Links</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.title}
                  href={link.path}
                  className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#ff791a] hover:bg-orange-50 transition-all group"
                >
                  <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-[#ff791a] group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-[#ff791a]">
                    {link.title}
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="rounded-2xl border-2 border-red-200 bg-red-50 shadow-sm p-6 lg:p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-red-100 text-red-700">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2 text-red-900">
                Emergency Situations
              </h3>
              <p className="text-sm text-red-800 leading-relaxed mb-4">
                For urgent grievances requiring immediate attention (such as
                safety issues or time-sensitive matters), please call our
                emergency helpline or visit the nearest district office.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="tel:+915224321111"
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  <Phone className="h-4 w-4" />
                  Emergency Helpline: +91 522 432 1111
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Full-width footer */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 mt-12">
        <Footer />
      </div>
    </div>
  );
};

export default Contact;
