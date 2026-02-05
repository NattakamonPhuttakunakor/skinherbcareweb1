import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const files = ['data.xlsx', 'data2.xlsx'];

files.forEach(fileName => {
  console.log(`\n===== ${fileName} =====`);
  const workbook = XLSX.read(readFileSync(fileName), { type: 'buffer' });
  console.log('Sheets:', workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Total rows: ${data.length}`);
    if (data.length > 0) {
      console.log('Sample data (first 2 rows):');
      console.log(JSON.stringify(data.slice(0, 2), null, 2));
    }
  
});
