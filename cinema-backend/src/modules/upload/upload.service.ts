import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import 'multer';

@Injectable()
export class UploadService {
  async uploadFile(
    file: Express.Multer.File,
    folderName: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `cinema_app/${folderName}`,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) return reject(error);
            if (!result)
              return reject(new Error('Upload to Cloudinary failed.'));
            resolve(result);
          },
        )
        .end(file.buffer);
    });
  }

  /**
   * Xóa vĩnh viễn một asset khỏi Cloudinary theo public_id.
   * Dùng để dọn dẹp media cũ khi admin thay thế poster/banner/trailer.
   * @param resourceType Loại tài nguyên trên Cloudinary ('image' | 'video')
   */
  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: resourceType },
        (error) => {
          if (error) return reject(error);
          resolve();
        },
      );
    });
  }
}
