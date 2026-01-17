import mongoose from 'mongoose';

const herbDiseaseRelationSchema = new mongoose.Schema({
  herb: { type: mongoose.Schema.Types.ObjectId, ref: 'Herb', required: true },
  disease: { type: mongoose.Schema.Types.ObjectId, ref: 'Disease', required: true },
  effectiveness: { 
    type: String, 
    enum: ['สูง', 'ปานกลาง', 'ต่ำ', 'ยังไม่ได้รับการยืนยัน'], 
    default: 'ยังไม่ได้รับการยืนยัน' 
  },
  notes: { type: String },
}, { timestamps: true });

// Prevent duplicate relations
herbDiseaseRelationSchema.index({ herb: 1, disease: 1 }, { unique: true });

const HerbDiseaseRelation = mongoose.model('HerbDiseaseRelation', herbDiseaseRelationSchema);
export default HerbDiseaseRelation;
