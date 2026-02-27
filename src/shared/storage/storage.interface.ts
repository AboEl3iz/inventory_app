/**
 * Storage Provider Interface
 * Abstraction layer that allows switching between Cloudinary, AWS S3, or any other provider
 *
 * To switch providers:
 *   1. Set STORAGE_PROVIDER env var to 'cloudinary' or 's3'
 *   2. Fill in the corresponding credentials in .env
 *   3. The StorageFactory will automatically resolve the right provider
 */
export interface IStorageProvider {
  uploadImage(filePath: string, folder: string): Promise<StorageUploadResult>;
  deleteFile(publicId: string): Promise<StorageDeleteResult>;
  uploadMultipleImages(
    filePaths: string[],
    folder: string,
  ): Promise<StorageUploadResult[]>;
  deleteMultipleFiles(publicIds: string[]): Promise<StorageDeleteResult[]>;
  uploadVideo(filePath: string, folder: string): Promise<StorageUploadResult>;
  deleteVideo(publicId: string): Promise<StorageDeleteResult>;
  uploadPdf(filePath: string, folder: string): Promise<StorageUploadResult>;
  deletePdf(publicId: string): Promise<StorageDeleteResult>;
}

export interface StorageUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  resourceType: string;
  originalFilename?: string;
}

export interface StorageDeleteResult {
  result: string;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
