/**
 * Inspect Excel File Structure
 * This script reads Excel files and shows their actual structure
 */

import * as XLSX from "xlsx";
import path from "path";

const SAMPLE_DATA_DIR = path.join(__dirname, "../../sample-data");

function inspectExcelFile(fileName: string) {
  try {
    const filePath = path.join(SAMPLE_DATA_DIR, fileName);
    console.log(`\n📄 ${fileName}:`);
    console.log(`  Path: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    console.log(`  Sheets: ${workbook.SheetNames.join(', ')}`);
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
      
      console.log(`\n  Sheet: ${sheetName}`);
      console.log(`  Total Rows: ${data.length}`);
      
      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`  Columns (${columns.length}):`);
        columns.forEach((col, idx) => {
          console.log(`    ${idx + 1}. ${col}`);
        });
        
        console.log(`\n  First 3 Rows Sample:`);
        data.slice(0, 3).forEach((row, idx) => {
          console.log(`    Row ${idx + 1}:`, JSON.stringify(row, null, 2).substring(0, 200));
        });
      } else {
        // Try reading as array
        const arrayData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        console.log(`  Array Format - First 5 rows:`);
        arrayData.slice(0, 5).forEach((row: any, idx: number) => {
          console.log(`    Row ${idx + 1}:`, row);
        });
      }
    }
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
  }
}

function main() {
  console.log("🔍 Inspecting Excel File Structures...\n");
  
  const files = [
    'Block_Master.xls',
    'Tehsil_Master.xls',
    'Thana_Master.xls',
    'BlockWiseGram_Master.xls',
    'TehsilWiseGram_Master.xls',
    'Gram_Master.xls',
  ];
  
  for (const file of files) {
    inspectExcelFile(file);
  }
  
  console.log("\n✅ Inspection completed!");
}

if (require.main === module) {
  main();
}

export { inspectExcelFile };

