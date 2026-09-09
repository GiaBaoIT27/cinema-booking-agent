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
}
