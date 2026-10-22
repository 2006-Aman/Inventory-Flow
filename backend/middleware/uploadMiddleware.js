const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Sanitize original filename and prefix with timestamp
        const sanitizedExt = path.extname(file.originalname).toLowerCase();
        const baseName = path
            .basename(file.originalname, sanitizedExt)
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 30);
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `product-${baseName}-${uniqueSuffix}${sanitizedExt}`);
    }
});

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        return cb(
            new Error(
                'Invalid file type. Only JPEG, JPG, PNG, WEBP, and GIF images are allowed!'
            ),
            false
        );
    }
};

// Multer upload configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB max file size
    },
    fileFilter: fileFilter
});

module.exports = upload;
