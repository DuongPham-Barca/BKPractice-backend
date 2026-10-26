import { Workbook } from 'exceljs';
import { fromBufferPromise } from 'yauzl';

import type { AccountImportParser } from '@/modules/auth/application/ports';
import {
  ACCOUNT_IMPORT_MAX_BYTES,
  ACCOUNT_IMPORT_MAX_ROWS,
  AccountImportFailure,
  type RawAccountImportRow,
} from '@/modules/auth/domain';

function rejectFile(code: string, row = 0): AccountImportFailure {
  return new AccountImportFailure('invalid_file', [{ row, field: 'row', code }]);
}

async function validateArchive(buffer: Buffer): Promise<void> {
  const archive = await fromBufferPromise(buffer, { validateEntrySizes: true });
  const names = new Set<string>();
  let declaredBytes = 0;
  let actualBytes = 0;
  try {
    for await (const entry of archive.eachEntry()) {
      declaredBytes += entry.uncompressedSize;
      if (
        names.size >= 128 ||
        names.has(entry.fileName) ||
        declaredBytes > 25 * 1024 * 1024 ||
        (entry.generalPurposeBitFlag & 1) !== 0
      )
        throw rejectFile('archive_limit_exceeded');
      names.add(entry.fileName);
      if (entry.fileName.endsWith('/')) continue;
      const stream = await archive.openReadStreamPromise(entry);
      for await (const chunk of stream) {
        if (!Buffer.isBuffer(chunk)) throw rejectFile('invalid_archive');
        actualBytes += chunk.length;
        if (actualBytes > 25 * 1024 * 1024) throw rejectFile('archive_limit_exceeded');
      }
    }
    if (!names.has('xl/workbook.xml')) throw rejectFile('invalid_workbook');
  } finally {
    archive.close();
  }
}

export class XlsxAccountParser implements AccountImportParser {
  async parse(content: Uint8Array): Promise<RawAccountImportRow[]> {
    if (!content.length || content.length > ACCOUNT_IMPORT_MAX_BYTES) throw rejectFile('file_size');
    try {
      const buffer = Buffer.from(content);
      await validateArchive(buffer);
      const workbook = new Workbook();
      await workbook.xlsx.load(Uint8Array.from(content).buffer, {
        ignoreNodes: [
          'mergeCells',
          'dataValidations',
          'sheetProtection',
          'conditionalFormatting',
          'drawing',
          'extLst',
          'picture',
        ],
      });
      const sheet = workbook.worksheets[0];
      if (!sheet || workbook.worksheets.length !== 1) throw rejectFile('one_sheet_required');
      if (sheet.rowCount > ACCOUNT_IMPORT_MAX_ROWS + 1) throw rejectFile('row_limit_exceeded');
      const headers = [1, 2, 3, 4].map((column) => sheet.getRow(1).getCell(column).value);
      if (
        sheet.columnCount > 4 ||
        headers.some((value, index) => value !== ['mssv', 'name', 'email', 'role'][index])
      )
        throw rejectFile('invalid_headers', 1);
      const rows: RawAccountImportRow[] = [];
      for (let row = 2; row <= sheet.rowCount; row++) {
        const values = [1, 2, 3, 4].map((column) => sheet.getRow(row).getCell(column).value);
        if (values.every((value) => value === null || value === undefined || value === ''))
          continue;
        rows.push({ row, values });
      }
      if (!rows.length) throw rejectFile('empty_file');
      return rows;
    } catch (error) {
      if (error instanceof AccountImportFailure) throw error;
      throw rejectFile('invalid_workbook');
    }
  }
}
