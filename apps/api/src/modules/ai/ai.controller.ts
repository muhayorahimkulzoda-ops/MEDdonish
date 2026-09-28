import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AskAiDto } from './ai.dto';
import { AiService } from './ai.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('ask')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  ask(@Body() body: AskAiDto) {
    return this.ai.ask(body.question, body.locale || 'tg');
  }
}
