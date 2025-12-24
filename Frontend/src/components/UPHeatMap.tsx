// /**
//  * Uttar Pradesh Heat Map Component
//  * Displays provided GeoJSON on a Leaflet map
//  */

// import React, { useEffect, useState } from "react";
// import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
// import { LatLngBounds, LatLngTuple } from "leaflet";
// import type { FeatureCollection, Feature, Geometry } from "geojson";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { MapPin } from "lucide-react";

// // Fix Leaflet default icon issue - only on client side
// if (typeof window !== "undefined") {
//   import("leaflet").then((L) => {
//     // @ts-ignore - Leaflet icon images
//     delete L.default.Icon.Default.prototype._getIconUrl;
//     L.default.Icon.Default.mergeOptions({
//       iconRetinaUrl:
//         "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
//       iconUrl:
//         "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
//       shadowUrl:
//         "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
//     });
//   });
// }

// // Uttar Pradesh approximate bounds
// const UP_BOUNDS: LatLngBounds = new LatLngBounds(
//   [23.5, 77.0], // Southwest corner
//   [30.5, 84.5] // Northeast corner
// );

// // Center of Uttar Pradesh
// const UP_CENTER: [number, number] = [27.0, 80.5];

// interface HeatMapData extends FeatureCollection {
//   features: Array<
//     Feature<
//       Geometry,
//       {
//         Name?: string;
//         DISTRICT?: string;
//         DISTRICT_CODE?: string;
//         d_id_11?: number;
//         [key: string]: any;
//       }
//     >
//   >;
//   heatValues?: Record<string, number>;
// }

// interface UPHeatMapProps {
//   className?: string;
//   geoData: FeatureCollection;
// }

// // Component to fit map bounds - must be inside MapContainer
// const FitBounds: React.FC<{ bounds: LatLngBounds }> = ({ bounds }) => {
//   const map = useMap();

//   useEffect(() => {
//     if (map) {
//       map.fitBounds(bounds, { padding: [50, 50] });
//     }
//   }, [map, bounds]);

//   return null;
// };

// const UPHeatMap: React.FC<UPHeatMapProps> = ({ className, geoData }) => {
//   const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
//   const [isClient, setIsClient] = useState(false);

//   // Ensure component only renders on client
//   useEffect(() => {
//     setIsClient(true);
//   }, []);

//   // Style function for GeoJSON features
//   const styleFeature = (feature: any) => {
//     // Use Name, id, or DISTRICT as the key for heatValues
//     const districtKey =
//       feature?.id ||
//       feature?.properties?.Name ||
//       feature?.properties?.DISTRICT ||
//       feature?.properties?.DISTRICT_CODE;
//     const isSelected = selectedDistrict === districtKey;

//     return {
//       fillColor: "#10B981",
//       fillOpacity: isSelected ? 0.6 : 0.35,
//       weight: isSelected ? 2 : 1,
//       color: isSelected ? "#059669" : "#ffffff",
//     };
//   };

//   // Handle feature interactions
//   const onEachDistrict = (feature: any, layer: any) => {
//     // Use Name, id, or DISTRICT as the key
//     const districtKey =
//       feature?.id ||
//       feature?.properties?.Name ||
//       feature?.properties?.DISTRICT ||
//       feature?.properties?.DISTRICT_CODE;
//     const districtName =
//       feature?.properties?.Name ||
//       feature?.properties?.DISTRICT ||
//       feature?.id ||
//       "Unknown District";

//     // Add popup
//     layer.bindPopup(
//       `<div style="min-width: 150px;">
//         <strong>${districtName}</strong><br/>
//         ${districtKey ? `Key: ${districtKey}<br/>` : ""}
//       </div>`
//     );

//     // Add hover effects
//     layer.on({
//       mouseover: (e: any) => {
//         const layer = e.target;
//         layer.setStyle({
//           weight: 3,
//           color: "#FF9933",
//           fillOpacity: 0.9,
//         });
//         layer.bringToFront();
//         setSelectedDistrict(districtKey);
//       },
//       mouseout: (e: any) => {
//         const layer = e.target;
//         layer.setStyle(styleFeature(feature));
//         setSelectedDistrict(null);
//       },
//     });
//   };

