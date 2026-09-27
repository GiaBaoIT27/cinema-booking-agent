import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuid();
    req.headers['x-request-id'] = requestId; // Ghi đè ngược lại request header để filter/interceptor đọc
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId); // trả lại cho client để trace 2 chiều
    next();
  }
}
