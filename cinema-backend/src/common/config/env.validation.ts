import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET: string;

  // --- THÊM CẤU HÌNH CLOUDINARY VÀO ĐÂY ---
  @IsString()
  @IsNotEmpty({ message: 'Biến môi trường CLOUDINARY_CLOUD_NAME là bắt buộc!' })
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  @IsNotEmpty({ message: 'Biến môi trường CLOUDINARY_API_KEY là bắt buộc!' })
  CLOUDINARY_API_KEY: string;

  @IsString()
  @IsNotEmpty({ message: 'Biến môi trường CLOUDINARY_API_SECRET là bắt buộc!' })
  CLOUDINARY_API_SECRET: string;
}

export function validateEnv(config: Record<string, any>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`[Env Config Error]: ${errors.toString()}`);
  }
  return validatedConfig;
}
