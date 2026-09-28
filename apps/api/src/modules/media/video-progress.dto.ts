import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class VideoProgressDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  watchSeconds: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  watchPercent: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  positionSeconds?: number;
}
