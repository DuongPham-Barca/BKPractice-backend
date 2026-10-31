import { Assignment, AssignmentProblem } from './assignments/entities/assignment.entity';
import {
  Chapter,
  ChapterProblem,
  Classroom,
  Course,
  Enrollment,
} from './courses/entities/course.entity';
import {
  Problem,
  ProblemHarness,
  ProblemLanguage,
  StarterCode,
  Tag,
  TestCase,
  Topic,
} from './problems/entities/problem.entity';
import { Progress } from './progress/entities/progress.entity';

export const learningEntities = [
  Problem,
  ProblemHarness,
  TestCase,
  StarterCode,
  ProblemLanguage,
  Topic,
  Tag,
  Course,
  Chapter,
  ChapterProblem,
  Classroom,
  Enrollment,
  Assignment,
  AssignmentProblem,
  Progress,
];
