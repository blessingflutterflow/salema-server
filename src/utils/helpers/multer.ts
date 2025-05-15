import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirPath = path.join(process.cwd(), "uploads");

const checkUploadsDirExist = () => {
  fs.access(uploadDirPath, fs.constants.F_OK, (err) => {
    if (err) {
      fs.mkdir(uploadDirPath, (mkdirErr) => {
        if (mkdirErr) {
          console.error("Error creating upload directory:", mkdirErr);
        } else {
          console.log("Upload directory created:", uploadDirPath);
        }
      });
    } else {
      console.log("Upload directory exists:", uploadDirPath);
    }
  });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
});

const renameFile = (name: string, file: any) => {
  const nameWithoutSpace = name.replace(/\s+/g, "-").toLowerCase();
  const fileExtension = path.extname(file.originalname);
  const newFileName = `${nameWithoutSpace}-${Date.now()}${fileExtension}`;

  const oldFilePath = path.join(uploadDirPath, file.filename);
  const newFilePath = path.join(uploadDirPath, newFileName);

  return new Promise((resolve, reject) => {
    fs.rename(oldFilePath, newFilePath, (err) => {
      if (err) {
        return reject(
          new Error("Error in uploading file. Please try after some time.")
        );
      }
      resolve(newFileName);
    });
  });
};

export { upload, renameFile, checkUploadsDirExist };
