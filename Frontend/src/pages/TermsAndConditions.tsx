import React from "react";
import {
  FileText,
  AlertCircle,
  Scale,
  CheckCircle2,
  XCircle,
  Shield,
  Lock,
  Globe,
  Ban,
  Clock,
} from "lucide-react";
import Footer from "@/components/Footer";

const TermsAndConditions: React.FC = () => {
  const keyPrinciples = [
    {
      title: "Fair Use",
      description:
        "Use the system for legitimate grievance submission. Misuse, false information, or abuse may result in account restrictions.",
      icon: Scale,
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "Accurate Information",
      description:
        "Provide truthful, accurate details in your grievances. Knowingly submitting false information violates terms and may have legal consequences.",
      icon: CheckCircle2,
      color: "bg-green-50 text-green-700 border-green-100",
    },
    {
      title: "Respectful Conduct",
      description:
        "Maintain professional language. Harassment, threats, or inappropriate content will not be tolerated and may result in immediate action.",
      icon: Shield,
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
  ];

  const termsSections = [
    {
      title: "Acceptance of Terms",
      icon: FileText,
      accent: "bg-blue-100 text-blue-700",
      points: [
        "By accessing or using the Jansunwai-Samadhan portal, you agree to be bound by these terms and conditions.",
        "If you do not agree with any part of these terms, you must not use the system.",
        "We reserve the right to modify these terms at any time; continued use constitutes acceptance of changes.",
      ],
    },
    {
      title: "User Responsibilities",
      icon: Lock,
      accent: "bg-emerald-100 text-emerald-700",
      points: [
        "You are responsible for maintaining the confidentiality of your account credentials and reference numbers.",
        "You must provide accurate, complete information when filing grievances and update details if they change.",
        "You agree not to use the system for any unlawful purpose or in a way that could damage, disable, or impair the service.",
      ],
    },
    {
      title: "Grievance Submission Rules",
      icon: Globe,
      accent: "bg-indigo-100 text-indigo-700",
      points: [
        "Each grievance should pertain to a specific issue; duplicate or frivolous submissions may be rejected.",
        "Only file grievances for matters within the jurisdiction of the concerned authority.",
        "Include all relevant documents and evidence at the time of submission to avoid delays in processing.",
      ],
    },
    {
      title: "System Availability & Modifications",
      icon: Clock,
      accent: "bg-orange-100 text-orange-700",
      points: [
        "We strive to maintain 24/7 availability but do not guarantee uninterrupted access due to maintenance or technical issues.",
        "We reserve the right to modify, suspend, or discontinue any feature without prior notice.",
        "System updates and improvements may be implemented to enhance user experience and security.",
      ],
    },
    {
      title: "Prohibited Activities",
      icon: Ban,
      accent: "bg-red-100 text-red-700",
      points: [
        "Submitting grievances with false, misleading, or fraudulent information.",
        "Attempting to gain unauthorized access to system data or other users' information.",
        "Using automated tools, bots, or scripts to interact with the system without authorization.",
        "Interfering with the operation of the system or attempting to breach security measures.",
      ],
    },
    {
      title: "Limitation of Liability",
      icon: AlertCircle,
      accent: "bg-purple-100 text-purple-700",
      points: [
        "The system is provided 'as is' without warranties of any kind, express or implied.",
        "We are not liable for any direct, indirect, or consequential damages arising from system use.",
        "While we take security seriously, we cannot guarantee absolute security against all threats.",
      ],
    },
  ];

  const consequences = [
    {
      title: "Account Suspension",
      description:
        "Repeated violations or serious misconduct may result in temporary or permanent account suspension.",
      icon: XCircle,
    },
    {
      title: "Legal Action",
      description:
        "Fraudulent submissions or system abuse may lead to civil or criminal proceedings as per applicable laws.",
      icon: Scale,
    },
    {
      title: "Grievance Rejection",
      description:
        "Grievances that violate terms or contain inappropriate content will be rejected without processing.",
      icon: Ban,
    },
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
                  <FileText className="h-4 w-4" />
                  Legal Agreement
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  Terms and Conditions
                </h1>
                <p className="text-base sm:text-lg text-white/80 leading-relaxed">
                  These terms govern your use of the Jansunwai-Samadhan grievance
                  redressal system. Please read them carefully to understand your
                  rights and responsibilities when using our services.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Binding agreement
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Shield className="h-4 w-4" />
                    User protection
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Globe className="h-4 w-4" />
                    Transparent terms
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-6 w-full max-w-md space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white/10">
                    <AlertCircle className="h-6 w-6 text-amber-200" />
                  </div>
                  <div>
                    <p className="text-sm text-white/80">
                      By using the Jansunwai-Samadhan portal, you acknowledge that
                      you have read, understood, and agree to be bound by these terms
                      and conditions.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <p className="text-white/70">Effective from</p>
                    <p className="font-semibold">Date of first use</p>
                  </div>
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <p className="text-white/70">Last updated</p>
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
        {/* Key Principles */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {keyPrinciples.map((item) => {
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

        {/* Terms Sections */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {termsSections.map((section) => {
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
                  {section.points.map((point, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a] flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        {/* Consequences */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-xl bg-red-50 text-red-700">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">
                Consequences of Violations
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Violation of these terms and conditions may result in various
                actions being taken against your account or legal proceedings.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {consequences.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-lg bg-gray-50 border border-gray-100 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-2xl bg-[#1e3a5f] text-white shadow-xl p-6 lg:p-8 border border-[#2a4a6f]">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5" />
            <h3 className="text-2xl font-semibold">Questions About Terms?</h3>
          </div>
          <p className="text-sm text-white/80 leading-relaxed mb-4">
            If you have questions about these terms and conditions or need
            clarification on any section, please contact us using the details
            below.
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-semibold w-28">Email</span>
              <a
                href="mailto:legal@jansunwai-up.gov.in"
                className="text-orange-200 hover:underline break-all"
              >
                legal@jansunwai-up.gov.in
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
        </section>
      </div>

      {/* Full-width footer */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 mt-12">
        <Footer />
      </div>
    </div>
  );
};

export default TermsAndConditions;
