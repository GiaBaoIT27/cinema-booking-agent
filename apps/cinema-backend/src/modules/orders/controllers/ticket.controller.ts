import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { Request } from 'express';
import { TicketsService, RequestUser } from '../services/ticket.service.js';
import { GetTicketsQueryDto } from '../dto/get-tickets-query.dto.js';
import { GetTicketsResponseDataDto } from '../dto/ticket-list-response.dto.js';
import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiSuccessMessage('Tra cứu danh sách vé thành công')
  async getTickets(
    @Query() query: GetTicketsQueryDto,
    @Req() req: Request & { user: RequestUser },
  ): Promise<GetTicketsResponseDataDto> {
    const data = await this.ticketsService.findAll(query, req.user);

    return plainToInstance(GetTicketsResponseDataDto, data, {
      excludeExtraneousValues: true,
    });
  }
}
