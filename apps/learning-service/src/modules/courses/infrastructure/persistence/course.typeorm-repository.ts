import type {
  CourseRepository,
  CourseListFilter,
  ManagedCourseListFilter,
  CoursePage,
} from '@learning/modules/courses/application/ports/out/course-repository.port';
import { Course as CourseAggregate } from '@learning/modules/courses/domain/course.aggregate';
import {
  Course as CourseEntity,
  Chapter as ChapterEntity,
  ChapterProblem as ChapterProblemEntity,
} from '@learning/modules/courses/entities/course.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CoursePersistenceMapper } from './course.persistence-mapper';

@Injectable()
export class CourseTypeOrmRepository implements CourseRepository {
  constructor(
    @InjectRepository(CourseEntity) private readonly courseRepo: Repository<CourseEntity>,
    @InjectRepository(ChapterEntity) private readonly chapterRepo: Repository<ChapterEntity>,
    @InjectRepository(ChapterProblemEntity)
    private readonly chapterProblemRepo: Repository<ChapterProblemEntity>,
  ) {}

  private async loadAggregate(courseId: string): Promise<CourseAggregate | null> {
    const entity = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!entity) return null;
    const chapters = await this.chapterRepo.find({ where: { courseId } });
    const chapterIds = chapters.map((c) => c.id);
    const chapterProblems = chapterIds.length
      ? await this.chapterProblemRepo
          .createQueryBuilder('cp')
          .where('cp.chapter_id IN (:...ids)', { ids: chapterIds })
          .getMany()
      : [];
    return CoursePersistenceMapper.toDomain(entity, chapters, chapterProblems);
  }

  async findById(id: string): Promise<CourseAggregate | null> {
    const course = await this.loadAggregate(id);
    if (!course || course.deletedMarker.isDeleted) return null;
    return course;
  }

  async findByIdIncludingDeleted(id: string): Promise<CourseAggregate | null> {
    return this.loadAggregate(id);
  }

  async findPublishedByIdOrSlug(idOrSlug: string): Promise<CourseAggregate | null> {
    const entity = await this.courseRepo
      .createQueryBuilder('c')
      .where('(c.id = :v OR c.slug = :v) AND c.publish_status = :s AND c.deleted_at IS NULL', {
        v: idOrSlug,
        s: 'PUBLISHED',
      })
      .getOne();
    if (!entity) return null;
    return this.loadAggregate(entity.id);
  }

  async findManagedById(
    id: string,
    ownerId: string,
    includeDeleted: boolean,
  ): Promise<CourseAggregate | null> {
    const entity = await this.courseRepo.findOne({ where: { id, createdBy: ownerId } });
    if (!entity) return null;
    if (entity.deletedAt !== null && !includeDeleted) return null;
    return this.loadAggregate(id);
  }

  async loadForUpdate(id: string, includeDeleted = false): Promise<CourseAggregate | null> {
    return includeDeleted ? this.findByIdIncludingDeleted(id) : this.findById(id);
  }

  async listPublished(filter: CourseListFilter): Promise<CoursePage<CourseAggregate>> {
    const qb = this.courseRepo
      .createQueryBuilder('c')
      .where('c.publish_status = :s AND c.deleted_at IS NULL', { s: 'PUBLISHED' });
    if (filter.search) qb.andWhere('c.title ILIKE :q', { q: `%${filter.search}%` });
    const total = await qb.getCount();
    const entities = await qb
      .orderBy('c.created_at', 'DESC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit)
      .getMany();
    const items = await Promise.all(entities.map((e) => this.loadAggregate(e.id)));
    return {
      items: items.filter((x): x is CourseAggregate => x !== null),
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async listManaged(filter: ManagedCourseListFilter): Promise<CoursePage<CourseAggregate>> {
    const qb = this.courseRepo
      .createQueryBuilder('c')
      .where('c.created_by = :owner', { owner: filter.ownerId });
    if (!filter.includeDeleted) qb.andWhere('c.deleted_at IS NULL');
    const total = await qb.getCount();
    const entities = await qb
      .orderBy('c.created_at', 'DESC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit)
      .getMany();
    const items = await Promise.all(entities.map((e) => this.loadAggregate(e.id)));
    return {
      items: items.filter((x): x is CourseAggregate => x !== null),
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async isSlugAvailable(slug: string, excludeCourseId?: string): Promise<boolean> {
    const qb = this.courseRepo.createQueryBuilder('c').where('c.slug = :slug', { slug });
    if (excludeCourseId) qb.andWhere('c.id <> :id', { id: excludeCourseId });
    const count = await qb.getCount();
    return count === 0;
  }

  async save(course: CourseAggregate, _expectedUpdatedAt?: Date): Promise<void> {
    const entity = CoursePersistenceMapper.toEntity(course);
    await this.courseRepo.save(entity);

    // sync chapters
    const existingChapters = await this.chapterRepo.find({ where: { courseId: course.id.value } });
    const newChapterIds = new Set(course.chapters.map((c) => c.id.value));

    for (const ch of existingChapters) {
      if (!newChapterIds.has(ch.id)) await this.chapterRepo.delete(ch.id);
    }

    for (const ch of course.chapters) {
      let chapterEntity = existingChapters.find((e) => e.id === ch.id.value);
      if (!chapterEntity) {
        chapterEntity = new ChapterEntity();
        chapterEntity.id = ch.id.value;
        chapterEntity.courseId = course.id.value;
      }
      chapterEntity.title = ch.title.value;
      chapterEntity.description = ch.description.value;
      chapterEntity.displayOrder = course.chapters.indexOf(ch);
      await this.chapterRepo.save(chapterEntity);

      // sync chapter problems
      const existingProblems = await this.chapterProblemRepo.find({
        where: { chapterId: ch.id.value },
      });
      const newProblemIds = new Set(ch.problemRefs.map((p) => p.value));
      for (const cp of existingProblems) {
        if (!newProblemIds.has(cp.problemId)) await this.chapterProblemRepo.delete(cp.id);
      }
      for (let i = 0; i < ch.problemRefs.length; i += 1) {
        const ref = ch.problemRefs[i]!;
        const existing = existingProblems.find((cp) => cp.problemId === ref.value);
        if (existing) {
          existing.displayOrder = i;
          await this.chapterProblemRepo.save(existing);
        } else {
          const cp = new ChapterProblemEntity();
          cp.chapterId = ch.id.value;
          cp.problemId = ref.value;
          cp.displayOrder = i;
          await this.chapterProblemRepo.save(cp);
        }
      }
    }
  }

  async softDelete(id: string, ownerId: string, at: Date): Promise<boolean> {
    const result = await this.courseRepo.update(
      { id, createdBy: ownerId, deletedAt: null as unknown as Date },
      { deletedAt: at, updatedAt: at },
    );
    return (result.affected ?? 0) > 0;
  }

  async restore(id: string, ownerId: string, at: Date): Promise<boolean> {
    const result = await this.courseRepo.update(
      { id, createdBy: ownerId },
      { deletedAt: null, updatedAt: at },
    );
    return (result.affected ?? 0) > 0;
  }

  async hardDelete(id: string, ownerId: string): Promise<boolean> {
    const result = await this.courseRepo.delete({ id, createdBy: ownerId });
    return (result.affected ?? 0) > 0;
  }
}
