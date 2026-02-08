import multer from 'multer';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Check file type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Images only (jpg, jpeg, png, gif, webp)'));
  }
}

const hasCloudinaryConfig =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = hasCloudinaryConfig
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: process.env.CLOUDINARY_FOLDER || 'skin-herb-users',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      },
    })
  : multer.memoryStorage();

// Init upload (Cloudinary)
const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10000000 }, // Use from .env or default to 10MB
  fileFilter: function (req, file, cb) {
    if (!hasCloudinaryConfig) {
      return cb(new Error('Cloudinary config missing. Please set CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET.'));
    }
    checkFileType(file, cb);
  },
});

export default upload;
