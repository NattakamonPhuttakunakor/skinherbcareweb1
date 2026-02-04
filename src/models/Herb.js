import mongoose from 'mongoose';

const herbSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  scientificName: { type: String, required: true, trim: true, unique: true },
  description: { type: String, required: true },
  properties: [{ type: String }], // e.g., ['ต้านการอักเสบ', 'ลดสิว']
  usage: { type: String, required: true },
  image: { type: String, default: '/uploads/default-herb.png' }, // Path to the image
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  published: { type: Boolean, default: false }
}, { timestamps: true });

const Herb = mongoose.model('Herb', herbSchema);
export default Herb;
