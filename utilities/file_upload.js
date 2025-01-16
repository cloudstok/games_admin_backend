const AWS = require('aws-sdk');
const multer = require('multer');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  region: process.env.AWS_REGION,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  signatureVersion: "v4",
});

const fileSizeLimit = 100 * 1024 * 1024; // 100 MB
const upload = multer({
    fileFilter: function (req, file, cb) {
        let mimetype = file.mimetype === "image/png" ||
            file.mimetype === "image/jpg" ||
            file.mimetype === 'application/pdf' ||
            file.mimetype === "image/jpeg" ||
            file.mimetype === "image/webp" ||
            file.mimetype === "video/mp4" ||
            file.mimetype === "image/avif";
        if (!mimetype) {
            cb(new Error('Invalid file type. Allowed types: PDF, PNG, JPG, JPEG, DOCX'));
        } else {
            cb(null, true);
        }
    },
    limits: { fileSize: fileSizeLimit }
});

const handleMulterErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size too large. Max 1MB allowed.' });
        }
    } else if (err) {
        return res.status(500).json({ status: false, message: 'Unknown error occurred while uploading file.' });
    }
    console.log("Continue to the next middleware if no errors");
    next();
};




const uploadImage = async (files) => {
  const s3 = new AWS.S3();
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const Key = `${Date.now()}_${files[0].originalname.trim()}`;
  const params = {
    Bucket: bucketName,
    Key: Key,
    Body: files[0].buffer,
    ContentType: files[0].mimetype
  };

  // Upload file to S3 and return the result
  const urlData = await s3.upload(params).promise();
  return urlData;
};



module.exports = {
    upload,
    handleMulterErrors,
    uploadImage
};
