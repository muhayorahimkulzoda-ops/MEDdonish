import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { AccessSource, EntitlementStatus, PaymentSource, PaymentStatus } from '@prisma/client';

export class CreateOrderDto {
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone?: string;

  @IsUUID()
  courseId: string;

  @IsString()
  @Matches(/^(month_1|month_5|year_1)$/)
  planCode: 'month_1' | 'month_5' | 'year_1';

  @IsEnum(PaymentSource)
  source: PaymentSource;

  @IsOptional()
  @IsString()
  @Matches(/^(dushanbe_city|alif|eskhata)$/)
  method?: 'dushanbe_city' | 'alif' | 'eskhata';
}

export class AttachStoreReceiptDto {
  @IsString()
  @MaxLength(2048)
  @MinLength(8)
  purchaseToken: string;

  @IsEnum(PaymentSource)
  source: PaymentSource;
}

export class ProviderWebhookDto {
  @IsString()
  @MaxLength(128)
  eventId: string;

  @IsUUID()
  orderId: string;

  @IsString()
  @MaxLength(128)
  providerPaymentId: string;

  @IsInt()
  @Min(0)
  amountMinor: number;

  @IsString()
  @MaxLength(8)
  currency: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}

export class AdminGrantDto {
  @ValidateIf((body: AdminGrantDto) => !body.userId)
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone?: string;

  @ValidateIf((body: AdminGrantDto) => !body.phone)
  @IsUUID()
  userId?: string;

  @IsUUID()
  courseId: string;

  @IsString()
  @Matches(/^(month_1|month_5|year_1)$/)
  planCode: 'month_1' | 'month_5' | 'year_1';

  @IsOptional()
  @IsEnum(AccessSource)
  source?: AccessSource;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number;
}

export class AdminEntitlementPatchDto {
  @IsOptional()
  @IsEnum(EntitlementStatus)
  status?: EntitlementStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  extendDays?: number;
}

export class SubmitPaymentReceiptDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}

export class WebReceiptDto {
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone: string;

  @IsUUID()
  courseId: string;

  @IsString()
  @Matches(/^(month_1|month_5|year_1)$/)
  planCode: 'month_1' | 'month_5' | 'year_1';

  @IsString()
  @Matches(/^(dushanbe_city|alif|eskhata)$/)
  method: 'dushanbe_city' | 'alif' | 'eskhata';
}

export class ReviewPaymentDto {
  @Matches(/^(yes|no)$/)
  decision: 'yes' | 'no';
}
