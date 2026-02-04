import React from "react";
import {
  Shield,
  Lock,
  FileText,
  Eye,
  Database,
  Globe,
  AlertTriangle,
  Bell,
  Users,
  CheckCircle2,
} from "lucide-react";
import Footer from "@/components/Footer";

const PrivacyPolicy: React.FC = () => {
  const commitments = [
    {
      title: "Transparency First",
      description:
        "We explain what we collect, why we collect it, and how long we keep it.",
      icon: Eye,
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "Security by Default",
      description:
        "Data in transit is encrypted and access is restricted to authorized officers only.",
      icon: Lock,
      color: "bg-green-50 text-green-700 border-green-100",
    },
    {
      title: "Purpose Limitation",
      description:
        "Information is used solely for grievance intake, processing, and lawful reporting.",
      icon: Shield,
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
  ];

  const policySections = [
    {
      title: "What We Collect",
      icon: FileText,
      accent: "bg-blue-100 text-blue-700",
      points: [
        "Contact details: name, mobile number, email, address, and district details.",
        "Grievance details: complaint text, documents you upload, and preferred contact method.",
        "System data: timestamps, reference IDs, and basic device/browser information for troubleshooting.",
      ],
    },
    {
      title: "How We Use Your Data",
      icon: Globe,
      accent: "bg-emerald-100 text-emerald-700",
      points: [
        "Register and track grievances, send acknowledgements, and share status updates.",
        "Allocate grievances to the correct authority, monitor progress, and maintain audit trails.",
        "Generate anonymized, aggregated reports to improve service delivery and transparency.",
      ],
    },
    {
      title: "Legal Basis & Retention",
      icon: CheckCircle2,
      accent: "bg-indigo-100 text-indigo-700",
      points: [
        "Processing is done under applicable public service and grievance redressal guidelines.",
        "Records are retained for mandated durations or until resolution/audit requirements are met.",
        "Data that is no longer required is securely removed or anonymized.",
      ],
    },
    {
      title: "Security Measures",
      icon: Database,
      accent: "bg-orange-100 text-orange-700",
      points: [
        "Encryption in transit (HTTPS) and role-based access controls for officials.",
        "Regular backups, integrity checks, and monitoring for unusual activity.",
        "Vendor and infrastructure compliance reviews aligned with government standards.",
      ],
    },
    {
      title: "Your Choices & Rights",
      icon: Users,
      accent: "bg-teal-100 text-teal-700",
      points: [
        "Submit accurate information and update details through official channels when needed.",
        "Request clarification on data use or raise concerns with the Grievance Officer.",
        "Opt out of optional communications while still receiving essential updates.",
      ],
    },
    {
      title: "Cookies & Analytics",
      icon: Bell,
      accent: "bg-purple-100 text-purple-700",
      points: [
        "Essential cookies keep you signed in and secure important actions.",
        "Basic analytics help us measure performance; no commercial tracking or advertising pixels are used.",
        "You can clear cookies from your browser; doing so may sign you out.",
      ],
    },
  ];

  const incidents = [
    "We investigate and mitigate suspected breaches with priority.",
    "Impacted users and competent authorities are notified where required.",
    "Learnings from incidents are folded into revised controls and training.",
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
                  <Shield className="h-4 w-4" />
                  Public Grievance Redressal
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  Privacy Policy
                </h1>
                <p className="text-base sm:text-lg text-white/80 leading-relaxed">
                  This policy describes how the Jansunwai-Samadhan grievance
                  system collects, uses, protects, and shares information you
                  provide while filing or tracking grievances. Our goal is to
                  safeguard your data while enabling timely redressal.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Lock className="h-4 w-4" />
                    Data encrypted in transit
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Applicable public service norms
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Globe className="h-4 w-4" />
                    Publicly accessible commitment
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-6 w-full max-w-md space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white/10">
                    <AlertTriangle className="h-6 w-6 text-amber-200" />
                  </div>
                  <div>
                    <p className="text-sm text-white/80">
                      This policy should be read with the grievance terms of
                      use. By using the portal or mobile app, you consent to the
                      practices outlined below.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <p className="text-white/70">Applies to</p>
                    <p className="font-semibold">All citizens & officers</p>
                  </div>
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <p className="text-white/70">Last reviewed</p>
                    <p className="font-semibold">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Commitments */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {commitments.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`rounded-2xl border ${item.color} p-6 shadow-sm`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-white shadow-inner">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </section>

        {/* Policy sections */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policySections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-lg ${section.accent} bg-opacity-80`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">{section.title}</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a] flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        {/* Incident response */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-xl bg-red-50 text-red-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">Incident Response</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                If we ever detect or suspect unauthorized access, our response
                plan prioritizes your security and service continuity.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {incidents.map((item) => (
              <div
                key={item}
                className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-800 leading-relaxed"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="h-5 w-5 text-[#1e3a5f]" />
              <h3 className="text-2xl font-semibold">Your Rights</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              You may seek clarification, request corrections to your submitted
              details, or raise concerns about how your information is handled.
              Requests are addressed in line with applicable rules and service
              standards.
            </p>
            <ul className="space-y-2 text-sm text-gray-800 leading-relaxed">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a]" />
                Confirm whether your grievance data is being processed.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a]" />
                Request correction of inaccurate or outdated details you shared.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a]" />
                Obtain clarity on data sharing with competent authorities.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-[#1e3a5f] text-white shadow-xl p-6 lg:p-8 border border-[#2a4a6f]">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-5 w-5" />
              <h3 className="text-2xl font-semibold">Contact & Grievance Officer</h3>
            </div>
            <p className="text-sm text-white/80 leading-relaxed mb-4">
              For privacy questions, incident reports, or to exercise your data
              rights, contact the Grievance Officer using the details below.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold w-28">Email</span>
                <a
                  href="mailto:privacy@jansunwai-up.gov.in"
                  className="text-orange-200 hover:underline break-all"
                >
                  privacy@jansunwai-up.gov.in
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold w-28">Phone</span>
                <a href="tel:+915224321111" className="text-orange-200 hover:underline">
                  +91 522 432 1111
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold w-28">Address</span>
                <p className="text-white/80">
                  Department of Public Grievances,<br />
                  Government of Uttar Pradesh,<br />
                  Lucknow, Uttar Pradesh.
                </p>
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

export default PrivacyPolicy;

