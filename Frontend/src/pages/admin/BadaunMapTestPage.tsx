/**
 * Badaun Map Test Page
 * 
 * Testing page to render Badaun district map using MapRenderHeatMap component
 * Fetches data from /api/v1/geo/badaun endpoint
 */

import React, { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import MapRenderHeatMap from "@/components/MapRenderHeatMap";
import { geoService } from "@/services/geo.service";

const BadaunMapTestPage: React.FC = () => {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadaunData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch Badaun GeoJSON data
        const data = await geoService.getBadaunGeoJson();
        setGeoData(data);
      } catch (err: any) {
        setError(err?.message || "Unable to load Badaun map data");
        console.error("Error fetching Badaun data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBadaunData();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Badaun District Map Test
        </h1>
        <p className="text-muted-foreground mt-1">
          Testing page to render Badaun district GeoJSON data on an interactive map
        </p>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading Badaun map data...</p>
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive mb-2">Failed to load map</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && geoData && (
        <Card>
          <CardContent className="p-0 h-full">
            <div
              className="border rounded-lg overflow-hidden"
              style={{
                width: "100%",
                height: "700px",
                position: "relative",
                minHeight: "700px",
              }}
            >
              <MapRenderHeatMap
                geoData={geoData}
                className="w-full h-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      {!loading && !error && geoData && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm space-y-2">
              <div>
                <strong>Features Count:</strong> {geoData.features?.length || 0}
              </div>
              <div>
                <strong>Type:</strong> {geoData.type}
              </div>
              {geoData.name && (
                <div>
                  <strong>Name:</strong> {geoData.name}
                </div>
              )}
              {geoData.features && geoData.features.length > 0 && (
                <div>
                  <strong>First Feature Properties:</strong>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(geoData.features[0].properties, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BadaunMapTestPage;

