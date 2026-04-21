/**
 * FeedbackEngine
 *
 * Pure function that converts an AnalysisResult into a human-readable
 * FeedbackReport. Always produces at least one practice suggestion.
 *
 * Requirements: 6.2, 6.5
 */

import { AnalysisResult, FeedbackReport, ReadingMaterial } from '../types';

/**
 * Generate a FeedbackReport from an AnalysisResult and the source material.
 *
 * Suggestion rules (applied in order; all that match are included):
 *  - pace === 'too_slow'  → encourage faster reading
 *  - pace === 'too_fast'  → encourage slower reading
 *  - mispronounced words  → list words to practise
 *  - accuracyScore < 70   → general accuracy tip
 *  - accuracyScore >= 90  → positive reinforcement (always at least one item)
 *
 * A fallback suggestion is appended when no other rule fires, guaranteeing
 * the suggestions array always has at least one item (Requirement 6.5).
 */
export function generate(
  analysis: AnalysisResult,
  _material: ReadingMaterial,
): FeedbackReport {
  const suggestions: string[] = [];

  // Pace-based suggestions
  if (analysis.pace === 'too_slow') {
    suggestions.push('Try reading at a faster pace to improve your fluency.');
  } else if (analysis.pace === 'too_fast') {
    suggestions.push('Slow down a little — reading at a steady pace helps with clarity and comprehension.');
  }

  // Mispronunciation suggestions
  if (analysis.mispronounced.length > 0) {
    const wordList = analysis.mispronounced.map((m) => m.word).join(', ');
    suggestions.push(`Practice these words: ${wordList}.`);
  }

  // Accuracy-based suggestions
  if (analysis.accuracyScore < 70) {
    suggestions.push('Focus on reading each word carefully to improve your accuracy score.');
  } else if (analysis.accuracyScore >= 90) {
    suggestions.push('Great job! Keep up the excellent accuracy.');
  }

  // Guarantee at least one suggestion (Requirement 6.5)
  if (suggestions.length === 0) {
    suggestions.push('Good reading session! Keep practising regularly to maintain your progress.');
  }

  return {
    mispronounced: analysis.mispronounced,
    pace: analysis.pace,
    accuracyScore: analysis.accuracyScore,
    suggestions,
    generatedAt: new Date().toISOString(),
  };
}

const feedbackEngine = { generate };
export default feedbackEngine;
