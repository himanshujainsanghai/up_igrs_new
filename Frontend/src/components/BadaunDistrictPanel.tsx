/**
 * Badaun District Panel Component
 * Shows when clicking on Badaun district itself
 * Displays comprehensive district data including administrative heads, demographics, and complaints
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MapPin,
  Users,
  Building2,
  Shield,
  BarChart3,
  FileText,
  Phone,
  Mail,
  Globe,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  type DistrictData,
  type AdministrativeHead,
  type DemographicReligion,
  type DemographicCaste,
} from "@/services/district.service";
import { useBadaunDistrict } from "@/contexts/BadaunDistrictContext";
import { HorizontalStackedBar } from "./DynamicEntityPanel";

// Re-export types for backward compatibility
export type {
  DistrictData,
  AdministrativeHead,
  DemographicReligion,
  DemographicCaste,
};

interface BadaunDistrictPanelProps {
  data?: DistrictData | null;
  isOpen?: boolean;
  onClose?: () => void;
}

const BadaunDistrictPanel: React.FC<BadaunDistrictPanelProps> = ({
  data: propsData,
  isOpen: propsIsOpen,
  onClose: propsOnClose,
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Use context hook (will throw if provider not available, but that's expected)
  // In production, the provider should always be available via App.tsx
  let contextData: DistrictData | null = null;
  let contextIsOpen = false;
  let contextOnClose = () => {};

  try {
    const context = useBadaunDistrict();
    contextData = context.districtData;
    contextIsOpen = context.isPanelOpen;
    contextOnClose = () => context.setIsPanelOpen(false);
  } catch (err) {
    // Context not available - component will only work with props
    // This is fine for backward compatibility
  }

  // Props take precedence over context
  // If props are provided, use them; otherwise fall back to context
  const data =
    propsData !== undefined && propsData !== null ? propsData : contextData;
  const isOpen = propsIsOpen !== undefined ? propsIsOpen : contextIsOpen;
  const onClose = propsOnClose || contextOnClose;

  if (!isOpen || !data) return null;

  const formatNumber = (num: number) => {
    if (num >= 100000) return (num / 100000).toFixed(2) + " Lakh";
    if (num >= 1000) return (num / 1000).toFixed(2) + " K";
    return num.toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <MapPin className="h-6 w-6 text-orange-600" />
            {data.districtName} District
          </DialogTitle>
          <p className="text-sm ml-5 text-muted-foreground">
            Total Complaints: {data.complaints.total}
          </p>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-6 grid w-auto grid-cols-3">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="administrative"
              className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white"
            >
              Administrative
            </TabsTrigger>
            <TabsTrigger
              value="demography"
              className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white"
            >
              Demography
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Basic Demographics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-600 font-medium">Area</p>
                    <p className="text-xl font-bold">
                      {data.area.toLocaleString()} Sq. Km.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-600 font-medium">
                      Population
                    </p>
                    <p className="text-xl font-bold">
                      {formatNumber(data.population)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-600 font-medium">Male</p>
                    <p className="text-xl font-bold">
                      {formatNumber(data.malePopulation)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-600 font-medium">Female</p>
                    <p className="text-xl font-bold">
                      {formatNumber(data.femalePopulation)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-600 font-medium">
                      Villages
                    </p>
                    <p className="text-xl font-bold">
                      {data.totalVillages.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                {data.administrativeHead?.district_profile
                  ?.official_website && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 font-medium mb-1">
                            Official Website
                          </p>
                          <a
                            href={
                              data.administrativeHead.district_profile
                                .official_website
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 font-semibold"
                          >
                            <Globe className="h-4 w-4" />
                            {
                              data.administrativeHead.district_profile
                                .official_website
                            }
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Complaint Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Complaint Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <Card className="border-yellow-300 bg-yellow-50">
                      <CardContent className="p-3">
                        <p className="text-xs text-yellow-700 font-medium">
                          Pending
                        </p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {data.complaints.byStatus.pending || 0}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-green-300 bg-green-50">
                      <CardContent className="p-3">
                        <p className="text-xs text-green-700 font-medium">
                          In Progress
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {data.complaints.byStatus.in_progress || 0}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-gray-200 bg-white">
                      <CardContent className="p-3">
                        <p className="text-xs text-gray-700 font-medium">
                          Resolved
                        </p>
                        <p className="text-2xl font-bold text-gray-800">
                          {data.complaints.byStatus.resolved || 0}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-red-700 bg-red-100">
                      <CardContent className="p-3">
                        <p className="text-xs text-red-900 font-medium">
                          Rejected
                        </p>
                        <p className="text-2xl font-bold text-red-800">
                          {data.complaints.byStatus.rejected || 0}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* By Category Pie Chart */}
                    <div>
                      <p className="text-sm font-semibold mb-4">By Category</p>
                      <PieChart
                        data={Object.entries(data.complaints.byCategory).map(
                          ([cat, count]) => ({
                            name: cat,
                            value: count as number,
                          })
                        )}
                        colors={[
                          "#3B82F6", // blue - roads
                          "#10B981", // green - water
                          "#ff671f", // orange - electricity
                          "#EF4444", // red - health
                          "#8B5CF6", // purple - education
                          "#EC4899", // pink - documents
                          "#06B6D4", // cyan
                          "#84CC16", // lime
                        ]}
                      />
                    </div>

                    {/* By Priority Pie Chart */}
                    <div>
                      <p className="text-sm font-semibold mb-4">By Priority</p>
                      <PieChart
                        data={Object.entries(data.complaints.byPriority).map(
                          ([priority, count]) => ({
                            name: priority,
                            value: count as number,
                          })
                        )}
                        colors={[
                          "#EF4444", // red - high
                          "#ff671f", // orange - urgent
                          "#3B82F6", // blue - medium
                          "#10B981", // green
                        ]}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* All Complaints List */}
              {data.complaintsList.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      All Complaints ({data.complaintsList.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                      {data.complaintsList.map((complaint) => (
                        <Card
                          key={complaint.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">
                                  {complaint.title}
                                </h4>
                                <p className="text-xs mt-1">
                                  <span className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md inline-block">
                                    {complaint.village_name}
                                  </span>
                                  <span className="text-gray-600 ml-2">
                                    , {complaint.subdistrict_name}
                                  </span>
                                </p>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  <Badge
                                    variant={
                                      complaint.status === "pending"
                                        ? "default"
                                        : complaint.status === "in_progress"
                                        ? "secondary"
                                        : complaint.status === "resolved"
                                        ? "outline"
                                        : "destructive"
                                    }
                                    className={`text-xs ${
                                      complaint.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                                        : complaint.status === "in_progress"
                                        ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                                        : complaint.status === "resolved"
                                        ? "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                                        : "bg-red-900 text-white border-red-900 hover:bg-red-800"
                                    }`}
                                  >
                                    {complaint.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {complaint.category}
                                  </Badge>
                                  {complaint.sub_category && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {complaint.sub_category}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">
                                  {complaint.complaint_id}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(
                                    complaint.created_at
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Administrative Tab */}
            <TabsContent value="administrative" className="mt-4 space-y-4">
              {data.administrativeHead ? (
                <>
                  {/* District Profile */}

                  {/* MLAs */}
                  {data.administrativeHead.legislative_authorities
                    .members_of_legislative_assembly_MLA.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Members of Legislative Assembly (MLA)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {data.administrativeHead.legislative_authorities.members_of_legislative_assembly_MLA.map(
                            (mla, idx) => {
                              const isBJP =
                                mla.party
                                  .toLowerCase()
                                  .includes("bharatiya janata party") ||
                                mla.party.toLowerCase().includes("bjp");

                              return (
                                <Card
                                  key={idx}
                                  className={
                                    isBJP
                                      ? "border-l-4 border-l-orange-500"
                                      : "border-l-4 border-l-green-500"
                                  }
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                      {mla.image &&
                                        mla.image !== "Not Available" && (
                                          <img
                                            src={mla.image}
                                            alt={mla.name}
                                            className={`w-20 h-30 rounded object-cover `}
                                          />
                                        )}
                                      <div className="flex-1">
                                        <h4 className="font-bold text-sm">
                                          {mla.name}
                                        </h4>
                                        <p className="text-xs text-gray-600 mt-1">
                                          {mla.constituency_name} (Constituency
                                          #{mla.constituency_no})
                                        </p>
                                        <Badge
                                          className={`mt-2 ${
                                            isBJP
                                              ? "bg-orange-100 text-orange-800 border-orange-300"
                                              : "bg-green-100 text-green-800 border-green-300"
                                          }`}
                                          variant="outline"
                                        >
                                          {mla.party}
                                        </Badge>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {mla.status}
                                        </p>
                                        {mla.contact?.phone && (
                                          <div className="flex items-center gap-1 mt-2 text-xs">
                                            <Phone className="h-3 w-3" />
                                            {mla.contact.phone}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            }
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* MLCs */}
                  {data.administrativeHead.legislative_authorities
                    .member_of_legislative_council_MLC.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Members of Legislative Council (MLC)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {data.administrativeHead.legislative_authorities.member_of_legislative_council_MLC.map(
                            (mlc, idx) => {
                              const isBJP =
                                mlc.party
                                  .toLowerCase()
                                  .includes("bharatiya janata party") ||
                                mlc.party.toLowerCase().includes("bjp");

                              return (
                                <Card
                                  key={idx}
                                  className={
                                    isBJP
                                      ? "border-l-4 border-l-orange-500"
                                      : "border-l-4 border-l-green-500"
                                  }
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      {mlc.image &&
                                        mlc.image !== "Not Available" && (
                                          <img
                                            src={mlc.image}
                                            alt={mlc.name}
                                            className={`w-16 h-16 rounded object-cover border-2 ${
                                              isBJP
                                                ? "border-orange-500"
                                                : "border-green-500"
                                            }`}
                                          />
                                        )}
                                      <div className="flex-1">
                                        <h4 className="font-bold">
                                          {mlc.name}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                          {mlc.constituency_type}
                                        </p>
                                        <Badge
                                          className={`mt-2 ${
                                            isBJP
                                              ? "bg-orange-100 text-orange-800 border-orange-300"
                                              : "bg-green-100 text-green-800 border-green-300"
                                          }`}
                                          variant="outline"
                                        >
                                          {mlc.party}
                                        </Badge>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {mlc.status}
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            }
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Local Body Heads */}
                  {data.administrativeHead.legislative_authorities
                    .local_body_heads.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Local Body Heads
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {data.administrativeHead.legislative_authorities.local_body_heads.map(
                            (head, idx) => {
                              const isBJP =
                                head.party
                                  ?.toLowerCase()
                                  .includes("bharatiya janata party") ||
                                head.party?.toLowerCase().includes("bjp");

                              return (
                                <Card
                                  key={idx}
                                  className={
                                    isBJP
                                      ? "border-l-4 border-l-orange-500"
                                      : "border-l-4 border-l-green-500"
                                  }
                                >
                                  <CardContent className="p-4">
                                    <h4 className="font-bold">{head.name}</h4>
                                    <p className="text-sm text-gray-600">
                                      {head.designation}
                                    </p>
                                    <Badge
                                      className={`mt-2 ${
                                        isBJP
                                          ? "bg-orange-100 text-orange-800 border-orange-300"
                                          : "bg-green-100 text-green-800 border-green-300"
                                      }`}
                                      variant="outline"
                                    >
                                      {head.party}
                                    </Badge>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {head.level}
                                    </p>
                                    {head.contact?.office_phone && (
                                      <div className="flex items-center gap-1 mt-2 text-xs">
                                        <Phone className="h-3 w-3" />
                                        {head.contact.office_phone}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            }
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* General Administration */}
                  {data.administrativeHead.executive_authorities
                    .general_administration.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          General Administration
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {data.administrativeHead.executive_authorities.general_administration.map(
                            (admin, idx) => (
                              <Card
                                key={idx}
                                className="border-l-4 border-l-[#0c245a]"
                              >
                                <CardContent className="p-4">
                                  <h4 className="font-bold">{admin.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    {admin.designation}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {admin.role}
                                  </p>
                                  <div className="mt-3 space-y-1">
                                    {admin.contact?.cug_mobile && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Phone className="h-3 w-3" />
                                        CUG: {admin.contact.cug_mobile}
                                      </div>
                                    )}
                                    {admin.contact?.office_phone && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Phone className="h-3 w-3" />
                                        Office: {admin.contact.office_phone}
                                      </div>
                                    )}
                                    {admin.contact?.email && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Mail className="h-3 w-3" />
                                        {admin.contact.email}
                                      </div>
                                    )}
                                    {admin.contact?.address && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <MapPin className="h-3 w-3" />
                                        {admin.contact.address}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Police Administration */}
                  {data.administrativeHead.executive_authorities
                    .police_administration.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Police Administration
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {data.administrativeHead.executive_authorities.police_administration.map(
                            (police, idx) => (
                              <Card
                                key={idx}
                                className="border-l-4 border-l-[#0c245a]"
                              >
                                <CardContent className="p-4">
                                  <h4 className="font-bold">{police.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    {police.designation}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {police.role}
                                  </p>
                                  <div className="mt-3 space-y-1">
                                    {police.contact?.cug_mobile && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Phone className="h-3 w-3" />
                                        CUG: {police.contact.cug_mobile}
                                      </div>
                                    )}
                                    {police.contact?.office_phone && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Phone className="h-3 w-3" />
                                        Office: {police.contact.office_phone}
                                      </div>
                                    )}
                                    {police.contact?.email && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Mail className="h-3 w-3" />
                                        {police.contact.email}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    No administrative data available
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Demography Tab - Combined Religion and Caste */}
            <TabsContent value="demography" className="mt-4 space-y-4">
              <Tabs defaultValue="religion" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger
                    value="religion"
                    className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white"
                  >
                    Religion
                  </TabsTrigger>
                  <TabsTrigger
                    value="caste"
                    className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white"
                  >
                    Caste
                  </TabsTrigger>
                </TabsList>

                {/* Religion Sub-Tab */}
                <TabsContent value="religion" className="mt-4 space-y-4">
                  {data.demographicReligion ? (
                    <>
                      {/* District Level Stats */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Religion Demographics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Tabs defaultValue="total" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger
                                value="total"
                                className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white"
                              >
                                Total
                              </TabsTrigger>
                              <TabsTrigger
                                value="rural"
                                className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white"
                              >
                                Rural
                              </TabsTrigger>
                              <TabsTrigger
                                value="urban"
                                className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white"
                              >
                                Urban
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent value="total" className="mt-4">
                              <ReligionStats
                                stats={
                                  data.demographicReligion.district_stats.Total
                                }
                              />
                            </TabsContent>
                            <TabsContent value="rural" className="mt-4">
                              <ReligionStats
                                stats={
                                  data.demographicReligion.district_stats.Rural
                                }
                              />
                            </TabsContent>
                            <TabsContent value="urban" className="mt-4">
                              <ReligionStats
                                stats={
                                  data.demographicReligion.district_stats.Urban
                                }
                              />
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>

                      {/* Sub-Districts */}
                      {/* {data.demographicReligion.sub_districts.length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <MapPin className="h-5 w-5" />
                              Sub-Districts (
                              {data.demographicReligion.sub_districts.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {data.demographicReligion.sub_districts.map(
                                (subDist, idx) => (
                                  <Card
                                    key={idx}
                                    className="border-l-4 border-l-indigo-500"
                                  >
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base">
                                        {subDist.name} ({subDist.code})
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <Tabs defaultValue="total">
                                        <TabsList className="grid w-full grid-cols-3">
                                          <TabsTrigger value="total" className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white">
                                            Total
                                          </TabsTrigger>
                                          <TabsTrigger value="rural" className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white">
                                            Rural
                                          </TabsTrigger>
                                          <TabsTrigger value="urban" className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white">
                                            Urban
                                          </TabsTrigger>
                                        </TabsList>
                                        <TabsContent
                                          value="total"
                                          className="mt-3"
                                        >
                                          <ReligionStats
                                            stats={subDist.stats.Total}
                                          />
                                        </TabsContent>
                                        <TabsContent
                                          value="rural"
                                          className="mt-3"
                                        >
                                          <ReligionStats
                                            stats={subDist.stats.Rural}
                                          />
                                        </TabsContent>
                                        <TabsContent
                                          value="urban"
                                          className="mt-3"
                                        >
                                          <ReligionStats
                                            stats={subDist.stats.Urban}
                                          />
                                        </TabsContent>
                                      </Tabs>
                                      {subDist.towns.length > 0 && (
                                        <div className="mt-4">
                                          <p className="text-sm font-semibold mb-2">
                                            Towns ({subDist.towns.length})
                                          </p>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {subDist.towns.map((town, tIdx) => (
                                              <Card
                                                key={tIdx}
                                                className="bg-gray-50"
                                              >
                                                <CardContent className="p-3">
                                                  <p className="font-medium text-sm">
                                                    {town.name}
                                                  </p>
                                                  <p className="text-xs text-gray-600">
                                                    {town.type}
                                                  </p>
                                                  <p className="text-xs mt-1">
                                                    Population:{" "}
                                                    {town.population.persons.toLocaleString()}
                                                  </p>
                                                </CardContent>
                                              </Card>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                )
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )} */}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        No religion demographic data available
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Caste Sub-Tab */}
                <TabsContent value="caste" className="mt-4 space-y-4">
                  {data.demographicCaste ? (
                    <>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Caste Demographics (Census{" "}
                            {data.demographicCaste.district_info.census_year})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Scheduled Castes - Left Side */}
                            {data.demographicCaste.demographics
                              ?.scheduled_castes?.length > 0 && (
                              <Card className="border-l-4 border-l-blue-500">
                                <CardHeader>
                                  <CardTitle className="text-base">
                                    Scheduled Castes (SC)
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <CasteList
                                    castes={
                                      data.demographicCaste.demographics
                                        .scheduled_castes
                                    }
                                    title="Scheduled Castes"
                                  />
                                </CardContent>
                              </Card>
                            )}

                            {/* Scheduled Tribes - Right Side */}
                            {data.demographicCaste.demographics
                              ?.scheduled_tribes?.length > 0 && (
                              <Card className="border-l-4 border-l-green-500">
                                <CardHeader>
                                  <CardTitle className="text-base">
                                    Scheduled Tribes (ST)
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <CasteList
                                    castes={
                                      data.demographicCaste.demographics
                                        .scheduled_tribes
                                    }
                                    title="Scheduled Tribes"
                                  />
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        No caste demographic data available
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Helper component for Religion Stats
const ReligionStats: React.FC<{ stats: any }> = ({ stats }) => {
  const religions = [
    { key: "hindu", label: "Hindu", color: "#ff671f" },
    { key: "muslim", label: "Muslim", color: "#00401A" },
    { key: "christian", label: "Christian", color: "#3B82F6" },
    { key: "sikh", label: "Sikh", color: "#F59E0B" },
    { key: "buddhist", label: "Buddhist", color: "#8B5CF6" },
    { key: "jain", label: "Jain", color: "#EC4899" },
    { key: "others", label: "Others", color: "#6B7280" },
    { key: "not_stated", label: "Not Stated", color: "#94A3B8" },
  ];

  // Prepare religion data for pie chart
  const religionData = religions
    .map((religion) => {
      const data = stats.religion[religion.key];
      if (!data) return null;
      return {
        name: religion.label,
        value: data.persons,
        color: religion.color,
        males: data.males,
        females: data.females,
      };
    })
    .filter((item) => item !== null) as Array<{
    name: string;
    value: number;
    color: string;
    males: number;
    females: number;
  }>;

  return (
    <div className="space-y-4">
      {/* Population Summary - 100% Stacked Horizontal Bar Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Population Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <HorizontalStackedBar
            male={stats.population.males}
            female={stats.population.females}
            height={40}
          />
        </CardContent>
      </Card>

      {/* Religion Distribution with Pie Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Religion Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Pie Chart */}
            <div className="flex-shrink-0 flex justify-center">
              <PieChart
                data={religionData.map((d) => ({
                  name: d.name,
                  value: d.value,
                }))}
                colors={religionData.map((d) => d.color)}
                showDataPoints={false}
              />
            </div>
            <div className="flex-1 min-w-0">
              <Accordion type="single" collapsible className="w-full">
                {religionData.map((item, idx) => {
                  const percentage = (
                    (item.value / stats.population.persons) *
                    100
                  ).toFixed(2);
                  return (
                    <AccordionItem
                      key={idx}
                      value={`religion-${idx}`}
                      className="border-b"
                    >
                      <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-semibold text-sm">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-bold">
                              {item.value.toLocaleString()}
                            </span>
                            <span className="text-gray-500 text-xs">
                              ({percentage}%)
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3">
                        <div className="space-y-3 pl-5">
                          {/* 100% Stacked Horizontal Bar Chart */}
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              Gender Distribution
                            </p>
                            <HorizontalStackedBar
                              male={item.males}
                              female={item.females}
                              height={28}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper component for Caste List
const CasteList: React.FC<{
  castes: Array<{
    caste_name: string;
    population: { total: number; male: number; female: number };
  }>;
  title: string;
}> = ({ castes, title }) => {
  if (castes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No {title} data available
        </CardContent>
      </Card>
    );
  }

  // Filter out aggregate entries ("All Schedule Castes" and "All Schedule Tribes")
  const filteredCastes = castes.filter(
    (c) =>
      c.caste_name !== "All Schedule Castes" &&
      c.caste_name !== "All Schedule Tribes"
  );

  const total = filteredCastes.reduce((sum, c) => sum + c.population.total, 0);
  const totalMale = filteredCastes.reduce(
    (sum, c) => sum + c.population.male,
    0
  );
  const totalFemale = filteredCastes.reduce(
    (sum, c) => sum + c.population.female,
    0
  );

  // Prepare data for pie chart (top 10 castes by population)
  const sortedCastes = [...filteredCastes].sort(
    (a, b) => b.population.total - a.population.total
  );
  const topCastes = sortedCastes.slice(0, 10);
  const otherTotal = sortedCastes
    .slice(10)
    .reduce((sum, c) => sum + c.population.total, 0);

  const pieChartData = topCastes.map((c) => ({
    name: c.caste_name,
    value: c.population.total,
  }));

  if (otherTotal > 0) {
    pieChartData.push({
      name: "Others",
      value: otherTotal,
    });
  }

  // Generate colors for pie chart
  const colors = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#84CC16", // lime
    "#F97316", // orange
    "#6366F1", // indigo
    "#6B7280", // gray
  ];

  return (
    <div className="space-y-4">
      {/* Male vs Female - Horizontal Stacked Bar Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gender Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <HorizontalStackedBar
            male={totalMale}
            female={totalFemale}
            height={40}
          />
        </CardContent>
      </Card>

      {/* Pie Chart for Top Castes */}
      {pieChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Top {topCastes.length} Castes Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center lg:flex-row gap-4">
              <div className="flex-shrink-0 flex justify-center">
                <PieChart
                  data={pieChartData}
                  colors={colors}
                  showDataPoints={false}
                />
              </div>
              {/* <div className="flex-1 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                  {pieChartData.map((item, idx) => {
                    const percentage = ((item.value / total) * 100).toFixed(2);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: colors[idx % colors.length],
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs truncate">
                            {item.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold">
                            {item.value.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div> */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collapsible Caste List */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="all-castes" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <CardTitle className="text-base">
              All Castes ({castes.length})
            </CardTitle>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Accordion type="single" collapsible className="w-full">
              {sortedCastes.map((caste, idx) => {
                const percentage = (
                  (caste.population.total / total) *
                  100
                ).toFixed(2);
                const malePercentage = (
                  (caste.population.male / caste.population.total) *
                  100
                ).toFixed(1);
                const femalePercentage = (
                  (caste.population.female / caste.population.total) *
                  100
                ).toFixed(1);

                return (
                  <AccordionItem
                    key={idx}
                    value={`caste-${idx}`}
                    className="border-b"
                  >
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: colors[idx % colors.length],
                            }}
                          />
                          <span className="font-semibold text-sm truncate">
                            {caste.caste_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm flex-shrink-0">
                          <span className="font-bold">
                            {caste.population.total.toLocaleString()}
                          </span>
                          <span className="text-gray-500 text-xs">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3">
                      <div className="grid grid-cols-2 gap-3 pl-5">
                        <div className="bg-blue-50 rounded p-2 border-l-4 border-blue-400">
                          <p className="text-xs text-gray-600 mb-1">Male</p>
                          <p className="font-semibold text-sm">
                            {caste.population.male.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {malePercentage}% of caste
                          </p>
                        </div>
                        <div className="bg-pink-50 rounded p-2 border-l-4 border-pink-400">
                          <p className="text-xs text-gray-600 mb-1">Female</p>
                          <p className="font-semibold text-sm">
                            {caste.population.female.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {femalePercentage}% of caste
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

// Pie Chart Component
export interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  colors: string[];
  showDataPoints?: boolean; // Optional prop to show/hide data points
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  colors,
  showDataPoints = true,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = 200;
  const center = size / 2;
  const radius = 80;

  let currentAngle = -90; // Start from top

  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    return {
      path: pathData,
      color: colors[index % colors.length],
      name: item.name,
      value: item.value,
      percentage: percentage.toFixed(1),
      startAngle,
      endAngle,
    };
  });

  return (
    <div
      className={`flex ${
        showDataPoints ? "flex-col md:flex-row" : "flex-col"
      } items-center gap-6`}
    >
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {slices.map((slice, index) => (
            <path
              key={index}
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </svg>
      </div>
      {showDataPoints && (
        <div className="flex-1 space-y-2">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex-1 flex justify-between items-center">
                <span className="text-sm font-medium capitalize">
                  {slice.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{slice.value}</span>
                  <span className="text-xs text-gray-500">
                    ({slice.percentage}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BadaunDistrictPanel;
