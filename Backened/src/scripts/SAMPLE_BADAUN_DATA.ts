/**
 * SAMPLE: Your LGD data converted to import format
 * 
 * This is based on the data from your screenshot.
 * Copy this pattern for all 400+ villages in your CSV.
 */

interface LGDVillage {
  villageName: string;
  lgdCode: string;
  subdistrictName: string;
  subdistrictLgd: number;
}

// Sample data from your screenshot (first 24 rows)
export const SAMPLE_BADAUN_VILLAGES: LGDVillage[] = [
  { villageName: "Aadpur", lgdCode: "12621", subdistrictName: "Bisauli", subdistrictLgd: 779 },
  { villageName: "Aamgaun", lgdCode: "128340", subdistrictName: "Budaun", subdistrictLgd: 782 },
  { villageName: "Abbu Nagar", lgdCode: "128215", subdistrictName: "Sahaswan", subdistrictLgd: 781 },
  { villageName: "Abdulla Ganj", lgdCode: "128464", subdistrictName: "Budaun", subdistrictLgd: 782 },
  { villageName: "Abdulvahidpur Urf Papsara", lgdCode: "127589", subdistrictName: "Bisauli", subdistrictLgd: 779 },
  { villageName: "Abhai Pur", lgdCode: "128702", subdistrictName: "Dataganj", subdistrictLgd: 783 },
  { villageName: "Abhanpur", lgdCode: "128089", subdistrictName: "Sahaswan", subdistrictLgd: 781 },
  { villageName: "Abhigaon", lgdCode: "128989", subdistrictName: "Dataganj", subdistrictLgd: 783 },
  { villageName: "Achalgpur", lgdCode: "127768", subdistrictName: "Bilsi", subdistrictLgd: 780 },
  { villageName: "Achaura", lgdCode: "128518", subdistrictName: "Budaun", subdistrictLgd: 782 },
  { villageName: "Adampur", lgdCode: "128014", subdistrictName: "Sahaswan", subdistrictLgd: 781 },
  { villageName: "Adhauli", lgdCode: "128506", subdistrictName: "Budaun", subdistrictLgd: 782 },
  { villageName: "Adipura", lgdCode: "127706", subdistrictName: "Bisauli", subdistrictLgd: 779 },
  { villageName: "Afzalpur Budheti", lgdCode: "127984", subdistrictName: "Sahaswan", subdistrictLgd: 781 },
  { villageName: "Afzalpur Chhaganpur", lgdCode: "12935", subdistrictName: "Bilsi", subdistrictLgd: 780 },
  { villageName: "Afzalpur Kalan", lgdCode: "128887", subdistrictName: "Dataganj", subdistrictLgd: 783 },
  { villageName: "Afzalpur Khukhania", lgdCode: "127973", subdistrictName: "Sahaswan", subdistrictLgd: 781 },
  { villageName: "Afzalpur Khurd", lgdCode: "128904", subdistrictName: "Dataganj", subdistrictLgd: 783 },
  { villageName: "Agaul", lgdCode: "127858", subdistrictName: "Bilsi", subdistrictLgd: 780 },
  { villageName: "Agasi", lgdCode: "128884", subdistrictName: "Dataganj", subdistrictLgd: 783 },
  { villageName: "Ageyee", lgdCode: "127663", subdistrictName: "Bisauli", subdistrictLgd: 779 },
  { villageName: "Agori", lgdCode: "128829", subdistrictName: "Dataganj", subdistrictLgd: 783 },
  { villageName: "Agras", lgdCode: "127778", subdistrictName: "Bilsi", subdistrictLgd: 780 },
  { villageName: "Ahamadpur Bela", lgdCode: "128203", subdistrictName: "Sahaswan", subdistrictLgd: 781 },
];

/**
 * Sub-district LGD Code Reference:
 * - Bilsi: 780
 * - Bisauli: 779
 * - Budaun: 782
 * - Dataganj: 783
 * - Sahaswan: 781
 */

/**
 * Usage:
 * 1. Copy the SAMPLE_BADAUN_VILLAGES array above
 * 2. Paste into Backened/src/scripts/importBadaunVillages.ts
 * 3. Replace with your complete dataset (add all 400+ villages)
 * 4. Run: npm run ts-node src/scripts/importBadaunVillages.ts
 */

