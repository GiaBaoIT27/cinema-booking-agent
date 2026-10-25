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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FnbService } from '../../application/services/fnb.service.js';
import { GetFnbItemsDto } from '../../application/dto/query-fnb-items.dto.js';
import { CreateFnbItemDto } from '../../application/dto/create-fnb-item.dto.js';
import { UpdateFnbItemDto } from '../../application/dto/update-fnb-item.dto.js';
import { UpdateFnbItemStatusDto } from '../../application/dto/update-fnb-item-status.dto.js';

import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('/fnb-items')
export class FnbController {
  constructor(private readonly fnbService: FnbService) {}

  // 1. GET ap1/v1/fnb-items
  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  findAll(@Query() queryDto: GetFnbItemsDto) {
    return this.fnbService.findAll(queryDto);
  }

  // 2. GET ap1/v1/fnb-items/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Public()
  getFnbItemById(@Param('id', ParseIntPipe) id: number) {
    return this.fnbService.findOne(id);
  }

  // 3. POST api/v1/fnb-items
  @Post()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('fnb:create')
  @UseInterceptors(FileInterceptor('file')) // Nhận file đính kèm với key là 'file'
  createFnbItem(
    @Body() createDto: CreateFnbItemDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.fnbService.create(createDto, file);
  }

  // 4. PUT api/v1/fnb-items
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('fnb:update')
  @UseInterceptors(FileInterceptor('file'))
  updateFnbItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFnbItemDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.fnbService.update(id, updateDto, file);
  }

  //5. PATCH api/v1/fnb-items
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('fnb:update')
  updateFnbItemStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateFnbItemStatusDto,
  ) {
    return this.fnbService.updateStatus(id, updateStatusDto);
  }
}
