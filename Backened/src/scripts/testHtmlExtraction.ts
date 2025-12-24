/**
 * Test HTML Extraction from Excel Files
 * Debug script to understand the exact structure
 */

import * as XLSX from "xlsx";
import path from "path";

const SAMPLE_DATA_DIR = path.join(__dirname, "../../sample-data");

function testFile(fileName: string) {
  console.log(`\n📄 Testing ${fileName}:`);
  const filePath = path.join(SAMPLE_DATA_DIR, fileName);
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    console.log(`  Sheet name: ${workbook.SheetNames[0]}`);
    console.log(`  Range: ${sheet['!ref']}`);
    
    // Try reading as array
    const arrayData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
    console.log(`  Array rows: ${arrayData.length}`);
    
    if (arrayData.length > 0) {
      const firstRow = arrayData[0] as any[];
      console.log(`  First row length: ${firstRow.length}`);
      console.log(`  First row type: ${typeof firstRow[0]}`);
      
      // Check if first row contains HTML
      let htmlFound = false;
      let htmlString = '';
      
      for (let i = 0; i < Math.min(firstRow.length, 10); i++) {
        const cell = firstRow[i];
        if (cell && typeof cell === 'string' && (cell.includes('<TR') || cell.includes('<tr'))) {
          htmlFound = true;
          htmlString = String(cell);
          console.log(`  ✅ HTML found in cell ${i}: ${cell.substring(0, 100)}...`);
          break;
        }
      }
      
      if (!htmlFound) {
        // Try concatenating first row
        const concatenated = firstRow
          .filter(c => c !== null && c !== undefined)
          .map(c => String(c))
          .join('');
        
        if (concatenated.includes('<TR') || concatenated.includes('<tr')) {
          htmlFound = true;
          htmlString = concatenated;
          console.log(`  ✅ HTML found in concatenated first row: ${concatenated.substring(0, 200)}...`);
        }
      }
      
      if (htmlFound && htmlString) {
        // Count TR tags
        const trCount = (htmlString.match(/<TR/gi) || []).length;
        console.log(`  Found ${trCount} <TR> tags`);
        
        // Extract first few table rows
        const trMatches = htmlString.match(/<TR[^>]*>.*?<\/TR>/gis);
        if (trMatches && trMatches.length > 0) {
          console.log(`  First TR: ${trMatches[0].substring(0, 300)}...`);
          if (trMatches.length > 1) {
            console.log(`  Second TR: ${trMatches[1].substring(0, 300)}...`);
          }
        }
      } else {
        console.log(`  ❌ No HTML found in first row`);
      }
    }
    
    // Also try reading individual cells
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z10');
    console.log(`  Checking cells in range ${sheet['!ref']}...`);
    
    let htmlCells = 0;
    for (let row = range.s.r; row <= Math.min(range.e.r, 5); row++) {
      for (let col = range.s.c; col <= Math.min(range.e.c, 5); col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellRef];
        if (cell && cell.v && typeof cell.v === 'string' && (cell.v.includes('<TR') || cell.v.includes('<tr'))) {
          htmlCells++;
          console.log(`  ✅ HTML found in ${cellRef}: ${String(cell.v).substring(0, 100)}...`);
        }
      }
    }
    
    if (htmlCells === 0) {
      console.log(`  ❌ No HTML found in individual cells`);
    }
    
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
  }
}

function main() {
  console.log("🔍 Testing HTML Extraction from Excel Files...\n");
  
  const files = [
    'BlockWiseGram_Master.xls',
    'TehsilWiseGram_Master.xls',
    'Gram_Master.xls',
    'Thana_Master.xls',
  ];
  
  for (const file of files) {
    testFile(file);
  }
  
  console.log("\n✅ Testing completed!");
}

if (require.main === module) {
  main();
}

