import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ImportAccounts } from '@/modules/auth/application';
import { ACCOUNT_IMPORT_MAX_BYTES, AccountImportFailure } from '@/modules/auth/domain';
import { AccountImportFailureFilter } from '@/modules/auth/presentation/account-import-failure.filter';
import {
  AccountImportGuard,
  type AccountImportRequest,
} from '@/modules/auth/presentation/account-import.guard';
import { AuthFailureFilter } from '@/modules/auth/presentation/auth-failure.filter';

@ApiTags('account administration')
@ApiBearerAuth()
@Controller('api/auth/accounts')
@UseFilters(AccountImportFailureFilter, AuthFailureFilter)
@UseGuards(AccountImportGuard)
export class AccountImportController {
  constructor(private readonly imports: ImportAccounts) {}

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: ACCOUNT_IMPORT_MAX_BYTES, files: 1, fields: 0, parts: 2 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Import accounts atomically (ADMIN and user:import)',
    description:
      'One .xlsx sheet, headers mssv,name,email,role. Maximum 5 MiB and 1,000 data rows. STUDENT requires mssv; LECTURER leaves it empty. Each accepted row creates a User and Profile with the same initial displayName. Any invalid/duplicate row rejects the entire file. Browsers use the access cookie with Origin and CSRF; apps use a Bearer token.',
  })
  @ApiResponse({
    status: 201,
    schema: {
      type: 'object',
      properties: { totalRows: { type: 'integer' }, created: { type: 'integer' } },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or rows; issues contain row, field and code without cell values',
  })
  @ApiResponse({ status: 401, description: 'Invalid authentication or inactive session' })
  @ApiResponse({ status: 403, description: 'Requires ADMIN and user:import' })
  @ApiResponse({
    status: 409,
    description: 'Existing MSSV/email or concurrent conflict; entire file rolled back',
  })
  @ApiResponse({ status: 413, description: 'File exceeds 5 MiB' })
  @ApiResponse({ status: 503, description: 'Database unavailable or required role not seeded' })
  async importFile(
    @Req() request: AccountImportRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ totalRows: number; created: number }> {
    if (!file || !/\.xlsx$/i.test(file.originalname))
      throw new AccountImportFailure('invalid_file');
    return this.imports.execute(request.principal, file.buffer);
  }
}
