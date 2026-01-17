import mongoose from 'mongoose';

const diseaseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, required: true },
  symptoms: [{ type: String }],
}, { timestamps: true });

const Disease = mongoose.model('Disease', diseaseSchema);
export default Disease;
