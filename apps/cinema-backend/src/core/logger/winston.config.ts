import { utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';

/**
 * options cho WinstonModule.forRootAsync(). Tách riêng file này để test
 * format log độc lập, không phải khởi động cả NestJS app.
 *
 *  - console: format đẹp, có màu — cho local dev đọc bằng mắt
 *  - file combined.log / error.log: JSON 1-dòng-1-log — cho production
 *    (dễ ingest vào ELK/Loki, dễ grep theo requestId)
 */
export function buildWinstonOptions(nodeEnv: string): winston.LoggerOptions {
  const isProduction = nodeEnv === 'production';

  return {
    level: isProduction ? 'info' : 'debug',
    transports: [
      new winston.transports.Console({
        format: isProduction
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.timestamp(),
              nestWinstonUtilities.format.nestLike('Cinema', {
                colors: true,
                prettyPrint: true,
              }),
            ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        maxsize: 10 * 1024 * 1024, // 10MB — tránh log phình vô hạn khi lỗi lặp liên tục
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
      }),
    ],
  };
}
