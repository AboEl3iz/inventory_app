import { Injectable } from '@nestjs/common';
import {
  IStorageProvider,
  StorageUploadResult,
  StorageDeleteResult,
} from './storage.interface';
import cloudinary from 'src/config/cloudinary.config';
import { UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';

/**
 * Cloudinary Storage Provider
 * Implements the IStorageProvider interface using Cloudinary SDK
 */
@Injectable()
export class CloudinaryStorageProvider implements IStorageProvider {
  private mapUploadResult(result: UploadApiResponse): StorageUploadResult {
    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      resourceType: result.resource_type,
      originalFilename: result.original_filename,
    };
  }

  async uploadImage(
    filePath: string,
    folder: string,
  ): Promise<StorageUploadResult> {
    const result = await cloudinary.uploader.upload(filePath, { folder });
    return this.mapUploadResult(result);
  }

  async deleteFile(publicId: string): Promise<StorageDeleteResult> {
    const result = await cloudinary.uploader.destroy(publicId);
    return { result: result.result };
  }

  async uploadMultipleImages(
    filePaths: string[],
    folder: string,
  ): Promise<StorageUploadResult[]> {
    const uploadPromises = filePaths.map(async (filePath) => {
      const result = await cloudinary.uploader.upload(filePath, { folder });
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete local file ${filePath}:`, err);
      });
      return this.mapUploadResult(result);
    });
    return Promise.all(uploadPromises);
  }

  async deleteMultipleFiles(
    publicIds: string[],
  ): Promise<StorageDeleteResult[]> {
    const deletePromises = publicIds.map(async (publicId) => {
      const result = await cloudinary.uploader.destroy(publicId);
      return { result: result.result };
    });
    return Promise.all(deletePromises);
  }

  async uploadVideo(
    filePath: string,
    folder: string,
  ): Promise<StorageUploadResult> {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'video',
      chunk_size: 60000,
    });
    return this.mapUploadResult(result);
  }

  async deleteVideo(publicId: string): Promise<StorageDeleteResult> {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video',
    });
    return { result: result.result };
  }

  async uploadPdf(
    filePath: string,
    folder: string,
  ): Promise<StorageUploadResult> {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'raw',
    });
    return this.mapUploadResult(result);
  }

  async deletePdf(publicId: string): Promise<StorageDeleteResult> {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });
    return { result: result.result };
  }
}
