import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import Disease from './src/models/Disease.js';
import Herb from './src/models/Herb.js';

const connectDB = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Function to read Excel file
const readExcelFile = (fileName) => {
  const workbook = XLSX.read(readFileSync(fileName), { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
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
      const workbook = XLSX.read(readFileSync('./data.xlsx'), { type: 'buffer' });
      
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
    
    // Migrate diseases
    await migrateDiseasesFromData();
    
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
