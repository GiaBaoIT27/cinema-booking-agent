import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';

/**
 * Schema của pagination meta — dùng trong Swagger doc.
 */
class PaginationMetaSchema {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 10 }) limit: number;
  @ApiProperty({ example: 100 }) totalItems: number;
  @ApiProperty({ example: 10 }) totalPages: number;
  @ApiProperty({ example: true }) hasNextPage: boolean;
  @ApiProperty({ example: false }) hasPrevPage: boolean;
  @ApiProperty({ example: '2024-07-20T13:00:00.000Z' }) timestamp: string;
  @ApiProperty({ example: 'abc-123' }) requestId: string;
  @ApiProperty({ example: '/api/v1/movies' }) path: string;
}

/**
 * Decorator Swagger tổng hợp cho endpoint trả về dữ liệu phân trang.
 * Kết hợp ApiExtraModels + ApiOkResponse để Swagger hiển thị đúng schema.
 *
 * @example
 * @ApiPaginatedResponse(MovieResponseDto)
 * @Get()
 * findAll(@Query() dto: QueryMoviesDto) { ... }
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(model, PaginationMetaSchema),
    ApiOkResponse({
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          code: { type: 'number', example: 200 },
          message: { type: 'string', example: 'Thao tác thực hiện thành công' },
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: { $ref: getSchemaPath(PaginationMetaSchema) },
        },
      },
    }),
  );
};
