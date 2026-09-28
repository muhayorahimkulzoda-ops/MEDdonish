import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { SubscriberPayload } from '../auth/jwt.strategy';
import { AttachStoreReceiptDto, CreateOrderDto, SubmitPaymentReceiptDto, WebReceiptDto } from './payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() body: CreateOrderDto,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.payments.createOrder(body, req.user.userId);
  }

  @Post('orders/web-receipt')
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('check', {
      storage: memoryStorage(),
      limits: { fileSize: 5_000_000 },
    }),
  )
  submitWebReceipt(
    @Body() body: WebReceiptDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.payments.submitWebReceipt(body, file);
  }

  @Post('orders/:id/store-receipt')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  attachReceipt(
    @Param('id') id: string,
    @Body() body: AttachStoreReceiptDto,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.payments.attachStoreReceipt(id, req.user.userId, body);
  }

  @Get('orders/:id')
  get(@Param('id') id: string) {
    return this.payments.getOrder(id);
  }

  @Post('orders/:id/receipt')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('check', {
      storage: memoryStorage(),
      limits: { fileSize: 5_000_000 },
    }),
  )
  submitReceipt(
    @Param('id') id: string,
    @Body() body: SubmitPaymentReceiptDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.payments.submitReceipt(id, req.user.userId, body.note, file);
  }

  @Post('orders/:id/dev-complete')
  devComplete(@Param('id') id: string) {
    return this.payments.devComplete(id);
  }
}
