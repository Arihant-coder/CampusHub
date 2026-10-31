/**
 * @file types.ts
 * @description Service interface and data contracts for Dashboard feature.
 * @owner Dashboard Team
 */

import type { Result } from "@/shared/result";
import type { Subject } from "@/shared/user";
import type { Post } from "@/shared/communities";

export interface DashboardService {
  /**
   * Fetches subjects enrolled by the active user.
   * Falls back to general catalog subjects if user has no enrollments.
   */
  getEnrolledSubjects(): Promise<Result<Subject[]>>;

  /**
   * Fetches all available subjects in the curriculum.
   */
  getAllSubjects(): Promise<Result<Subject[]>>;

  /**
   * Fetches top trending / hot discussions across student communities.
   */
  getHotDiscussions(limit?: number): Promise<Result<Post[]>>;
}
