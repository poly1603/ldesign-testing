/**
 * Property-based tests for Auto Test Suite types
 * 
 * Feature: auto-testing-suite
 * Property 18: Score Calculation Bounds
 * Validates: Requirements 7.1, 7.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  isValidScore,
  isValidWeights,
  calculateWeightedScore,
  getGradeFromScore,
  DEFAULT_SCORE_WEIGHTS,
  type ScoreWeights,
  type Grade,
} from './index.js'

describe('Auto Test Suite Types - Property Tests', () => {
  /**
   * Property 18: Score Calculation Bounds
   * 
   * For any test result, the Score_Calculator SHALL produce an overall score
   * and category scores that are all within the range [0, 100].
   * 
   * Validates: Requirements 7.1, 7.2
   */
  describe('Property 18: Score Calculation Bounds', () => {
    // Arbitrary for generating valid scores (0-100)
    const validScoreArb = fc.float({
      min: Math.fround(0),
      max: Math.fround(100),
      noNaN: true
    })

    // Arbitrary for generating category scores
    const categoryScoresArb = fc.record({
      memory: validScoreArb,
      performance: validScoreArb,
      ui: validScoreArb,
      api: validScoreArb,
      page: validScoreArb,
    })

    // Arbitrary for generating valid weights (sum to 1.0)
    const validWeightsArb = fc
      .tuple(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true })
      )
      .map(([a, b, c, d, e]) => {
        // Normalize to sum to 1.0
        const sum = a + b + c + d + e
        return {
          memory: a / sum,
          performance: b / sum,
          ui: c / sum,
          api: d / sum,
          page: e / sum,
        } as ScoreWeights
      })

    it('isValidScore returns true for all scores in [0, 100]', () => {
      fc.assert(
        fc.property(validScoreArb, (score) => {
          return isValidScore(score) === true
        }),
        { numRuns: 100 }
      )
    })

    it('isValidScore returns false for scores outside [0, 100]', () => {
      const invalidScoreArb = fc.oneof(
        fc.float({ min: Math.fround(-1000), max: Math.fround(-0.001), noNaN: true }),
        fc.float({ min: Math.fround(100.001), max: Math.fround(1000), noNaN: true })
      )

      fc.assert(
        fc.property(invalidScoreArb, (score) => {
          return isValidScore(score) === false
        }),
        { numRuns: 100 }
      )
    })

    it('isValidWeights returns true when weights sum to 1.0', () => {
      fc.assert(
        fc.property(validWeightsArb, (weights) => {
          return isValidWeights(weights) === true
        }),
        { numRuns: 100 }
      )
    })

    it('calculateWeightedScore always produces a score in [0, 100]', () => {
      fc.assert(
        fc.property(categoryScoresArb, validWeightsArb, (categories, weights) => {
          const result = calculateWeightedScore(categories, weights)
          return result >= 0 && result <= 100
        }),
        { numRuns: 100 }
      )
    })

    it('calculateWeightedScore with default weights produces valid scores', () => {
      fc.assert(
        fc.property(categoryScoresArb, (categories) => {
          const result = calculateWeightedScore(categories, DEFAULT_SCORE_WEIGHTS)
          return isValidScore(result)
        }),
        { numRuns: 100 }
      )
    })

    it('calculateWeightedScore equals weighted sum (within tolerance)', () => {
      fc.assert(
        fc.property(categoryScoresArb, validWeightsArb, (categories, weights) => {
          const result = calculateWeightedScore(categories, weights)
          const expected =
            categories.memory * weights.memory +
            categories.performance * weights.performance +
            categories.ui * weights.ui +
            categories.api * weights.api +
            categories.page * weights.page

          // Allow for floating point tolerance and clamping
          const clampedExpected = Math.max(0, Math.min(100, expected))
          return Math.abs(result - clampedExpected) < 0.01
        }),
        { numRuns: 100 }
      )
    })

    it('getGradeFromScore returns valid grades for all scores', () => {
      const validGrades: Grade[] = ['A', 'B', 'C', 'D', 'F']

      fc.assert(
        fc.property(validScoreArb, (score) => {
          const grade = getGradeFromScore(score)
          return validGrades.includes(grade)
        }),
        { numRuns: 100 }
      )
    })

    it('getGradeFromScore follows correct thresholds', () => {
      fc.assert(
        fc.property(validScoreArb, (score) => {
          const grade = getGradeFromScore(score)

          if (score >= 90) return grade === 'A'
          if (score >= 80) return grade === 'B'
          if (score >= 70) return grade === 'C'
          if (score >= 60) return grade === 'D'
          return grade === 'F'
        }),
        { numRuns: 100 }
      )
    })

    it('higher category scores produce higher or equal overall scores', () => {
      fc.assert(
        fc.property(
          categoryScoresArb,
          validWeightsArb,
          fc.float({ min: Math.fround(0), max: Math.fround(10), noNaN: true }),
          (categories, weights, increment) => {
            const originalScore = calculateWeightedScore(categories, weights)

            // Increase all category scores by increment (capped at 100)
            const increasedCategories = {
              memory: Math.min(100, categories.memory + increment),
              performance: Math.min(100, categories.performance + increment),
              ui: Math.min(100, categories.ui + increment),
              api: Math.min(100, categories.api + increment),
              page: Math.min(100, categories.page + increment),
            }

            const increasedScore = calculateWeightedScore(increasedCategories, weights)
            return increasedScore >= originalScore
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Default Configuration Validation', () => {
    it('DEFAULT_SCORE_WEIGHTS sums to 1.0', () => {
      expect(isValidWeights(DEFAULT_SCORE_WEIGHTS)).toBe(true)
    })

    it('DEFAULT_SCORE_WEIGHTS has all positive values', () => {
      expect(DEFAULT_SCORE_WEIGHTS.memory).toBeGreaterThan(0)
      expect(DEFAULT_SCORE_WEIGHTS.performance).toBeGreaterThan(0)
      expect(DEFAULT_SCORE_WEIGHTS.ui).toBeGreaterThan(0)
      expect(DEFAULT_SCORE_WEIGHTS.api).toBeGreaterThan(0)
      expect(DEFAULT_SCORE_WEIGHTS.page).toBeGreaterThan(0)
    })
  })
})
