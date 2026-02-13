import mongoose from 'mongoose';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import Disease from './src/models/Disease.js';
import Herb from './src/models/Herb.js';

const connectDB = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error('Missing MONGODB_URI (or MONGO_URI) in .env');
    }
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Function to read Excel file
const readExcelFile = (fileName) => {
  const workbook = XLSX.read(fs.readFileSync(fileName), { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

const readCsvFile = (fileName) => {
  const buffer = fs.readFileSync(fileName);
  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
};

// Function to parse symptoms from string (handle newlines and bullet points)
const parseSymptoms = (symptomString) => {
  if (!symptomString) return [];
  
  // Split by various delimiters and clean up
  const symptoms = symptomString
    .split(/[\r\n◦•]+/)
    .map(s => s.trim())
    .filter(s => s && s.length > 5) // Filter out very short strings
    .slice(0, 5); // Limit to 5 symptoms
  
  return symptoms;
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
};

const buildDescription = (main, locations, cause) => {
  const parts = [];
  const mainText = normalizeText(main);
  if (mainText) parts.push(mainText);
  const loc = normalizeText(locations);
  if (loc) parts.push(`ตำแหน่งที่พบบ่อย: ${loc}`);
  const cs = normalizeText(cause);
  if (cs) parts.push(`สาเหตุ: ${cs}`);
  return parts.join('\n');
};

// Function to migrate diseases from data.csv (Thai headers)
const migrateDiseasesFromCsv = async () => {
  const csvPath = path.join(process.cwd(), 'data2.csv');
  if (!fs.existsSync(csvPath)) {
    console.log("â„¹ï¸  No data2.csv found, skipping CSV import.");
    return;
  }

  try {
    console.log("\nðŸ“‹ Reading diseases from data2.csv...");
    const rows = readCsvFile(csvPath);
    console.log(`Found ${rows.length} diseases in data2.csv`);

    for (const row of rows) {
      try {
        const name = normalizeText(row['รายชื่อโรค'] || row['name'] || row['Disease'] || row['Diseases']);
        if (!name) {
          console.warn('âš ï¸  Skipping row with missing disease name');
          continue;
        }

        const mainSymptoms = row['อาการหลัก'] || row['symptoms'] || row['Main Symptoms'] || '';
        const secondary = row['อาการรอง'] || row['subSymptoms'] || row['Secondary symptoms'] || '';
        const locations = row['ตำแหน่งที่พบบ่อย'] || row['locations'] || '';
        const cause = row['สาเหตุ'] || row['cause'] || '';
        const treatment = row['วิธีรักษาเบื้อต้น'] || row['วิธีรักษาเบื้องต้น'] || row['treatment'] || '';

        const description = buildDescription(mainSymptoms, locations, cause);
        const symptoms = parseSymptoms(secondary || mainSymptoms);
        const usage = normalizeText(treatment);

        const update = {};
        if (description) update.description = description;
        if (symptoms.length > 0) update.symptoms = symptoms;
        if (usage) update.usage = usage;

        if (Object.keys(update).length === 0) {
          console.log(`â­ï¸  Disease "${name}" has no new data2, skipping...`);
          continue;
        }

        const exists = await Disease.findOne({ name });
        if (exists) {
          await Disease.updateOne({ name }, { $set: update });
          console.log(`âœ… Updated disease: "${name}"`);
        } else {
          const disease = new Disease({
            name,
            description: description || 'ไม่มีข้อมูล',
            symptoms: symptoms,
            usage: usage || '',
            medicines: []
          });
          await disease.save();
          console.log(`âœ… Inserted disease: "${name}"`);
        }
      } catch (error) {
        console.error(`âŒ Error migrating disease: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`âŒ Error reading diseases from CSV: ${error.message}`);
  }
};

// Function to migrate diseases from data.csv into a custom collection
const migrateDiseasesFromCsvToCollection = async (collectionName) => {
  const csvPath = path.join(process.cwd(), 'data2.csv');
  if (!fs.existsSync(csvPath)) {
    console.log("No data2.csv found, skipping CSV import.");
    return;
  }

  try {
    console.log(`\nReading diseases from data2.csv -> ${collectionName}...`);
    const rows = readCsvFile(csvPath);
    console.log(`Found ${rows.length} diseases in data2.csv`);

    const collection = mongoose.connection.collection(collectionName);
    for (const row of rows) {
      try {
        const name = normalizeText(row['รายชื่อโรค'] || row['name'] || row['Disease'] || row['Diseases']);
        if (!name) {
          console.warn('Skipping row with missing disease name');
          continue;
        }

        const mainSymptoms = row['อาการหลัก'] || row['symptoms'] || row['Main Symptoms'] || '';
        const secondary = row['อาการรอง'] || row['subSymptoms'] || row['Secondary symptoms'] || '';
        const locations = row['ตำแหน่งที่พบบ่อย'] || row['locations'] || '';
        const cause = row['สาเหตุ'] || row['cause'] || '';
        const treatment = row['วิธีรักษาเบื้อต้น'] || row['วิธีรักษาเบื้องต้น'] || row['treatment'] || '';

        const update = {};
        const mainText = normalizeText(mainSymptoms);
        const subText = normalizeText(secondary);
        const locText = normalizeText(locations);
        const causeText = normalizeText(cause);
        const treatText = normalizeText(treatment);

        if (mainText) update.symptoms = mainText;
        if (subText) update.subSymptoms = subText;
        if (locText) update.locations = locText;
        if (causeText) update.cause = causeText;
        if (treatText) update.treatment = treatText;

        update.updatedAt = new Date();

        await collection.updateOne(
          { name },
          { $set: update, $setOnInsert: { name, createdAt: new Date() } },
          { upsert: true }
        );
      } catch (error) {
        console.error(`Error migrating disease: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`Error reading diseases from CSV: ${error.message}`);
  }
};

// Function to migrate diseases from data.xlsx
const migrateDiseasesFromData = async () => {
  try {
    console.log("\n📋 Reading diseases from data.xlsx...");
    const data = readExcelFile('./data.xlsx');
    
    console.log(`Found ${data.length} diseases in data.xlsx`);
    
    for (const row of data) {
      try {
        // Parse the Thai data
        const diseaseName = row['รายชื่อโรค'] || row['Diseases'];
        const description = row['อาการหลัก'] || row['Main Symptoms'] || '';
        const symptomsText = row['อาการรอง'] || row['Secondary symptoms'] || '';
        
        // Check if disease already exists
        const exists = await Disease.findOne({ name: diseaseName });
        
        if (exists) {
          console.log(`⏭️  Disease "${diseaseName}" already exists, skipping...`);
          continue;
        }
        
        // Parse symptoms
        const symptoms = parseSymptoms(symptomsText || description);
        
        const disease = new Disease({
          name: diseaseName,
          description: description.substring(0, 500), // Limit description length
          symptoms: symptoms
        });
        
        await disease.save();
        console.log(`✅ Migrated disease: "${diseaseName}"`);
      } catch (error) {
        console.error(`❌ Error migrating disease: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading diseases from Excel: ${error.message}`);
  }
};

// Function to migrate herbs from a source
// Note: You'll need to prepare Excel data with herb information
const migrateHerbsFromData = async () => {
  try {
    console.log("\n🌿 Checking for herb data...");
    
    // Try to read herbs from data.xlsx if available
    try {
      const data = readExcelFile('./data.xlsx');
      
      // Check if there's a sheet with herb information
      const workbook = XLSX.read(fs.readFileSync('./data.xlsx'), { type: 'buffer' });
      
      if (workbook.SheetNames.includes('Herbs')) {
        console.log("Found Herbs sheet, migrating herbs...");
        
        const worksheet = workbook.Sheets['Herbs'];
        const herbData = XLSX.utils.sheet_to_json(worksheet);
        
        for (const row of herbData) {
          try {
            const herbName = row['name'] || row['Name'] || row['ชื่อสมุนไพร'];
            const scientificName = row['scientificName'] || row['Scientific Name'] || row['ชื่อวิทยาศาสตร์'];
            const description = row['description'] || row['Description'] || row['รายละเอียด'] || '';
            
            if (!herbName || !scientificName) {
              console.warn(`⚠️  Skipping herb with missing name or scientific name`);
              continue;
            }
            
            // Check if herb already exists
            const exists = await Herb.findOne({ scientificName });
            
            if (exists) {
              console.log(`⏭️  Herb "${herbName}" already exists, skipping...`);
              continue;
            }
            
            // Parse properties/usage
            const properties = row['properties'] ? row['properties'].split(',').map(p => p.trim()) : [];
            const usage = row['usage'] || row['Usage'] || row['วิธีใช้'] || 'No usage information available';
            
            // Create a default admin user if needed for addedBy field
            // For initial migration, we'll use the first admin user
            let adminUser = await mongoose.connection.collection('users').findOne({ role: 'admin' });
            
            if (!adminUser) {
              console.warn("⚠️  No admin user found. Creating test admin user for migration...");
              // This is a fallback - in production, you should handle this properly
              adminUser = { _id: new mongoose.Types.ObjectId() };
            }
            
            const herb = new Herb({
              name: herbName,
              scientificName: scientificName,
              description: description.substring(0, 500),
              properties: properties.slice(0, 5),
              usage: usage.substring(0, 500),
              addedBy: adminUser._id
            });
            
            await herb.save();
            console.log(`✅ Migrated herb: "${herbName}"`);
          } catch (error) {
            console.error(`❌ Error migrating herb: ${error.message}`);
          }
        }
      } else {
        console.log("ℹ️  No Herbs sheet found. Please create a 'Herbs' sheet in data.xlsx to migrate herbs.");
      }
    } catch (error) {
      console.log("ℹ️  No herb data to migrate from Excel.");
    }
  } catch (error) {
    console.error(`❌ Error in herb migration: ${error.message}`);
  }
};

// Main migration function
const migrate = async () => {
  try {
    console.log("====================================");
    console.log("🚀 Starting Data Migration Process");
    console.log("====================================");
    
    await connectDB();
    
    // Migrate diseases from CSV into custom collection (datadiseases)
    await migrateDiseasesFromCsvToCollection('datadiseases');

    // Migrate diseases from CSV into main Disease collection
    await migrateDiseasesFromCsv();

    // Migrate diseases from XLSX (fallback)
    if (fs.existsSync(path.join(process.cwd(), 'data.xlsx'))) {
      await migrateDiseasesFromData();
    }
    
    // Migrate herbs
    await migrateHerbsFromData();
    
    console.log("\n====================================");
    console.log("✅ Migration Complete!");
    console.log("====================================\n");
    
    process.exit(0);
  } catch (error) {
    console.error(`❌ Fatal migration error: ${error.message}`);
    process.exit(1);
  }
};

// Run migration
migrate();