//   // Render map component - use proper React-Leaflet components directly
//   // react-leaflet v5 has incomplete type definitions, but components work at runtime
//   // @ts-nocheck
//   const renderMap = () => {
//     if (!isClient) {
//       return (
//         <div className="flex items-center justify-center h-full">
//           <p className="text-muted-foreground">Initializing map...</p>
//         </div>
//       );
//     }

//     if (!geoData || !geoData.features || geoData.features.length === 0) {
//       return (
//         <div className="flex items-center justify-center h-full">
//           <p className="text-muted-foreground">
//             Map will appear here once data is loaded
//           </p>
//         </div>
//       );
//     }

//     // IMPORTANT: Using components directly without type casting to preserve React context
//     // This fixes the white screen issue caused by casting components to 'any'
//     // Type assertions on props only (not components) to satisfy TypeScript while preserving context
//     const mapContainerProps = {
//       center: UP_CENTER,
//       zoom: 7,
//       style: { height: "100%", width: "100%", zIndex: 0 },
//       scrollWheelZoom: true,
//       zoomControl: true,
//     } as React.ComponentProps<typeof MapContainer>;

//     const tileLayerProps = {
//       url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
//       attribution:
//         '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//     } as React.ComponentProps<typeof TileLayer>;

//     const geoJsonProps = {
//       data: geoData,
//       style: styleFeature,
//       onEachFeature: onEachDistrict,
//     } as React.ComponentProps<typeof GeoJSON>;

//     return (
//       <MapContainer {...mapContainerProps}>
//         <TileLayer {...tileLayerProps} />
//         <FitBounds bounds={UP_BOUNDS} />
//         <GeoJSON {...geoJsonProps} />
//       </MapContainer>
//     );
//   };

//   return (
//     <div className={`space-y-4 ${className || ""}`}>
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <MapPin className="w-5 h-5" />
//             Uttar Pradesh Heat Map
//           </CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div
//             className="w-full border rounded-lg overflow-hidden bg-gray-100"
//             style={{ height: "600px", position: "relative" }}
//           >
//             {renderMap()}
//           </div>

//           {/* Legend */}
//           <div className="mt-4 flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
//             <div className="text-sm font-semibold">Heat Intensity:</div>
//             <div className="flex items-center gap-2">
//               <div
//                 className="w-4 h-4 rounded"
//                 style={{ backgroundColor: "#FED7AA" }}
//               ></div>
//               <span className="text-sm">Low (0-20%)</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <div
//                 className="w-4 h-4 rounded"
//                 style={{ backgroundColor: "#FB923C" }}
//               ></div>
//               <span className="text-sm">Medium (20-40%)</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <div
//                 className="w-4 h-4 rounded"
//                 style={{ backgroundColor: "#F97316" }}
//               ></div>
//               <span className="text-sm">High (40-60%)</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <div
//                 className="w-4 h-4 rounded"
//                 style={{ backgroundColor: "#EA580C" }}
//               ></div>
//               <span className="text-sm">Very High (60-80%)</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <div
//                 className="w-4 h-4 rounded"
//                 style={{ backgroundColor: "#C2410C" }}
//               ></div>
//               <span className="text-sm">Extreme (80-100%)</span>
//             </div>
//             <div className="ml-4 text-xs text-muted-foreground">
//               Hover over districts to see details
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default UPHeatMap;

/**
 * Uttar Pradesh Heat Map Component
 * Displays provided GeoJSON on a Leaflet map
 */

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue - only on client side
if (typeof window !== "undefined") {
  import("leaflet").then((L) => {
    delete (L.default.Icon.Default.prototype as any)._getIconUrl;
    L.default.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  });
}

// Uttar Pradesh approximate bounds
const UP_BOUNDS = new LatLngBounds(
  [23.5, 77.0], // Southwest corner
  [30.5, 84.5] // Northeast corner
);

