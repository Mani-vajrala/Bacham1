import { sandboxService } from './sandboxService.js';

/**
 * Service to evaluate student answers across all 6 question types
 */
class EvaluationService {
  /**
   * Evaluate a question submission
   * @param {Object} question - Question object with options and testCases loaded
   * @param {Object} submissionData - { answerText, selectedOptionIds, code, language }
   */
  async evaluate(question, submissionData) {
    const marks = question.marks || 1;

    switch (question.type) {
      case 'MCQ': {
        const selectedIds = this._parseSelectedOptionIds(submissionData.selectedOptionIds);
        const correctOption = question.options.find((opt) => opt.isCorrect);
        const isCorrect = correctOption && selectedIds.length === 1 && selectedIds[0] === correctOption.id;

        return {
          isCorrect,
          marksAwarded: isCorrect ? marks : 0,
          status: 'EVALUATED',
          details: {
            correctOptionId: correctOption?.id,
            selectedOptionIds: selectedIds
          }
        };
      }

      case 'MULTI_MCQ': {
        const selectedIds = this._parseSelectedOptionIds(submissionData.selectedOptionIds).sort();
        const correctOptionIds = question.options
          .filter((opt) => opt.isCorrect)
          .map((opt) => opt.id)
          .sort();

        // Exact match of all correct options
        const isCorrect =
          selectedIds.length === correctOptionIds.length &&
          selectedIds.every((id, idx) => id === correctOptionIds[idx]);

        return {
          isCorrect,
          marksAwarded: isCorrect ? marks : 0,
          status: 'EVALUATED',
          details: {
            correctOptionIds,
            selectedOptionIds: selectedIds
          }
        };
      }

      case 'FILL_BLANK': {
        const studentAnswer = (submissionData.answerText || '').trim().toLowerCase();
        let acceptedAnswers = [];

        try {
          if (question.acceptedAnswers) {
            const parsed = JSON.parse(question.acceptedAnswers);
            if (Array.isArray(parsed)) {
              acceptedAnswers = parsed;
            } else if (typeof parsed === 'string') {
              acceptedAnswers = [parsed];
            }
          }
        } catch (_) {
          if (question.acceptedAnswers) {
            acceptedAnswers = [question.acceptedAnswers];
          }
        }

        // Also check if any option marked isCorrect was saved
        if (question.options && question.options.length > 0) {
          question.options.forEach((opt) => {
            if (opt.isCorrect && opt.text) acceptedAnswers.push(opt.text);
          });
        }

        const normalizedAccepted = acceptedAnswers.map((a) =>
          this._normalizeText(a)
        );
        const normalizedStudent = this._normalizeText(studentAnswer);

        const isCorrect = normalizedAccepted.includes(normalizedStudent);

        return {
          isCorrect,
          marksAwarded: isCorrect ? marks : 0,
          status: 'EVALUATED',
          details: {
            studentAnswer,
            acceptedAnswers
          }
        };
      }

      case 'TRUE_FALSE': {
        const selectedIds = this._parseSelectedOptionIds(submissionData.selectedOptionIds);
        const studentText = (submissionData.answerText || '').trim().toLowerCase();

        let isCorrect = false;
        const correctOption = question.options.find((opt) => opt.isCorrect);

        if (correctOption) {
          if (selectedIds.length > 0 && selectedIds[0] === correctOption.id) {
            isCorrect = true;
          } else if (studentText && correctOption.text.toLowerCase() === studentText) {
            isCorrect = true;
          }
        }

        return {
          isCorrect,
          marksAwarded: isCorrect ? marks : 0,
          status: 'EVALUATED',
          details: {
            correctOptionText: correctOption?.text,
            studentAnswer: studentText || selectedIds[0]
          }
        };
      }

      case 'SHORT_ANSWER': {
        const studentAnswer = (submissionData.answerText || '').trim();
        // Check if there are exact matching keywords/answers, otherwise mark for review or evaluate non-empty
        let isCorrect = false;
        let acceptedAnswers = [];

        try {
          if (question.acceptedAnswers) {
            const parsed = JSON.parse(question.acceptedAnswers);
            if (Array.isArray(parsed)) acceptedAnswers = parsed;
          }
        } catch (_) {}

        if (acceptedAnswers.length > 0) {
          const normalizedStudent = this._normalizeText(studentAnswer);
          isCorrect = acceptedAnswers.some((ans) =>
            normalizedStudent.includes(this._normalizeText(ans))
          );
        } else {
          // If no automatic keywords provided, mark as submitted for manual review
          isCorrect = studentAnswer.length > 0;
        }

        return {
          isCorrect,
          marksAwarded: isCorrect ? marks : 0,
          status: acceptedAnswers.length > 0 ? 'EVALUATED' : 'MANUAL_REVIEW',
          details: {
            studentAnswer
          }
        };
      }

      case 'CODING': {
        const code = submissionData.code || '';
        const language = submissionData.language || question.codingLanguage || 'python';
        const testCases = question.testCases || [];

        const evalResult = await sandboxService.evaluateTestCases({
          language,
          code,
          testCases
        });

        const isCorrect = evalResult.status === 'PASSED';
        // Partial scoring if multiple test cases
        const marksAwarded =
          testCases.length > 0
            ? Number(((evalResult.testsPassed / testCases.length) * marks).toFixed(2))
            : isCorrect
            ? marks
            : 0;

        return {
          isCorrect,
          marksAwarded,
          status: 'EVALUATED',
          codingResult: {
            language,
            code,
            testsPassed: evalResult.testsPassed,
            totalTests: evalResult.totalTests,
            executionTimeMs: evalResult.executionTimeMs,
            status: evalResult.status,
            testResults: evalResult.testResults
          }
        };
      }

      default:
        return {
          isCorrect: false,
          marksAwarded: 0,
          status: 'EVALUATED',
          details: {}
        };
    }
  }

  _parseSelectedOptionIds(input) {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed;
      return [input];
    } catch (_) {
      return [input];
    }
  }

  _normalizeText(str) {
    return (str || '')
      .toLowerCase()
      .replace(/[\s\-_.,;:]+/g, '') // remove whitespace and punctuation for fuzzy match
      .trim();
  }
}

export const evaluationService = new EvaluationService();
