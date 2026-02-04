import React from "react";
import {
  Target,
  Users,
  Shield,
  TrendingUp,
  CheckCircle2,
  Clock,
  Award,
  Globe,
  Heart,
  Building2,
  FileCheck,
  MessageSquare,
  Eye,
} from "lucide-react";
import Footer from "@/components/Footer";

const About: React.FC = () => {
  const missionValues = [
    {
      title: "Transparency",
      description:
        "Complete visibility into grievance status, processing timelines, and resolution outcomes.",
      icon: Eye,
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "Accountability",
      description:
        "Clear responsibility chains ensuring every grievance receives proper attention and follow-up.",
      icon: Shield,
      color: "bg-green-50 text-green-700 border-green-100",
    },
    {
      title: "Efficiency",
      description:
        "Streamlined processes and digital workflows for faster grievance resolution.",
      icon: TrendingUp,
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      title: "Accessibility",
      description:
        "Multi-channel access in multiple languages, ensuring no citizen is left behind.",
      icon: Users,
      color: "bg-purple-50 text-purple-700 border-purple-100",
    },
  ];

  const features = [
    {
      title: "Online Grievance Filing",
      icon: FileCheck,
      description:
        "Submit grievances 24/7 through our web portal with support for document uploads and multiple languages.",
    },
    {
      title: "Real-time Tracking",
      icon: Clock,
      description:
        "Monitor your grievance status in real-time with SMS and email notifications at each stage.",
    },
    {
      title: "Multi-level Escalation",
      icon: TrendingUp,
      description:
        "Automatic escalation to higher authorities if grievances are not resolved within specified timelines.",
    },
    {
      title: "Meeting Requests",
      icon: MessageSquare,
      description:
        "Request face-to-face meetings with concerned officers for complex grievances requiring detailed discussion.",
    },
    {
      title: "Feedback System",
      icon: Heart,
      description:
        "Provide feedback on resolution quality to help improve services and officer accountability.",
    },
    {
      title: "Transparency Dashboard",
      icon: Globe,
      description:
        "Public dashboard showing grievance statistics, resolution rates, and district-wise performance.",
    },
  ];

  const stats = [
    {
      number: "62M+",
      label: "Grievances Received",
      icon: FileCheck,
      color: "text-blue-600",
    },
    {
      number: "61M+",
      label: "Resolved Cases",
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      number: "98.6%",
      label: "Resolution Rate",
      icon: Award,
      color: "text-amber-600",
    },
    {
      number: "75",
      label: "Districts Covered",
      icon: Building2,
      color: "text-purple-600",
    },
  ];

  const timeline = [
    {
      year: "2020",
      title: "System Launch",
      description:
        "Jansunwai-Samadhan portal launched to digitize grievance redressal across Uttar Pradesh.",
    },
    {
      year: "2021",
      title: "Mobile App",
      description:
        "Mobile application released for Android and iOS, making grievance filing accessible on-the-go.",
    },
    {
      year: "2022",
      title: "AI Integration",
      description:
        "AI-powered categorization and routing implemented for faster grievance allocation.",
    },
    {
      year: "2023",
      title: "Multi-language Support",
      description:
        "Full support for Hindi, English, and regional languages to improve accessibility.",
    },
    {
      year: "2024",
      title: "Advanced Analytics",
      description:
        "Real-time dashboards and predictive analytics introduced for better governance insights.",
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
                  <Target className="h-4 w-4" />
                  About Us
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  Jansunwai-Samadhan
                </h1>
                <p className="text-base sm:text-lg text-white/80 leading-relaxed">
                  A comprehensive digital grievance redressal system empowering
                  citizens of Uttar Pradesh to voice concerns, track progress, and
                  receive timely resolution through transparent, accountable processes.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Citizen-centric
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Shield className="h-4 w-4" />
                    Secure & transparent
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Globe className="h-4 w-4" />
                    State-wide coverage
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-6 w-full max-w-md space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white/10">
                    <Heart className="h-6 w-6 text-amber-200" />
                  </div>
                  <div>
                    <p className="text-sm text-white/80">
                      Our mission is to bridge the gap between citizens and
                      administration, ensuring every grievance is heard, tracked,
                      and resolved with accountability and transparency.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <p className="text-white/70">Established</p>
                    <p className="font-semibold">2020</p>
                  </div>
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <p className="text-white/70">Coverage</p>
                    <p className="font-semibold">75 Districts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Mission & Values */}
        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed max-w-3xl">
              To provide an efficient, transparent, and accessible platform for
              grievance redressal that empowers citizens and holds the
              administration accountable for timely resolution of public concerns.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {missionValues.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className={`rounded-2xl border ${value.color} p-6 shadow-sm`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-white shadow-inner">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold">{value.title}</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Statistics */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 lg:p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Impact at a Glance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 p-6 text-center"
                >
                  <div className="flex justify-center mb-3">
                    <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className={`text-3xl font-bold ${stat.color} mb-2`}>
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-700 font-medium">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md transition-shadow"
                >
                  <div className="p-3 rounded-lg bg-[#ff791a]/10 w-fit">
                    <Icon className="h-6 w-6 text-[#ff791a]" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Timeline */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 lg:p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#1e3a5f] to-[#ff791a]"></div>
            <div className="space-y-8">
              {timeline.map((item, idx) => (
                <div key={idx} className="relative flex gap-6">
                  <div className="relative z-10">
                    <div className="w-8 h-8 rounded-full bg-[#1e3a5f] border-4 border-white shadow-lg flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  </div>
                  <div className="flex-1 pb-8">
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-[#1e3a5f]">
                          {item.year}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Governance & Contact */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-5 w-5 text-[#1e3a5f]" />
              <h3 className="text-2xl font-semibold">Governance</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              The Jansunwai-Samadhan system is managed and operated by the
              Department of Public Grievances, Government of Uttar Pradesh, under
              the guidance of state-level oversight committees.
            </p>
            <ul className="space-y-2 text-sm text-gray-800 leading-relaxed">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a]" />
                Regular monitoring by state-level grievance committees
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a]" />
                District-level coordination and resolution mechanisms
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#ff791a]" />
                Periodic audits and performance reviews
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-[#1e3a5f] text-white shadow-xl p-6 lg:p-8 border border-[#2a4a6f]">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="h-5 w-5" />
              <h3 className="text-2xl font-semibold">Get in Touch</h3>
            </div>
            <p className="text-sm text-white/80 leading-relaxed mb-4">
              Have questions about the system or need assistance? Reach out to our
              support team.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold w-28">Email</span>
                <a
                  href="mailto:jansunwai-up@gov.in"
                  className="text-orange-200 hover:underline break-all"
                >
                  jansunwai-up@gov.in
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
                  Lucknow, Uttar Pradesh - 226001
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

export default About;
