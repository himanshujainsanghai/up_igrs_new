/**
 * Complaints Heat Map Component
 * Displays custom SVG map of Uttar Pradesh with heat map visualization
 */

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Complaint } from "@/types";
import { MapPin, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ComplaintsHeatMapProps {
  complaints: Complaint[];
  loading?: boolean;
}

interface ComplaintPoint {
  x: number;
  y: number;
  lat: number;
  lng: number;
  complaint: Complaint;
  complaints: Complaint[];
  number: number;
}

// Uttar Pradesh bounds
const UP_BOUNDS = {
  north: 30.5,
  south: 23.5,
  east: 84.5,
  west: 77.0,
};

// Uttar Pradesh SVG viewBox (adjusted for UP bounds)
const UP_VIEWBOX = "0 0 800 600"; // width height

// Convert lat/lon to SVG coordinates for Uttar Pradesh
const latLonToSVG = (lat: number, lon: number) => {
  // Uttar Pradesh bounds
  const width = 800;
  const height = 600;
  const x =
    ((lon - UP_BOUNDS.west) / (UP_BOUNDS.east - UP_BOUNDS.west)) * width;
  const y =
    height -
    ((lat - UP_BOUNDS.south) / (UP_BOUNDS.north - UP_BOUNDS.south)) * height;
  return { x, y };
};

// Uttar Pradesh state outline (accurate shape based on state boundaries)
// This path represents the approximate shape of Uttar Pradesh
const UTTAR_PRADESH_PATH = `
  M 0 50
  L 50 45 L 100 40 L 150 38 L 200 36 L 250 35 L 300 34 L 350 33 L 400 32
  L 450 31 L 500 30 L 550 29 L 600 28 L 650 27 L 700 26 L 750 25 L 780 24
  L 790 30 L 795 50 L 798 80 L 800 120 L 798 160 L 795 200 L 790 240
  L 785 280 L 780 320 L 770 360 L 760 400 L 745 440 L 725 480 L 700 520
  L 670 550 L 635 570 L 595 585 L 550 590 L 500 592 L 450 590 L 400 585
  L 350 580 L 300 575 L 250 570 L 200 565 L 150 560 L 100 555 L 50 550
  L 20 540 L 10 520 L 5 480 L 2 440 L 0 400 L 0 350 L 0 300 L 0 250
  L 0 200 L 0 150 L 0 100 L 0 50 Z
`;

const ComplaintsHeatMap: React.FC<ComplaintsHeatMapProps> = ({
  complaints,
  loading,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<ComplaintPoint | null>(
    null
  );
  const [hoveredPoint, setHoveredPoint] = useState<ComplaintPoint | null>(null);

  // Process complaints to extract coordinates and group by location
  const complaintPoints = useMemo(() => {
    const points: ComplaintPoint[] = [];
    const locationMap = new Map<
      string,
      { lat: number; lng: number; complaints: Complaint[] }
    >();

    complaints.forEach((complaint) => {
      let lat: number | null = null;
      let lng: number | null = null;

      // Extract coordinates from complaint location
      if (complaint.location) {
        // Case 1: Location is an object with latitude/longitude
        if (
          typeof complaint.location === "object" &&
          complaint.location !== null
        ) {
          if (
            "latitude" in complaint.location &&
            "longitude" in complaint.location
          ) {
            lat = Number(complaint.location.latitude);
            lng = Number(complaint.location.longitude);
          }
        }
        // Case 2: Location is a string - try multiple parsing methods
        else if (typeof complaint.location === "string") {
          const locationStr = String(complaint.location).trim();

          // Try parsing "lat,lon" format
          let match = locationStr.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
          if (match) {
            lat = parseFloat(match[1]);
            lng = parseFloat(match[2]);
          } else {
            // Try parsing JSON string
            try {
              const parsed = JSON.parse(locationStr);
              if (parsed && typeof parsed === "object") {
                if (parsed.latitude && parsed.longitude) {
                  lat = Number(parsed.latitude);
                  lng = Number(parsed.longitude);
                } else if (parsed.lat && parsed.lng) {
                  lat = Number(parsed.lat);
                  lng = Number(parsed.lng);
                }
              }
            } catch (e) {
              // Not JSON, continue
            }
          }
        }
      }

      // Debug: Log complaints without valid coordinates
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.debug("Complaint without valid coordinates:", {
          id: complaint.id || complaint._id,
          title: complaint.title,
          location: complaint.location,
        });
      }

      // Only add if we have valid coordinates within Uttar Pradesh bounds
      if (
        lat &&
        lng &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= UP_BOUNDS.south &&
        lat <= UP_BOUNDS.north &&
        lng >= UP_BOUNDS.west &&
        lng <= UP_BOUNDS.east
      ) {
        // Round to 2 decimal places for grouping nearby complaints
        const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;

        if (!locationMap.has(key)) {
          locationMap.set(key, { lat, lng, complaints: [] });
        }
        locationMap.get(key)!.complaints.push(complaint);
      }
    });

    // Convert to array format with SVG coordinates and numbering
    let number = 1;
    locationMap.forEach((value) => {
      const { x, y } = latLonToSVG(value.lat, value.lng);
      const complaintId =
        value.complaints[0].id ||
        value.complaints[0]._id ||
        `${value.lat},${value.lng}`;
      points.push({
        x,
        y,
        lat: value.lat,
        lng: value.lng,
        complaint: value.complaints[0],
        complaints: value.complaints,
        number: number++,
      });
    });

    console.log("Processed complaint points:", {
      totalComplaints: complaints.length,
      validPoints: points.length,
      points: points.map((p) => ({
        number: p.number,
        lat: p.lat,
        lng: p.lng,
        count: p.complaints.length,
      })),
    });

    return points;
  }, [complaints]);

  // Calculate heat map data (for gradient overlay)
  const heatMapData = useMemo(() => {
    // Create a grid for heat map visualization
    const gridSize = 20;
    const heatGrid: Array<{ x: number; y: number; intensity: number }> = [];

    complaintPoints.forEach((point) => {
      const intensity = Math.min(point.complaints.length / 10, 1);
      heatGrid.push({
        x: point.x,
        y: point.y,
        intensity,
      });
    });

    return heatGrid;
  }, [complaintPoints]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = complaintPoints.length;
    const byStatus = {
      pending: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
    };

    complaints.forEach((c) => {
      const status = c.status === "in_progress" ? "in_progress" : c.status;
      if (status in byStatus) {
        byStatus[status as keyof typeof byStatus]++;
      }
    });

    return { total, byStatus };
  }, [complaints, complaintPoints]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading map data...</p>
        </CardContent>
      </Card>
    );
  }

  // Show message if no valid coordinates found
  const hasNoValidCoordinates =
    complaints.length > 0 && complaintPoints.length === 0;

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Locations</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Total Complaints
            </div>
            <div className="text-2xl font-bold">{complaints.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-orange-600">
              {stats.byStatus.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Resolved</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.byStatus.resolved}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Complaint Locations Heat Map - Uttar Pradesh
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasNoValidCoordinates && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>No valid coordinates found:</strong> The complaints
                don't have latitude/longitude coordinates within Uttar Pradesh
                bounds. Please ensure complaints have location data with
                coordinates (lat, lng) or geocoded addresses.
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                Debug: Found {complaints.length} complaints but{" "}
                {complaintPoints.length} valid locations. Check browser console
                for details.
              </p>
            </div>
          )}
          <div className="w-full border rounded-lg overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 relative">
            <svg
              viewBox={UP_VIEWBOX}
              className="w-full h-[600px]"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Define gradients for heat map */}
              <defs>
                <radialGradient id="heatGradient" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#ff671f" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#FB923C" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#FED7AA" stopOpacity="0.2" />
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Uttar Pradesh state outline - Green fill */}
              <path
                d={UTTAR_PRADESH_PATH}
                fill="#10B981"
                fillOpacity="0.3"
                stroke="#059669"
                strokeWidth="2"
                className="transition-all duration-300"
              />

              {/* Heat map overlay - Orange radial gradients */}
              {heatMapData.map((heat, index) => {
                const radius = 30 + heat.intensity * 40;
                return (
                  <circle
                    key={`heat-${index}`}
                    cx={heat.x}
                    cy={heat.y}
                    r={radius}
                    fill="url(#heatGradient)"
                    opacity={0.4 * heat.intensity}
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}

              {/* Numbered markers for complaints */}
              {complaintPoints.map((point, index) => {
                const status =
                  point.complaint.status === "in_progress"
                    ? "in_progress"
                    : point.complaint.status;
                const isHovered = hoveredPoint?.number === point.number;
                const isSelected = selectedPoint?.number === point.number;

                // Color based on status
                const markerColor =
                  {
                    pending: "#ff671f",
                    in_progress: "#3B82F6",
                    resolved: "#10B981",
                    rejected: "#EF4444",
                  }[status] || "#6B7280";

                // Size based on complaint count
                const markerSize = Math.min(
                  20 + point.complaints.length * 3,
                  35
                );
                const numberSize = markerSize * 0.5;

                return (
                  <g
                    key={index}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedPoint(point)}
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    transform={`translate(${point.x}, ${point.y})`}
                  >
                    {/* Outer glow on hover */}
                    {(isHovered || isSelected) && (
                      <circle
                        r={markerSize + 5}
                        fill={markerColor}
                        opacity="0.3"
                        className="animate-pulse"
                      />
                    )}

                    {/* Marker circle */}
                    <circle
                      r={markerSize}
                      fill={markerColor}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      opacity={isHovered || isSelected ? 1 : 0.9}
                      filter={
                        isHovered || isSelected ? "url(#glow)" : undefined
                      }
                      className="transition-all duration-200"
                    />

                    {/* Number label */}
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#FFFFFF"
                      fontSize={numberSize}
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="0.5"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {point.number}
                    </text>

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <g transform="translate(0, -40)">
                        <rect
                          x={-60}
                          y={-20}
                          width="120"
                          height="30"
                          fill="#1F2937"
                          fillOpacity="0.9"
                          rx="4"
                        />
                        <text
                          x="0"
                          y="0"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#FFFFFF"
                          fontSize="10"
                          fontWeight="500"
                        >
                          {point.complaint.title}
                        </text>
                        <text
                          x="0"
                          y="12"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#D1D5DB"
                          fontSize="8"
                        >
                          {point.complaints.length} complaint
                          {point.complaints.length > 1 ? "s" : ""}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-semibold">Legend:</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span className="text-sm">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm">Resolved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm">Rejected</span>
            </div>
            <div className="ml-4 text-xs text-muted-foreground">
              Green area = Uttar Pradesh | Orange heat = Complaint density |
              Numbers = Location markers
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complaint Details Dialog */}
      <Dialog
        open={!!selectedPoint}
        onOpenChange={() => setSelectedPoint(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Complaint #{selectedPoint?.number}:{" "}
              {selectedPoint?.complaint.title}
            </DialogTitle>
            <DialogDescription>Complaint Details</DialogDescription>
          </DialogHeader>
          {selectedPoint && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    selectedPoint.complaint.status === "pending"
                      ? "destructive"
                      : selectedPoint.complaint.status === "resolved"
                      ? "default"
                      : "secondary"
                  }
                >
                  {selectedPoint.complaint.status}
                </Badge>
                <Badge variant="outline">
                  {selectedPoint.complaint.priority}
                </Badge>
              </div>
              {selectedPoint.complaints.length > 1 && (
                <p className="text-sm text-muted-foreground">
                  <strong>{selectedPoint.complaints.length} complaints</strong>{" "}
                  at this location
                </p>
              )}
              {typeof selectedPoint.complaint.location === "object" &&
                selectedPoint.complaint.location?.address && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Address:</strong>{" "}
                    {selectedPoint.complaint.location.address}
                  </p>
                )}
              {typeof selectedPoint.complaint.location === "object" &&
                selectedPoint.complaint.location?.city && (
                  <p className="text-sm text-muted-foreground">
                    <strong>City:</strong>{" "}
                    {selectedPoint.complaint.location.city}
                  </p>
                )}
              <p className="text-sm text-muted-foreground">
                <strong>Coordinates:</strong> {selectedPoint.lat.toFixed(6)},{" "}
                {selectedPoint.lng.toFixed(6)}
              </p>
              <p className="text-sm text-foreground">
                <strong>Description:</strong>{" "}
                {selectedPoint.complaint.description}
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.open(
                    `https://www.google.com/maps?q=${selectedPoint.lat},${selectedPoint.lng}`,
                    "_blank"
                  );
                }}
              >
                View on Google Maps
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComplaintsHeatMap;
