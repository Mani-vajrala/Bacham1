import { prisma } from '../config.js';
import { analyticsService } from '../services/analyticsService.js';

// Helper to generate readable 5-character quiz codes
const generateQuizCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous I, 1, O, 0
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createSession = async (req, res) => {
  try {
    const { quizId } = req.body;

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, professorId: req.professor.id },
      include: {
        questions: {
          include: { options: true, testCases: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    if (quiz.questions.length === 0) {
      return res.status(400).json({ message: 'Cannot start a quiz without questions. Please add questions first.' });
    }

    // Generate unique quiz code
    let code = generateQuizCode();
    let codeExists = await prisma.quizSession.findUnique({ where: { code } });
    while (codeExists) {
      code = generateQuizCode();
      codeExists = await prisma.quizSession.findUnique({ where: { code } });
    }

    const session = await prisma.quizSession.create({
      data: {
        quizId: quiz.id,
        code,
        status: 'LOBBY',
        currentQuestionIndex: -1,
        isLeaderboardVisible: quiz.showLeaderboardLive
      },
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
        }
      }
    });

    res.status(201).json({ message: 'Live quiz session created.', session });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create quiz session.', error: error.message });
  }
};

export const getSessionByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = (code || '').trim().toUpperCase();

    const session = await prisma.quizSession.findUnique({
      where: { code: cleanCode },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
            timeLimit: true,
            allowCopyPaste: true,
            professor: {
              select: { name: true, department: true }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Quiz session not found with code ' + cleanCode });
    }

    if (session.status === 'ENDED') {
      return res.status(400).json({ message: 'This quiz has already ended.' });
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve session.', error: error.message });
  }
};

export const getSessionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.quizSession.findUnique({
      where: { id },
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
                codingSubmission: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve session details.', error: error.message });
  }
};

export const endSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.quizSession.update({
      where: { id },
      data: {
        status: 'ENDED',
        endedAt: new Date()
      }
    });

    // Compute & persist final leaderboard rankings to Result table
    const leaderboard = await analyticsService.computeLeaderboard(id);

    for (const entry of leaderboard) {
      await prisma.result.upsert({
        where: {
          sessionId_studentSessionId: {
            sessionId: id,
            studentSessionId: entry.studentSessionId
          }
        },
        update: {
          totalScore: entry.totalScore,
          totalCorrect: entry.totalCorrect,
          totalWrong: entry.totalWrong,
          totalTimeMs: entry.totalTimeMs,
          avgResponseTimeMs: entry.avgResponseTimeMs,
          rank: entry.rank
        },
        create: {
          sessionId: id,
          studentSessionId: entry.studentSessionId,
          totalScore: entry.totalScore,
          totalCorrect: entry.totalCorrect,
          totalWrong: entry.totalWrong,
          totalTimeMs: entry.totalTimeMs,
          avgResponseTimeMs: entry.avgResponseTimeMs,
          rank: entry.rank
        }
      });
    }

    res.json({ message: 'Quiz session ended successfully.', session, leaderboard });
  } catch (error) {
    res.status(500).json({ message: 'Failed to end session.', error: error.message });
  }
};

export const getSessionAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const analytics = await analyticsService.getSessionAnalytics(id);

    if (!analytics) {
      return res.status(404).json({ message: 'Session analytics not found.' });
    }

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve analytics.', error: error.message });
  }
};

export const exportSessionCsv = async (req, res) => {
  try {
    const { id } = req.params;
    const csvContent = await analyticsService.exportResultsCsv(id);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=quiz_results_${id}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Failed to export CSV.', error: error.message });
  }
};
