import { Injectable } from '@nestjs/common';
import { IStorageProvider, StorageUploadResult, StorageDeleteResult } from './storage.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * S3 Storage Provider
 * Full AWS S3 implementation of IStorageProvider
 *
 * Required env vars:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
 */
@Injectable()
export class S3StorageProvider implements IStorageProvider {
    private s3Client: S3Client;
    private bucket: string;

    constructor() {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
        this.bucket = process.env.AWS_S3_BUCKET || '';
    }

    private getUrl(key: string): string {
        return `https://${this.bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    }

    private async putObject(filePath: string, key: string, contentType?: string): Promise<StorageUploadResult> {
        const fileBuffer = fs.readFileSync(filePath);
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
        });
        await this.s3Client.send(command);

        const url = this.getUrl(key);
        return {
            publicId: key,
            url,
            secureUrl: url,
            format: path.extname(filePath).replace('.', ''),
            bytes: fileBuffer.length,
            resourceType: contentType?.split('/')[0] || 'image',
        };
    }

    private async removeObject(key: string): Promise<StorageDeleteResult> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        await this.s3Client.send(command);
        return { result: 'ok' };
    }

    async uploadImage(filePath: string, folder: string): Promise<StorageUploadResult> {
        const key = `${folder}/${uuidv4()}${path.extname(filePath)}`;
        return this.putObject(filePath, key, 'image/' + path.extname(filePath).replace('.', ''));
    }

    async deleteFile(publicId: string): Promise<StorageDeleteResult> {
        return this.removeObject(publicId);
    }

    async uploadMultipleImages(filePaths: string[], folder: string): Promise<StorageUploadResult[]> {
        const results = await Promise.all(
            filePaths.map(async (fp) => {
                const result = await this.uploadImage(fp, folder);
                fs.unlink(fp, (err) => {
                    if (err) console.error(`Failed to delete local file ${fp}:`, err);
                });
                return result;
            }),
        );
        return results;
    }

    async deleteMultipleFiles(publicIds: string[]): Promise<StorageDeleteResult[]> {
        return Promise.all(publicIds.map((id) => this.deleteFile(id)));
    }

    async uploadVideo(filePath: string, folder: string): Promise<StorageUploadResult> {
        const key = `${folder}/videos/${uuidv4()}${path.extname(filePath)}`;
        return this.putObject(filePath, key, 'video/' + path.extname(filePath).replace('.', ''));
    }

    async deleteVideo(publicId: string): Promise<StorageDeleteResult> {
        return this.removeObject(publicId);
    }

    async uploadPdf(filePath: string, folder: string): Promise<StorageUploadResult> {
        const key = `${folder}/documents/${uuidv4()}${path.extname(filePath)}`;
        return this.putObject(filePath, key, 'application/pdf');
    }

    async deletePdf(publicId: string): Promise<StorageDeleteResult> {
        return this.removeObject(publicId);
    }
}
