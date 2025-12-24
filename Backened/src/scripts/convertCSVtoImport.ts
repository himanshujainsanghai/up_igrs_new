/**
 * Helper script to convert LGD CSV data to import format
 * 
 * Your CSV columns:
 * - S No
 * - Village LGD Code
 * - Village Name (In English)
 * - Village Name (In Local language)
 * - Hierarchy (contains sub-district name)
 * - Census 2001 Code
 * - Census 2011 Code
 */

interface CSVRow {
  sno: number;
  lgdCode: string;
  villageNameEnglish: string;
  villageNameLocal: string;
  hierarchy: string;
  census2001: string;
  census2011: string;
}

interface LGDVillage {
  villageName: string;
  lgdCode: string;
  subdistrictName: string;
  subdistrictLgd: number;
}

/**
 * Extract sub-district name from hierarchy string
 * Example: "Bisauli(Sub-District) / Budaun(District) / Uttar Pradesh(State)"
 * Returns: "Bisauli"
 */
function extractSubdistrict(hierarchy: string): string {
  const match = hierarchy.match(/^([^(]+)\(Sub-District\)/);
  return match ? match[1].trim() : "";
}

/**
 * Map sub-district names to LGD codes
 */
const subdistrictLGDMap: Record<string, number> = {
  "Bilsi": 780,
  "Bisauli": 779,
  "Budaun": 782,
  "Dataganj": 783,
  "Sahaswan": 781,
};

/**
 * Convert your CSV data to import format
 * 
 * PASTE YOUR CSV DATA HERE:
 */
const CSV_DATA: CSVRow[] = [
  {
    sno: 1,
    lgdCode: "12/621",
    villageNameEnglish: "Aadpur",
    villageNameLocal: "",
    hierarchy: "Bisauli(Sub-District) / Budaun(District) / Uttar Pradesh(State)",
    census2001: "02043100",
    census2011: "12/621"
  },
  {
    sno: 2,
    lgdCode: "128340",
    villageNameEnglish: "Aamgaun",
    villageNameLocal: "आमगाँव",
    hierarchy: "Budaun(Sub-District) / Budaun(District) / Uttar Pradesh(State)",
    census2001: "02112600",
    census2011: "128340"
  },
  {
    sno: 3,
    lgdCode: "128215",
    villageNameEnglish: "Abbu Nagar",
    villageNameLocal: "",
    hierarchy: "Sahaswan(Sub-District) / Budaun(District) / Uttar Pradesh(State)",
    census2001: "02100100",
    census2011: "128215"
  },
  // ADD MORE ROWS FROM YOUR CSV HERE
  // Just copy-paste the pattern above
];

/**
 * Convert CSV data to import format
 */
function convertToImportFormat(csvData: CSVRow[]): LGDVillage[] {
  return csvData.map((row) => {
    const subdistrictName = extractSubdistrict(row.hierarchy);
    const subdistrictLgd = subdistrictLGDMap[subdistrictName] || 782; // Default to Budaun

    // Clean LGD code (remove slashes and spaces)
    const cleanLgdCode = row.lgdCode.replace(/\//g, "").replace(/\s/g, "");

    return {
      villageName: row.villageNameEnglish,
      lgdCode: cleanLgdCode,
      subdistrictName: subdistrictName,
      subdistrictLgd: subdistrictLgd,
    };
  });
}

/**
 * Generate the import array for importBadaunVillages.ts
 */
function generateImportCode() {
  const villages = convertToImportFormat(CSV_DATA);

  console.log("// Copy this array into importBadaunVillages.ts:\n");
  console.log("const BADAUN_VILLAGES: LGDVillage[] = [");
  
  villages.forEach((village, index) => {
    console.log("  {");
    console.log(`    villageName: "${village.villageName}",`);
    console.log(`    lgdCode: "${village.lgdCode}",`);
    console.log(`    subdistrictName: "${village.subdistrictName}",`);
    console.log(`    subdistrictLgd: ${village.subdistrictLgd}`);
    console.log(`  }${index < villages.length - 1 ? "," : ""}`);
  });
  
  console.log("];\n");
  
  console.log(`// Total villages: ${villages.length}`);
  console.log("// Sub-district breakdown:");
  
  const breakdown = villages.reduce((acc, v) => {
    acc[v.subdistrictName] = (acc[v.subdistrictName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(breakdown).forEach(([name, count]) => {
    console.log(`//   ${name}: ${count} villages`);
  });
}

// Run the conversion
generateImportCode();

