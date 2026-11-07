import type { MigrationInterface, QueryRunner } from 'typeorm';

const problemAndCoursePermissions = [
  'problem:create',
  'problem:read-managed',
  'problem:update',
  'problem:publish',
  'problem:hold',
  'problem:republish',
  'problem:delete',
  'problem:restore',
  'course:create',
  'course:read-managed',
  'course:update',
  'course:publish',
  'course:hold',
  'course:republish',
  'course:delete',
  'course:restore',
];

const lecturerClassAndAssignmentPermissions = [
  'class:create',
  'class:read-managed',
  'class:update',
  'class:archive',
  'class:restore',
  'class:manage-members',
  'assignment:create',
  'assignment:read-managed',
  'assignment:update',
  'assignment:publish',
  'assignment:delete',
  'assignment:restore',
];

const studentClassAndAssignmentPermissions = [
  'class:join',
  'class:leave',
  'class:read-enrolled',
  'assignment:read-enrolled',
];

export class LearningSelfStudyPermissions1700000000009 implements MigrationInterface {
  name = 'LearningSelfStudyPermissions1700000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_permissions rp USING roles r, permissions p
       WHERE rp.role_id = r.id AND rp.permission_id = p.id
         AND r.name = 'LECTURER' AND p.code = ANY($1::text[])`,
      [problemAndCoursePermissions],
    );
    await queryRunner.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
       WHERE r.name = 'ADMIN' AND p.code = ANY($1::text[])
       ON CONFLICT DO NOTHING`,
      [problemAndCoursePermissions],
    );
    await queryRunner.query(
      `DELETE FROM role_permissions rp USING permissions p
       WHERE rp.permission_id = p.id AND p.code = ANY($1::text[])`,
      [[...lecturerClassAndAssignmentPermissions, ...studentClassAndAssignmentPermissions]],
    );
    await queryRunner.query('DELETE FROM permissions WHERE code = ANY($1::text[])', [
      [...lecturerClassAndAssignmentPermissions, ...studentClassAndAssignmentPermissions],
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const restore = [
      ...lecturerClassAndAssignmentPermissions,
      ...studentClassAndAssignmentPermissions,
    ];
    await queryRunner.query(
      'INSERT INTO permissions (code) SELECT unnest($1::text[]) ON CONFLICT (code) DO NOTHING',
      [restore],
    );
    for (const [role, codes] of [
      ['LECTURER', [...problemAndCoursePermissions, ...lecturerClassAndAssignmentPermissions]],
      ['STUDENT', studentClassAndAssignmentPermissions],
      ['ADMIN', restore],
    ] as const) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
         WHERE r.name = $1 AND p.code = ANY($2::text[])
         ON CONFLICT DO NOTHING`,
        [role, codes],
      );
    }
  }
}
