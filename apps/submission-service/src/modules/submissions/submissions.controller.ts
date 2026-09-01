import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiAcceptedResponse, ApiTags } from '@nestjs/swagger';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { RunCodeDto } from './dto/run-code.dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@Controller('api')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post('submissions')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse()
  submit(@Headers('x-auth-user-id') userId: string, @Body() dto: CreateSubmissionDto) {
    return this.submissions.submit(userId, dto);
  }

  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse()
  run(@Headers('x-auth-user-id') userId: string, @Body() dto: RunCodeDto) {
    return this.submissions.run(userId, dto);
  }

  @Get('submissions')
  list(@Headers('x-auth-user-id') userId: string) {
    return this.submissions.list(userId);
  }

  @Get('submissions/:id')
  get(@Headers('x-auth-user-id') userId: string, @Param('id') id: string) {
    return this.submissions.get(userId, id);
  }
}
