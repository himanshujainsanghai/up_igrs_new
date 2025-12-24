/**
 * Hierarchical Data Upload Page
 * 
 * Sequential upload system:
 * Step 1: District (Badaun)
 * Step 2: Sub-districts (Bilsi, Bisauli, Budaun, Dataganj, Sahaswan)
 * Step 3: Villages (for each sub-district)
 * Step 4: Geocode all data
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Circle, Upload, MapPin } from "lucide-react";
import { villageService } from "@/services/village.service";

type UploadStep = "district" | "subdistrict" | "villages" | "geocoding" | "complete";

interface SubDistrictData {
  name: string;
  lgdCode: number;
  villageCount: number;
  uploaded: boolean;
  geocoded: boolean;
}

const HierarchicalDataUploadPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<UploadStep>("district");
  const [districtConfirmed, setDistrictConfirmed] = useState(false);
  
  // Sub-districts of Badaun
  const [subDistricts, setSubDistricts] = useState<SubDistrictData[]>([
    { name: "Bilsi", lgdCode: 780, villageCount: 0, uploaded: false, geocoded: false },
    { name: "Bisauli", lgdCode: 779, villageCount: 0, uploaded: false, geocoded: false },
    { name: "Budaun", lgdCode: 782, villageCount: 0, uploaded: false, geocoded: false },
    { name: "Dataganj", lgdCode: 783, villageCount: 0, uploaded: false, geocoded: false },
    { name: "Gunnaur", lgdCode: 778, villageCount: 0, uploaded: false, geocoded: false },
    { name: "Sahaswan", lgdCode: 781, villageCount: 0, uploaded: false, geocoded: false },
  ]);

  const [selectedSubDistrict, setSelectedSubDistrict] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [totalStats, setTotalStats] = useState({ total: 0, geocoded: 0 });

  useEffect(() => {
    // Load initial statistics
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const stats = await villageService.getBadaunVillageStats();
      setTotalStats({ total: stats.total, geocoded: stats.geocoded });
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const handleConfirmDistrict = () => {
    setDistrictConfirmed(true);
    setCurrentStep("subdistrict");
  };

  const handleSubDistrictFileUpload = async (
    subdistrictName: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setSelectedSubDistrict(subdistrictName);

      const fileText = await file.text();
      let villageData: any[] = [];

      // Parse CSV
      if (file.name.endsWith(".csv")) {
        const lines = fileText.split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(",");
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || "";
          });
          villageData.push(row);
        }
      } else if (file.name.endsWith(".json")) {
        const jsonData = JSON.parse(fileText);
        villageData = Array.isArray(jsonData) ? jsonData : [jsonData];
      }

      // Upload villages for this sub-district
      const result = await villageService.uploadVillageData(villageData, "Budaun", 134);

      // Update sub-district status
      setSubDistricts(prev =>
        prev.map(sd =>
          sd.name === subdistrictName
            ? { ...sd, villageCount: result.summary.created, uploaded: true }
            : sd
        )
      );

      await loadStats();
      alert(`${subdistrictName}: ${result.summary.created} villages uploaded!`);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setSelectedSubDistrict(null);
      event.target.value = "";
    }
  };

  const handleGeocodeSubDistrict = async (subdistrictName: string) => {
    try {
      setGeocoding(true);
      
      // Find villages for this sub-district and geocode them
      // This will need multiple iterations
      for (let i = 0; i < 20; i++) { // Max 200 villages (20 batches of 10)
        const result = await villageService.triggerGeocoding(10);
        if (result.success === 0 && result.failed === 0) break; // No more villages
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
      }

      setSubDistricts(prev =>
        prev.map(sd =>
          sd.name === subdistrictName
            ? { ...sd, geocoded: true }
            : sd
        )
      );

      await loadStats();
      alert(`${subdistrictName} villages geocoded!`);
    } catch (err: any) {
      alert(`Geocoding failed: ${err.message}`);
    } finally {
      setGeocoding(false);
    }
  };

  const allSubDistrictsUploaded = subDistricts.every(sd => sd.uploaded);
  const allSubDistrictsGeocoded = subDistricts.every(sd => sd.geocoded);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Hierarchical Data Upload
          </h1>
          <p className="text-gray-600 mt-2">
            Upload geographic data in sequence: District → Sub-districts → Villages
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {/* Step 1: District */}
            <div className="flex items-center">
              {districtConfirmed ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6 text-blue-500" />
              )}
              <span className={`ml-2 ${districtConfirmed ? "text-green-600" : "text-blue-600"} font-semibold`}>
                1. District
              </span>
            </div>

            <div className="flex-1 h-1 bg-gray-300 mx-4"></div>

            {/* Step 2: Sub-districts */}
            <div className="flex items-center">
              {allSubDistrictsUploaded ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6 text-gray-400" />
              )}
              <span className={`ml-2 ${allSubDistrictsUploaded ? "text-green-600" : "text-gray-600"} font-semibold`}>
                2. Sub-districts
              </span>
            </div>

            <div className="flex-1 h-1 bg-gray-300 mx-4"></div>

            {/* Step 3: Villages */}
            <div className="flex items-center">
              {totalStats.total > 0 ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6 text-gray-400" />
              )}
              <span className={`ml-2 ${totalStats.total > 0 ? "text-green-600" : "text-gray-600"} font-semibold`}>
                3. Villages ({totalStats.total})
              </span>
            </div>

            <div className="flex-1 h-1 bg-gray-300 mx-4"></div>

            {/* Step 4: Geocoding */}
            <div className="flex items-center">
              {allSubDistrictsGeocoded ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6 text-gray-400" />
              )}
              <span className={`ml-2 ${allSubDistrictsGeocoded ? "text-green-600" : "text-gray-600"} font-semibold`}>
                4. Geocoding
              </span>
            </div>
          </div>
        </div>

        {/* Step 1: District Selection */}
        {!districtConfirmed && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Confirm District</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-lg text-blue-900">Badaun District</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    District LGD Code: 134
                  </p>
                  <p className="text-sm text-blue-700">
                    State: Uttar Pradesh (LGD: 9)
                  </p>
                  <p className="text-sm text-blue-700 mt-2">
                    Sub-districts: 5 (Bilsi, Bisauli, Budaun, Dataganj, Sahaswan)
                  </p>
                </div>
                
                <Button onClick={handleConfirmDistrict} className="w-full">
                  Confirm & Continue to Sub-districts →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Sub-district Upload */}
        {districtConfirmed && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Upload Villages by Sub-district</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Upload village data for each sub-district separately, or upload all at once.
                </p>

                <div className="space-y-3">
                  {subDistricts.map((subDistrict) => (
                    <div
                      key={subDistrict.lgdCode}
                      className="p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {subDistrict.uploaded ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                            <h4 className="font-semibold text-gray-900">
                              {subDistrict.name}
                            </h4>
                            <span className="text-xs text-gray-500">
                              (LGD: {subDistrict.lgdCode})
                            </span>
                          </div>
                          
                          <div className="mt-1 text-sm text-gray-600 ml-7">
                            {subDistrict.uploaded ? (
                              <>
                                ✅ {subDistrict.villageCount} villages uploaded
                                {subDistrict.geocoded && (
                                  <span className="ml-2 text-green-600">
                                    | 📍 Geocoded
                                  </span>
                                )}
                              </>
                            ) : (
                              "No villages uploaded yet"
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {/* Upload Button */}
                          <input
                            id={`upload-${subDistrict.lgdCode}`}
                            type="file"
                            accept=".json,.csv"
                            onChange={(e) => handleSubDistrictFileUpload(subDistrict.name, e)}
                            className="hidden"
                            disabled={uploading}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploading && selectedSubDistrict === subDistrict.name}
                            onClick={() =>
                              document.getElementById(`upload-${subDistrict.lgdCode}`)?.click()
                            }
                          >
                            {uploading && selectedSubDistrict === subDistrict.name ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3 h-3 mr-1" />
                                {subDistrict.uploaded ? "Re-upload" : "Upload CSV"}
                              </>
                            )}
                          </Button>

                          {/* Geocode Button */}
                          {subDistrict.uploaded && !subDistrict.geocoded && (
                            <Button
                              size="sm"
                              disabled={geocoding}
                              onClick={() => handleGeocodeSubDistrict(subDistrict.name)}
                            >
                              {geocoding ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Geocoding...
                                </>
                              ) : (
                                <>
                                  <MapPin className="w-3 h-3 mr-1" />
                                  Geocode
                                </>
                              )}
                            </Button>
                          )}

                          {subDistrict.geocoded && (
                            <span className="text-green-600 text-sm font-semibold flex items-center">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Done
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload All Button */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Upload All Villages at Once
                      </p>
                      <p className="text-sm text-gray-600">
                        Upload a single file with all villages (hierarchy will auto-assign)
                      </p>
                    </div>
                    <div>
                      <input
                        id="upload-all"
                        type="file"
                        accept=".json,.csv"
                        onChange={(e) => handleSubDistrictFileUpload("All Sub-districts", e)}
                        className="hidden"
                      />
                      <Button
                        variant="default"
                        disabled={uploading}
                        onClick={() => document.getElementById("upload-all")?.click()}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload All Villages
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Card */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">
                      {totalStats.total}
                    </p>
                    <p className="text-sm text-gray-600">Total Villages</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      {totalStats.geocoded}
                    </p>
                    <p className="text-sm text-gray-600">Geocoded</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">
                      {totalStats.total - totalStats.geocoded}
                    </p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </div>
                </div>

                {totalStats.total > 0 && totalStats.geocoded < totalStats.total && (
                  <div className="mt-4">
                    <Button
                      className="w-full"
                      disabled={geocoding}
                      onClick={() => handleGeocodeSubDistrict("All")}
                    >
                      {geocoding ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Geocoding All Villages...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 mr-2" />
                          Geocode All Remaining Villages
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* View Map Button */}
            {allSubDistrictsGeocoded && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-green-900">
                      All Data Uploaded & Geocoded!
                    </h3>
                    <p className="text-green-700 mt-2 mb-4">
                      Your villages are ready to view on the heat map
                    </p>
                    <Button
                      size="lg"
                      onClick={() => window.location.href = "/admin/badaun/heatmap"}
                    >
                      View Badaun Heat Map →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchicalDataUploadPage;

