import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  // @IsNotEmpty({
  //   message: 'Biến môi trường JWT_ACCESS_SECRET bắt buộc phải cấu hình!',
  // })
  @IsOptional()
  JWT_ACCESS_SECRET: string;
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
