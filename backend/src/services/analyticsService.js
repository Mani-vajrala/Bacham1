import { prisma } from '../config.js';

/**
 * Service to compute live session leaderboard and detailed post-quiz analytics
 */
class AnalyticsService {
  /**
   * Calculate live leaderboard for a session
   */
  async computeLeaderboard(sessionId) {
    const studentSessions = await prisma.studentSession.findMany({
      where: { sessionId },
      include: {
        submissions: {
          include: {
            question: true
          }
        }
      }
    });

    const leaderboard = studentSessions.map((student) => {
      let totalScore = 0;
      let totalCorrect = 0;
      let totalWrong = 0;
      let totalTimeMs = 0;

      student.submissions.forEach((sub) => {
        totalScore += sub.marksAwarded || 0;
        if (sub.isCorrect) totalCorrect++;
        else totalWrong++;
        totalTimeMs += sub.responseTimeMs || 0;
      });

      const avgResponseTimeMs =
        student.submissions.length > 0
          ? Math.round(totalTimeMs / student.submissions.length)
          : 0;

      return {
        studentSessionId: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        isOnline: student.isOnline,
        tabSwitchCount: student.tabSwitchCount,
        submissionsCount: student.submissions.length,
        totalScore: Number(totalScore.toFixed(2)),
        totalCorrect,
        totalWrong,
        totalTimeMs,
        avgResponseTimeMs,
        avgResponseTimeSec: Number((avgResponseTimeMs / 1000).toFixed(2))
      };
    });

    // Sort by Total Score DESC, then Avg Response Time ASC (tie-breaker)
    leaderboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.avgResponseTimeMs - b.avgResponseTimeMs;
    });

    // Assign ranks (handling ties properly)
    return leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }

  /**
   * Generate comprehensive post-quiz analytics
   */
  async getSessionAnalytics(sessionId) {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true,
                testCases: true
              },
              orderBy: { order: 'asc' }
            }
          }
        },
        studentSessions: {
          include: {
            submissions: {
              include: {
                codingSubmission: true,
                question: true
              }
            }
          }
        }
      }
    });

    if (!session) return null;

    const leaderboard = await this.computeLeaderboard(sessionId);
    const totalStudents = session.studentSessions.length;
    const totalQuestions = session.quiz.questions.length;

    // Overall metrics
    const scores = leaderboard.map((l) => l.totalScore);
    const avgScore = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    // Question-wise statistics
    const questionStats = session.quiz.questions.map((q, qIndex) => {
      const submissionsForQ = [];
      session.studentSessions.forEach((s) => {
        const sub = s.submissions.find((sub) => sub.questionId === q.id);
        if (sub) submissionsForQ.push({ ...sub, studentName: s.name, rollNumber: s.rollNumber });
      });

      const totalResponses = submissionsForQ.length;
      const correctResponses = submissionsForQ.filter((s) => s.isCorrect).length;
      const accuracy = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;

      const responseTimes = submissionsForQ.map((s) => s.responseTimeMs);
      const avgTimeMs = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
      
      // Fastest submission
      let fastestSubmission = null;
      let fastestCorrectSubmission = null;

      if (submissionsForQ.length > 0) {
        const sortedByTime = [...submissionsForQ].sort((a, b) => a.responseTimeMs - b.responseTimeMs);
        fastestSubmission = {
          studentName: sortedByTime[0].studentName,
          rollNumber: sortedByTime[0].rollNumber,
          responseTimeSec: Number((sortedByTime[0].responseTimeMs / 1000).toFixed(2)),
          isCorrect: sortedByTime[0].isCorrect
        };

        const correctSubs = sortedByTime.filter((s) => s.isCorrect);
        if (correctSubs.length > 0) {
          fastestCorrectSubmission = {
            studentName: correctSubs[0].studentName,
            rollNumber: correctSubs[0].rollNumber,
            responseTimeSec: Number((correctSubs[0].responseTimeMs / 1000).toFixed(2))
          };
        }
      }

      // Option frequency (for MCQ/TrueFalse)
      const optionCounts = {};
      q.options.forEach((opt) => {
        optionCounts[opt.id] = {
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          count: 0
        };
      });

      submissionsForQ.forEach((s) => {
        if (s.selectedOptionIds) {
          try {
            const ids = JSON.parse(s.selectedOptionIds);
            (Array.isArray(ids) ? ids : [ids]).forEach((id) => {
              if (optionCounts[id]) optionCounts[id].count++;
            });
          } catch (_) {}
        }
      });

      return {
        questionId: q.id,
        questionIndex: qIndex + 1,
        type: q.type,
        text: q.text,
        marks: q.marks,
        totalResponses,
        correctResponses,
        accuracy,
        avgTimeSec: Number((avgTimeMs / 1000).toFixed(2)),
        fastestSubmission,
        fastestCorrectSubmission,
        optionCounts: Object.values(optionCounts)
      };
    });

    // Identify hardest & easiest question
    let easiestQuestion = null;
    let hardestQuestion = null;
    if (questionStats.length > 0) {
      const sortedByAccuracy = [...questionStats].sort((a, b) => b.accuracy - a.accuracy);
      easiestQuestion = sortedByAccuracy[0];
      hardestQuestion = sortedByAccuracy[sortedByAccuracy.length - 1];
    }

    return {
      session: {
        id: session.id,
        code: session.code,
        status: session.status,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
        quizTitle: session.quiz.title
      },
      summary: {
        totalStudents,
        totalQuestions,
        avgScore,
        highestScore,
        lowestScore,
        easiestQuestion: easiestQuestion ? { index: easiestQuestion.questionIndex, accuracy: easiestQuestion.accuracy } : null,
        hardestQuestion: hardestQuestion ? { index: hardestQuestion.questionIndex, accuracy: hardestQuestion.accuracy } : null
      },
      leaderboard,
      questionStats
    };
  }

  /**
   * Build CSV string for export
   */
  async exportResultsCsv(sessionId) {
    const analytics = await this.getSessionAnalytics(sessionId);
    if (!analytics) throw new Error('Session not found');

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: { orderBy: { order: 'asc' } }
          }
        },
        studentSessions: {
          include: {
            submissions: true
          }
        }
      }
    });

    const questions = session.quiz.questions;

    // Build CSV Headers
    const headers = [
      'Rank',
      'Roll Number',
      'Student Name',
      'Total Score',
      'Correct Answers',
      'Wrong Answers',
      'Avg Response Time (s)',
      'Tab Switches'
    ];

    questions.forEach((q, idx) => {
      headers.push(`Q${idx + 1} Status`);
      headers.push(`Q${idx + 1} Time (s)`);
    });

    const rows = [headers.join(',')];

    analytics.leaderboard.forEach((student) => {
      const studentSession = session.studentSessions.find((s) => s.id === student.studentSessionId);
      const row = [
        student.rank,
        `"${student.rollNumber}"`,
        `"${student.name}"`,
        student.totalScore,
        student.totalCorrect,
        student.totalWrong,
        student.avgResponseTimeSec,
        student.tabSwitchCount
      ];

      questions.forEach((q) => {
        const sub = studentSession?.submissions.find((s) => s.questionId === q.id);
        if (sub) {
          row.push(sub.isCorrect ? 'Correct' : 'Wrong');
          row.push((sub.responseTimeMs / 1000).toFixed(2));
        } else {
          row.push('Not Answered');
          row.push('0.00');
        }
      });

      rows.push(row.join(','));
    });

    return rows.join('\n');
  }
}

export const analyticsService = new AnalyticsService();
