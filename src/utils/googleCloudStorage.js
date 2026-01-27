const { Storage } = require('@google-cloud/storage');
const path = require('path');
const crypto = require('crypto');

let storageConfig = {
  projectId: process.env.GCS_PROJECT_ID
};


if (process.env.GCS_KEY_FILE) {
  try {
    const credentials = JSON.parse(process.env.GCS_KEY_FILE);
    storageConfig.credentials = credentials;
    console.log('✅ Credenciales GCS cargadas desde JSON en .env');
  } catch (error) {
    storageConfig.keyFilename = process.env.GCS_KEY_FILE;
    console.log('✅ Credenciales GCS cargadas desde archivo');
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  storageConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log('✅ Credenciales GCS cargadas desde GOOGLE_APPLICATION_CREDENTIALS');
}

const storage = new Storage(storageConfig);
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

const generateFileName = (originalname) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalname);
  const nameWithoutExt = path.basename(originalname, ext);
  const sanitizedName = nameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${sanitizedName}_${timestamp}_${random}${ext}`;
};

exports.uploadFile = async (file, folder = 'uploads') => {
  try {
    const fileName = generateFileName(file.originalname);
    const filePath = `${folder}/${fileName}`;
    const blob = bucket.file(filePath);

    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname
        }
      }
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        reject(error);
      });

      blobStream.on('finish', async () => {
        await blob.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        
        resolve({
          fileName,
          filePath,
          publicUrl,
          size: file.size,
          mimetype: file.mimetype
        });
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    throw new Error(`Error subiendo archivo: ${error.message}`);
  }
};

exports.uploadMultipleFiles = async (files, folder = 'uploads') => {
  try {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    throw new Error(`Error subiendo archivos: ${error.message}`);
  }
};

exports.deleteFile = async (filePath) => {
  try {
    await bucket.file(filePath).delete();
    return { success: true, mensaje: 'Archivo eliminado' };
  } catch (error) {
    throw new Error(`Error eliminando archivo: ${error.message}`);
  }
};

exports.deleteMultipleFiles = async (filePaths) => {
  try {
    const deletePromises = filePaths.map(filePath => bucket.file(filePath).delete());
    await Promise.all(deletePromises);
    return { success: true, mensaje: 'Archivos eliminados' };
  } catch (error) {
    throw new Error(`Error eliminando archivos: ${error.message}`);
  }
};

exports.getSignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresIn * 1000
    };

    const [url] = await bucket.file(filePath).getSignedUrl(options);
    return url;
  } catch (error) {
    throw new Error(`Error generando URL firmada: ${error.message}`);
  }
};

exports.fileExists = async (filePath) => {
  try {
    const [exists] = await bucket.file(filePath).exists();
    return exists;
  } catch (error) {
    return false;
  }
};

exports.getFileMetadata = async (filePath) => {
  try {
    const [metadata] = await bucket.file(filePath).getMetadata();
    return metadata;
  } catch (error) {
    throw new Error(`Error obteniendo metadata: ${error.message}`);
  }
};

exports.listFiles = async (prefix = '') => {
  try {
    const [files] = await bucket.getFiles({ prefix });
    return files.map(file => ({
      name: file.name,
      size: file.metadata.size,
      contentType: file.metadata.contentType,
      created: file.metadata.timeCreated,
      updated: file.metadata.updated
    }));
  } catch (error) {
    throw new Error(`Error listando archivos: ${error.message}`);
  }
};

exports.moveFile = async (oldPath, newPath) => {
  try {
    await bucket.file(oldPath).move(newPath);
    return { success: true, newPath };
  } catch (error) {
    throw new Error(`Error moviendo archivo: ${error.message}`);
  }
};

exports.copyFile = async (sourcePath, destPath) => {
  try {
    await bucket.file(sourcePath).copy(destPath);
    return { success: true, destPath };
  } catch (error) {
    throw new Error(`Error copiando archivo: ${error.message}`);
  }
};