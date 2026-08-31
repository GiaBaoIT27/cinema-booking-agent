import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { DistributorsService } from './distributors.service.js';
import { CreateDistributorDto } from './dto/create-distributor.dto.js';
import { FilterDistributorDto } from './dto/filter-distributor.dto.js';
import { UpdateDistributorDto } from './dto/update-distributor.dto.js';
import { UpdateDistributorStatusDto } from './dto/update-status.dto.js';

@Controller('distributors')
export class DistributorsController {
  constructor(private readonly distributorsService: DistributorsService) {}

  @Get()
  findAll(@Query() filterDto: FilterDistributorDto) {
    return this.distributorsService.findAll(filterDto);
  }

  @Post()
  create(@Body() createDto: CreateDistributorDto) {
    return this.distributorsService.create(createDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.distributorsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateDistributorDto) {
    return this.distributorsService.update(id, updateDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateDistributorStatusDto,
  ) {
    return this.distributorsService.updateStatus(id, updateStatusDto);
  }
}
