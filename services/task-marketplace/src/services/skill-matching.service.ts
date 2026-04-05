import { Task, DifficultyLevel } from '../types/task.types';

export interface UserProfile {
  user_id: string;
  skills: string[];
  reputation: number;
  completed_tasks: number;
  success_rate: number;
  average_rating: number;
}

export interface TaskRecommendation {
  task: Task;
  match_score: number;
  reasons: string[];
}

export class SkillMatchingService {
  /**
   * Calculate match score between user and task
   * Score range: 0-100
   */
  calculateMatchScore(user: UserProfile, task: Task): number {
    let score = 0;
    const weights = {
      skillMatch: 40,
      reputationFit: 25,
      experienceLevel: 20,
      successRate: 15,
    };

    // 1. Skill Match (40 points)
    const skillScore = this.calculateSkillScore(user.skills, task.required_skills);
    score += skillScore * weights.skillMatch;

    // 2. Reputation Fit (25 points)
    const reputationScore = this.calculateReputationScore(
      user.reputation,
      task.min_reputation,
      task.difficulty
    );
    score += reputationScore * weights.reputationFit;

    // 3. Experience Level (20 points)
    const experienceScore = this.calculateExperienceScore(
      user.completed_tasks,
      task.difficulty
    );
    score += experienceScore * weights.experienceLevel;

    // 4. Success Rate (15 points)
    const successScore = user.success_rate;
    score += successScore * weights.successRate;

    return Math.round(score);
  }