// Center of Uttar Pradesh
const UP_CENTER: [number, number] = [27.0, 80.5];

interface UPHeatMapProps {
  className?: string;
  geoData: FeatureCollection;
}

// Component to fit map bounds - must be inside MapContainer
const FitBounds: React.FC<{ bounds: LatLngBounds }> = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  return null;
};

const UPHeatMap: React.FC<UPHeatMapProps> = ({ className, geoData }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure component only renders on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Style function for GeoJSON features
  const styleFeature = (feature: any) => {
    const districtKey =
      feature?.id ||
      feature?.properties?.Name ||
      feature?.properties?.DISTRICT ||
      feature?.properties?.DISTRICT_CODE;
    const isSelected = selectedDistrict === districtKey;

    return {
      fillColor: "#10B981",
      fillOpacity: isSelected ? 0.6 : 0.35,
      weight: isSelected ? 2 : 1,
      color: isSelected ? "#059669" : "#ffffff",
    };
  };

  // Handle feature interactions
  const onEachDistrict = (feature: any, layer: any) => {
    const districtKey =
      feature?.id ||
      feature?.properties?.Name ||
      feature?.properties?.DISTRICT ||
      feature?.properties?.DISTRICT_CODE;
    const districtName =
      feature?.properties?.Name ||
      feature?.properties?.DISTRICT ||
      feature?.id ||
      "Unknown District";

    // Add popup
    layer.bindPopup(
      `<div style="min-width: 150px;">
        <strong>${districtName}</strong><br/>
        ${districtKey ? `Key: ${districtKey}<br/>` : ""}
      </div>`
    );

    // Add hover effects
    layer.on({
      mouseover: (e: any) => {
        const targetLayer = e.target;
        targetLayer.setStyle({
          weight: 3,
          color: "#ff671f",
          fillOpacity: 0.9,
        });
        targetLayer.bringToFront();
        setSelectedDistrict(districtKey);
      },
      mouseout: (e: any) => {
        const targetLayer = e.target;
        targetLayer.setStyle(styleFeature(feature));
        setSelectedDistrict(null);
      },
    });
  };

  // Don't render until client-side
  if (!isClient) {
    return (
      <div className={`space-y-4 ${className || ""}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Uttar Pradesh Heat Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="w-full border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
              style={{ height: "600px", position: "relative" }}
            >
              <p className="text-gray-500">Loading map...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if we have data
  if (!geoData || !geoData.features || geoData.features.length === 0) {
    return (
      <div className={`space-y-4 ${className || ""}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Uttar Pradesh Heat Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="w-full border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
              style={{ height: "600px", position: "relative" }}
            >
              <p className="text-gray-500">No map data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Uttar Pradesh Heat Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="w-full border rounded-lg overflow-hidden bg-gray-100"
            style={{ height: "600px", position: "relative" }}
          >
            <MapContainer
              {...({
                center: UP_CENTER,
                zoom: 7,
                style: { height: "100%", width: "100%", zIndex: 0 },
                scrollWheelZoom: true,
                zoomControl: true,
              } as React.ComponentProps<typeof MapContainer>)}
            >
              <TileLayer
                {...({
                  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                  attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                } as React.ComponentProps<typeof TileLayer>)}
              />
              <FitBounds bounds={UP_BOUNDS} />
              <GeoJSON
                {...({
                  data: geoData,
                  style: styleFeature,
                  onEachFeature: onEachDistrict,
                } as React.ComponentProps<typeof GeoJSON>)}
              />
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-semibold">Heat Intensity:</div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#FED7AA" }}
              ></div>
              <span className="text-sm">Low (0-20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#FB923C" }}
              ></div>
              <span className="text-sm">Medium (20-40%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#ff671f" }}
              ></div>
              <span className="text-sm">High (40-60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#EA580C" }}
              ></div>
              <span className="text-sm">Very High (60-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#C2410C" }}
              ></div>
              <span className="text-sm">Extreme (80-100%)</span>
            </div>
            <div className="ml-4 text-xs text-muted-foreground">
              Hover over districts to see details
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UPHeatMap;
