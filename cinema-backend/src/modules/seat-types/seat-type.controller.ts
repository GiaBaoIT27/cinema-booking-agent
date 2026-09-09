import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  HttpStatus,
  HttpCode,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

import { SeatTypeService } from './seat-type.service.js';
import { CreateSeatTypeDto } from './dto/create-seat-type.dto.js';
import { UpdateSeatTypeDto } from './dto/update-seat-type.dto.js';

@Controller('/seat-types')
export class SeatTypeController {
  constructor(private readonly seatTypeService: SeatTypeService) {}

  // 1. GET api/v1/seat-types
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  getAllSeatTypes() {
    return this.seatTypeService.findAll();
  }

  // 2. GET api/v1/seat-types/:id
  @Get(':id')
  @Public()
  getSeatTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.seatTypeService.findOne(id);
  }

  // 3. POST api/v1/seat-types
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('seat_type:create')
  @HttpCode(HttpStatus.CREATED)
  createSeatType(@Body() createDto: CreateSeatTypeDto) {
    return this.seatTypeService.create(createDto);
  }

  // 4. PUT api/v1/seat-types
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('seat_type:update')
  @HttpCode(HttpStatus.OK)
  updateSeatType(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSeatTypeDto,
  ) {
    return this.seatTypeService.update(id, updateDto);
  }

  // 5. DELETE api/v1/seat-types/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('seat_type:delete')
  @HttpCode(HttpStatus.OK)
  deleteSeatType(@Param('id', ParseIntPipe) id: number) {
    return this.seatTypeService.remove(id);
  }
}