  /**
   * Calculate skill match score (0-1)
   */
  private calculateSkillScore(userSkills: string[], requiredSkills: string[]): number {
    if (!requiredSkills || requiredSkills.length === 0) {
      return 1; // No skills required, perfect match
    }

    if (!userSkills || userSkills.length === 0) {
      return 0; // No user skills, no match
    }

    // Normalize skills for comparison (lowercase, trim)
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim());
    const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase().trim());

    // Calculate Jaccard similarity
    const intersection = normalizedRequiredSkills.filter(skill =>
      normalizedUserSkills.includes(skill)
    );

    const matchedSkillsRatio = intersection.length / normalizedRequiredSkills.length;

    // Bonus for having extra relevant skills
    const extraSkillsBonus = Math.min(
      (normalizedUserSkills.length - intersection.length) * 0.05,
      0.2
    );

    return Math.min(matchedSkillsRatio + extraSkillsBonus, 1);
  }

  /**
   * Calculate reputation score (0-1)
   */
  private calculateReputationScore(
    userReputation: number,
    minReputation: number,
    difficulty: DifficultyLevel
  ): number {
    // If doesn't meet minimum, return 0
    if (userReputation < minReputation) {
      return 0;
    }

    // Define ideal reputation ranges for each difficulty
    const idealRanges: Record<DifficultyLevel, { min: number; optimal: number }> = {
      [DifficultyLevel.BEGINNER]: { min: 0, optimal: 100 },
      [DifficultyLevel.INTERMEDIATE]: { min: 100, optimal: 300 },
      [DifficultyLevel.ADVANCED]: { min: 300, optimal: 600 },
      [DifficultyLevel.EXPERT]: { min: 500, optimal: 1000 },
    };

    const range = idealRanges[difficulty];

    // Calculate how close user is to optimal reputation
    if (userReputation >= range.optimal) {
      return 1; // At or above optimal
    }

    // Linear scale between min and optimal
    const progress = (userReputation - range.min) / (range.optimal - range.min);
    return Math.max(0, Math.min(progress, 1));
  }

  /**
   * Calculate experience score based on completed tasks (0-1)
   */
  private calculateExperienceScore(
    completedTasks: number,
    difficulty: DifficultyLevel
  ): number {
    const requiredTasks: Record<DifficultyLevel, number> = {
      [DifficultyLevel.BEGINNER]: 0,
      [DifficultyLevel.INTERMEDIATE]: 5,
      [DifficultyLevel.ADVANCED]: 20,
      [DifficultyLevel.EXPERT]: 50,
    };

    const required = requiredTasks[difficulty];

    if (completedTasks >= required * 2) {
      return 1; // Double the required experience
    }

    if (completedTasks >= required) {
      return 0.7 + (completedTasks - required) / required * 0.3;
    }

    // Below required, penalize
    return required === 0 ? 1 : (completedTasks / required) * 0.6;
  }

  /**
   * Get recommended tasks for a user
   */
  getRecommendations(
    user: UserProfile,
    availableTasks: Task[],
    limit: number = 10
  ): TaskRecommendation[] {
    const recommendations = availableTasks
      .map(task => {
        const matchScore = this.calculateMatchScore(user, task);
        const reasons = this.getMatchReasons(user, task, matchScore);

        return {
          task,
          match_score: matchScore,
          reasons,
        };
      })
      .filter(rec => rec.match_score >= 30) // Minimum 30% match
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, limit);

    return recommendations;
  }

  /**
   * Generate human-readable reasons for match score
   */
  private getMatchReasons(
    user: UserProfile,
    task: Task,
    score: number
  ): string[] {
    const reasons: string[] = [];

    // Skill match reasons
    if (task.required_skills && task.required_skills.length > 0) {
      const matchedSkills = task.required_skills.filter(skill =>
        user.skills.some(userSkill =>
          userSkill.toLowerCase() === skill.toLowerCase()
        )
      );

      if (matchedSkills.length === task.required_skills.length) {
        reasons.push('You have all required skills');
      } else if (matchedSkills.length > 0) {
        reasons.push(`You have ${matchedSkills.length}/${task.required_skills.length} required skills`);
      }
    }

    // Reputation reasons
    if (user.reputation >= task.min_reputation) {
      if (task.difficulty === DifficultyLevel.EXPERT && user.reputation >= 1000) {
        reasons.push('Your high reputation makes you ideal for this expert task');
      } else if (user.reputation >= task.min_reputation * 2) {
        reasons.push('Your reputation exceeds requirements');
      }
    }

    // Experience reasons
    if (task.difficulty === DifficultyLevel.BEGINNER && user.completed_tasks === 0) {
      reasons.push('Great task for getting started');
    } else if (user.completed_tasks >= 50 && task.difficulty === DifficultyLevel.EXPERT) {
      reasons.push('Your extensive experience fits this advanced task');
    }

    // Success rate reasons
    if (user.success_rate >= 0.9) {
      reasons.push('Your high success rate makes you a trusted worker');
    }

    // Rating reasons
    if (user.average_rating >= 4.5) {
      reasons.push('Your excellent ratings make you highly qualified');
    }

    // Overall score reasons
    if (score >= 90) {
      reasons.unshift('Excellent match!');
    } else if (score >= 70) {
      reasons.unshift('Strong match');
    } else if (score >= 50) {
      reasons.unshift('Good match');
    }

    return reasons;
  }

  /**
   * Check if user is eligible for a task
   */
  isEligible(user: UserProfile, task: Task): { eligible: boolean; reason?: string } {
    // Check reputation requirement
    if (user.reputation < task.min_reputation) {
      return {
        eligible: false,
        reason: `Requires ${task.min_reputation} reputation (you have ${user.reputation})`,
      };
    }

    // Check required skills
    if (task.required_skills && task.required_skills.length > 0) {
      const hasAllSkills = task.required_skills.every(reqSkill =>
        user.skills.some(userSkill =>
          userSkill.toLowerCase() === reqSkill.toLowerCase()
        )
      );

      if (!hasAllSkills) {
        const missingSkills = task.required_skills.filter(reqSkill =>
          !user.skills.some(userSkill =>
            userSkill.toLowerCase() === reqSkill.toLowerCase()
          )
        );
        return {
          eligible: false,
          reason: `Missing required skills: ${missingSkills.join(', ')}`,
        };
      }
    }

    // Check if expert task requires minimum experience
    if (task.difficulty === DifficultyLevel.EXPERT && user.completed_tasks < 10) {
      return {
        eligible: false,
        reason: 'Expert tasks require at least 10 completed tasks',
      };
    }

    return { eligible: true };
  }
}
