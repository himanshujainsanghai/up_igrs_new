import React from "react";
import {
  Shield,
  Eye,
  Edit,
  Trash2,
  Download,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  UserCheck,
} from "lucide-react";
import Footer from "@/components/Footer";

const UserRights: React.FC = () => {
  const rights = [
    {
      title: "Right to Access",
      description:
        "Request access to your personal data and grievance records processed by the system.",
      icon: Eye,
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "Right to Correction",
      description:
        "Request correction of inaccurate, incomplete, or outdated personal information.",
      icon: Edit,
      color: "bg-green-50 text-green-700 border-green-100",
    },
    {
      title: "Right to Deletion",
      description:
        "Request deletion of your data, subject to legal and operational requirements.",
      icon: Trash2,
      color: "bg-red-50 text-red-700 border-red-100",
    },
  ];

  const rightsSections = [
    {
      title: "Access Your Data",
      icon: Eye,
      accent: "bg-blue-100 text-blue-700",
      points: [
        "You can request a copy of all personal data we hold about you, including grievance submissions, status updates, and correspondence.",
        "Requests are processed within 30 days of receipt, subject to identity verification.",
        "Data is provided in a machine-readable format where technically feasible.",
      ],
    },
    {
      title: "Correct Inaccuracies",
      icon: Edit,
      accent: "bg-emerald-100 text-emerald-700",
      points: [
        "If you find errors in your submitted information, you can request corrections through the portal or by contacting support.",
        "We verify the accuracy of requested changes before updating records.",
        "Once corrected, updated information is reflected across all relevant system records.",
      ],
    },
    {
      title: "Data Deletion Requests",
      icon: Trash2,
      accent: "bg-red-100 text-red-700",
      points: [
        "You may request deletion of your personal data, but this may be limited by legal obligations to retain records.",
        "Active grievances cannot be deleted until resolution is complete and retention periods have expired.",
        "Deleted data is permanently removed from active systems; backup copies may persist for a limited time.",
      ],
    },
    {
      title: "Data Portability",
      icon: Download,
      accent: "bg-indigo-100 text-indigo-700",
      points: [
        "You can request your data in a structured, commonly used format for transfer to another service.",
        "Portable data includes grievance submissions, documents, and status history you provided.",
        "This right applies to data you've directly provided through active use of the system.",
      ],
    },
    {
      title: "Restrict Processing",
      icon: Lock,
      accent: "bg-orange-100 text-orange-700",
      points: [
        "You can request restriction of data processing in certain circumstances, such as when accuracy is contested.",
        "While restricted, data may be stored but not actively processed except with your consent or for legal claims.",
        "Restrictions are lifted once the underlying issue is resolved or legal requirements are met.",
      ],
    },
    {
      title: "Object to Processing",
      icon: AlertCircle,
      accent: "bg-purple-100 text-purple-700",
      points: [
        "You have the right to object to processing of your data for certain purposes, subject to overriding legitimate grounds.",
        "Objections related to grievance processing may affect our ability to provide services.",
        "Each objection is reviewed on a case-by-case basis in accordance with applicable regulations.",
      ],
    },
  ];

  const deletionProcess = [
    {
      step: "1",
      title: "Submit Request",
      description:
        "Fill out the data deletion request form with your grievance reference number and identity verification details.",
      icon: FileText,
    },
    {
      step: "2",
      title: "Identity Verification",
      description:
        "We verify your identity using registered contact information to prevent unauthorized deletions.",
      icon: UserCheck,
    },
    {
      step: "3",
      title: "Review & Assessment",
      description:
        "We assess your request against legal retention requirements and active grievance status.",
      icon: Shield,
    },
    {
      step: "4",
      title: "Deletion or Explanation",
      description:
        "Data is deleted where possible, or you receive an explanation of why deletion cannot proceed immediately.",
      icon: CheckCircle2,
    },
  ];

  const limitations = [
    "Data related to active grievances must be retained until resolution is complete.",
    "Legal requirements may mandate retention of certain records for audit and compliance purposes.",
    "Anonymized data used for statistics and reporting is not subject to deletion requests.",
    "Deletion may take up to 90 days to complete across all systems and backups.",
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
                  Your Data Rights
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  User Rights & Data Deletion
                </h1>
                <p className="text-base sm:text-lg text-white/80 leading-relaxed">
                  Understand your rights regarding personal data, how to access
                  or correct information, and the process for requesting data
                  deletion from the Jansunwai-Samadhan system.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Shield className="h-4 w-4" />
                    Your rights protected
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Clock className="h-4 w-4" />
                    30-day response time
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Free to exercise
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-6 w-full max-w-md space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white/10">
                    <Shield className="h-6 w-6 text-amber-200" />
                  </div>
                  <div>
                    <p className="text-sm text-white/80">
                      These rights are granted under applicable data protection
                      laws and grievance redressal guidelines. You can exercise
                      them at any time without charge.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <p className="text-white/70">Response time</p>
                    <p className="font-semibold">Within 30 days</p>
                  </div>
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <p className="text-white/70">Fee</p>
                    <p className="font-semibold">No charge</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Key Rights */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rights.map((item) => {
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

        {/* Rights Sections */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rightsSections.map((section) => {
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

        {/* Deletion Process */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl bg-red-50 text-red-700">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">
                Data Deletion Process
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Follow these steps to request deletion of your personal data from
                the system. Note that some data may need to be retained for legal
                or operational reasons.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {deletionProcess.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="relative rounded-lg bg-gradient-to-br from-gray-50 to-white border border-gray-200 p-5"
                >
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-sm">
                    {step.step}
                  </div>
                  <div className="mt-2 mb-3">
                    <div className="p-2 rounded-lg bg-[#ff791a]/10 inline-block mb-2">
                      <Icon className="h-5 w-5 text-[#ff791a]" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Limitations */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">
                Important Limitations
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                While you have rights over your data, there are certain
                limitations based on legal requirements and operational needs.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {limitations.map((limitation, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-800 leading-relaxed flex gap-2"
              >
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{limitation}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="h-5 w-5 text-[#1e3a5f]" />
              <h3 className="text-2xl font-semibold">How to Exercise Rights</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              To exercise any of your data rights, you can contact us through the
              following channels. Please include your grievance reference number
              if applicable.
            </p>
            <ul className="space-y-2 text-sm text-gray-800 leading-relaxed">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a]" />
                Submit a request through the portal's support section.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a]" />
                Send an email with your request and identity verification.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a]" />
                Call our helpline for assistance with the process.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-[#1e3a5f] text-white shadow-xl p-6 lg:p-8 border border-[#2a4a6f]">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-5 w-5" />
              <h3 className="text-2xl font-semibold">Contact Support</h3>
            </div>
            <p className="text-sm text-white/80 leading-relaxed mb-4">
              For data rights requests, deletion inquiries, or privacy concerns,
              reach out to our data protection team.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold w-28">Email</span>
                <a
                  href="mailto:dataprotection@jansunwai-up.gov.in"
                  className="text-orange-200 hover:underline break-all"
                >
                  dataprotection@jansunwai-up.gov.in
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold w-28">Phone</span>
                <a href="tel:+915224321111" className="text-orange-200 hover:underline">
                  +91 522 432 1111
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold w-28">Hours</span>
                <p className="text-white/80">
                  Monday to Friday: 9:00 AM - 6:00 PM<br />
                  (Excluding government holidays)
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

export default UserRights;
