import { UploadApiResponse } from "cloudinary";
import cloudinary from "src/config/cloudinary.config";

export const uploadImageToCloudinary = async (filePath: string, folder: string) => {
  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
    });
    return result;
  } catch (error) {
    throw new Error('Cloudinary upload failed');
  }
};

export const deleteFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error('Cloudinary deletion failed');
  }
};

export const uploadMultipleImagesToCloudinary = async (filePaths: string[], folder: string) => {
  try {
    const uploadPromises = filePaths.map((filePath) => {
      return cloudinary.uploader.upload(filePath, { folder });
    }
    );
    const results: UploadApiResponse[] = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    throw new Error('Cloudinary multiple upload failed');
  }
};

export const deleteMultipleFromCloudinary = async (publicIds: string[]) => {
  try {
    const deletePromises = publicIds.map((publicId) => {
      return cloudinary.uploader.destroy(publicId);
    });
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    throw new Error('Cloudinary multiple deletion failed');
  }
};


export const uploadvideoToCloudinary = async (filePath: string, folder: string) => {
  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "video",
      chunk_size: 60000
    },

    );
    return result;
  } catch (error) {
    throw new Error('Cloudinary upload failed');
  }
}

export const deletevideoFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    return result;
  } catch (error) {
    throw new Error('Cloudinary deletion failed');
  }
};

export const uploadpdfToCloudinary = async (filePath: string, folder: string) => {
  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "raw",
    });
    return result;
  } catch (error) {
    throw new Error('Cloudinary upload failed');
  }
}

export const deletepdfFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    return result;
  } catch (error) {
    throw new Error('Cloudinary deletion failed');
  }
};

