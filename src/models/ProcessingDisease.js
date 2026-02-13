import mongoose from 'mongoose';

const processingDiseaseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  symptoms: { type: String, default: '' },
  subSymptoms: { type: String, default: '' },
  locations: { type: String, default: '' },
  cause: { type: String, default: '' },
  treatment: { type: String, default: '' }
}, { timestamps: true });

const ProcessingDisease = mongoose.model('ProcessingDisease', processingDiseaseSchema, 'datadiseases');
export default ProcessingDisease;
