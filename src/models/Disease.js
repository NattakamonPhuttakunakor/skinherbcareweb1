import mongoose from 'mongoose';

const diseaseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  engName: { type: String, trim: true, default: '' },
  description: { type: String, required: true },
  symptoms: [{ type: String }],
  medicines: [{ type: String }],
  usage: { type: String, default: '' },
  image: { type: String, default: '' },
  published: { type: Boolean, default: false }
}, { timestamps: true });

const Disease = mongoose.model('Disease', diseaseSchema, 'diseases');
export default Disease;
