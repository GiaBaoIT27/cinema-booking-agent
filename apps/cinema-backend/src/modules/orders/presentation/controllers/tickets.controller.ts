import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';

import { TicketsService } from '../../application/services/tickets.service.js';
import { QueryTicketsDto } from '../../application/dto/query-tickets.dto.js';

import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { CurrentUser } from '#src/common/decorators/current-user.decorator.js';

@Controller('/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // GET api/v1/tickets - Tra cứu vé (khách chỉ thấy vé của mình; có quyền ticket:view thì thấy tất cả)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiSuccessMessage('Tra cứu danh sách vé thành công')
  async findAll(
    @Query() query: QueryTicketsDto,
    // JwtStrategy trả về { userId, email, roles, permissions } - KHÔNG có 'id'
    @CurrentUser('userId') userId: string,
    @CurrentUser('permissions') permissions: string[],
  ) {
    return this.ticketsService.findAll(query, {
      userId,
      permissions,
    });
  }
}
