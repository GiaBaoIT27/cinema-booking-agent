import { Inject, Injectable } from '@nestjs/common';
import type {
  UploadApiErrorResponse,
  UploadApiOptions,
  UploadApiResponse,
  v2 as CloudinaryClient,
} from 'cloudinary';
import { AssetResourceType } from '../../domain/enums/asset-resource-type.enum.js';
import { StorageFolder } from '../../domain/enums/storage-folder.enum.js';
import type {
  AssetRef,
  IFileStorage,
  StoredAsset,
  UploadFileInput,
} from '../../domain/ports/file-storage.port.js';
import { CLOUDINARY_CLIENT } from '../cloudinary/cloudinary.provider.js';
import { parseCloudinaryUrl } from '../cloudinary/cloudinary-url.parser.js';

@Injectable()
export class CloudinaryFileStorageAdapter implements IFileStorage {
  constructor(
    @Inject(CLOUDINARY_CLIENT)
    private readonly cloudinary: typeof CloudinaryClient,
  ) {}

  async upload(
    file: UploadFileInput,
    folder: StorageFolder,
    resourceType: AssetResourceType,
  ): Promise<StoredAsset> {
    const isVideo = resourceType === AssetResourceType.VIDEO;

    const options: UploadApiOptions = {
      folder,
      resource_type: isVideo ? 'video' : 'image',
      // Ảnh: giới hạn kích thước tối đa, giữ tỉ lệ, không phóng to ảnh nhỏ hơn giới hạn.
      ...(isVideo
        ? {}
        : { transformation: [{ width: 1600, height: 1600, crop: 'limit' }] }),
    };

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        options,
        (
          error: UploadApiErrorResponse | undefined,
          response: UploadApiResponse | undefined,
        ) => {
          if (error || !response) {
            reject(error ?? new Error('Cloudinary trả về response rỗng'));
            return;
          }
          resolve(response);
        },
      );
      uploadStream.end(file.buffer);
    });

    return {
      publicId: result.public_id,
      resourceType,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }

  async delete(asset: AssetRef): Promise<void> {
    await this.cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType === AssetResourceType.VIDEO ? 'video' : 'image',
    });
  }

  parseUrl(url: string): AssetRef | null {
    return parseCloudinaryUrl(url);
  }
}
