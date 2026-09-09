import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Query,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FnbService } from './fnb.service.js';
import { GetFnbItemsDto } from './dto/query-fnb-items.dto.js';
import { CreateFnbItemDto } from './dto/create-fnb-item.dto.js';
import { UpdateFnbItemDto } from './dto/update-fnb-item.dto.js';
import { UpdateFnbItemStatusDto } from './dto/update-fnb-item-status.dto.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('/fnb-items')
export class FnbController {
  constructor(private readonly fnbService: FnbService) {}

  // 1. GET ap1/v1/fnb-items
  @Get()
  @Public()
  findAll(@Query() queryDto: GetFnbItemsDto) {
    return this.fnbService.findAll(queryDto);
  }

  // 2. GET ap1/v1/fnb-items/:id
  @Get(':id')
  @Public()
  async getFnbItemById(@Param('id', ParseIntPipe) id: number) {
    return this.fnbService.findOne(id);
  }

  // 3. POST api/v1/fnb-items
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  //   @RequirePermissions('fnb:create')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file')) // Nhận file đính kèm với key là 'file'
  async createFnbItem(
    @Body() createDto: CreateFnbItemDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.fnbService.create(createDto, file);
  }

  // 4. PUT api/v1/fnb-items
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  //   @RequirePermissions('fnb:update')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async updateFnbItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFnbItemDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.fnbService.update(id, updateDto, file);
  }

  //5. PATCH api/v1/fnb-items
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  //   @RequirePermissions('fnb:update')
  @HttpCode(HttpStatus.OK)
  async updateFnbItemStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateFnbItemStatusDto,
  ) {
    return this.fnbService.updateStatus(id, updateStatusDto);
  }
}
