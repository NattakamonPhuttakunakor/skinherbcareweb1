import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Disease from './src/models/Disease.js';
import Herb from './src/models/Herb.js';

dotenv.config();

const checkDatabase = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // ตรวจสอบ Disease collection
    console.log("\n📋 === DISEASE DATA ===");
    const diseases = await Disease.find();
    console.log(`Total diseases: ${diseases.length}`);
    
    if (diseases.length > 0) {
      diseases.forEach((disease, index) => {
        console.log(`\n${index + 1}. ${disease.name}`);
        console.log(`   Description: ${disease.description?.substring(0, 100) || 'N/A'}...`);
        console.log(`   Symptoms: ${disease.symptoms?.slice(0, 3).join(', ') || 'N/A'}`);
      });
    } else {
      console.log("❌ No diseases found!");
    }

    // ตรวจสอบ Herb collection
    console.log("\n\n🌿 === HERB DATA ===");
    const herbs = await Herb.find();
    console.log(`Total herbs: ${herbs.length}`);
    
    if (herbs.length > 0) {
      herbs.forEach((herb, index) => {
        console.log(`\n${index + 1}. ${herb.name}`);
        console.log(`   Scientific: ${herb.scientificName}`);
        console.log(`   Properties: ${herb.properties?.slice(0, 2).join(', ') || 'N/A'}`);
      });
    } else {
      console.log("❌ No herbs found!");
    }

    // ทดสอบ keyword matching
    console.log("\n\n🧪 === TEST MATCHING ===");
    const testSymptoms = ["สิว", "ผื่นแดง", "ผิวแห้ง"];
    
    for (const symptom of testSymptoms) {
      console.log(`\nSearching for: "${symptom}"`);
      const disease = diseases.find(d => 
        d.name.toLowerCase().includes(symptom.toLowerCase()) ||
        (d.symptoms && d.symptoms.some(s => s.toLowerCase().includes(symptom.toLowerCase())))
      );
      
      if (disease) {
        console.log(`✅ Found: ${disease.name}`);
      } else {
        console.log(`❌ Not found`);
      }
    }

    await mongoose.connection.close();
    console.log("\n✅ Database check complete");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

checkDatabase();
