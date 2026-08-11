import { prisma } from '../config.js';

export const getQuizzes = async (req, res) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { professorId: req.professor.id },
      include: {
        questions: {
          include: {
            options: true,
            testCases: true
          },
          orderBy: { order: 'asc' }
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ quizzes });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve quizzes.', error: error.message });
  }
};

export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await prisma.quiz.findFirst({
      where: {
        id,
        professorId: req.professor.id
      },
      include: {
        questions: {
          include: {
            options: { orderBy: { order: 'asc' } },
            testCases: true
          },
          orderBy: { order: 'asc' }
        },
        sessions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    res.json({ quiz });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve quiz.', error: error.message });
  }
};

export const createQuiz = async (req, res) => {
  try {
    const {
      title,
      description,
      timeLimit = 30,
      shuffleOptions = false,
      shuffleQuestions = false,
      allowCopyPaste = true,
      showLeaderboardLive = true,
      questions = []
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Quiz title is required.' });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        timeLimit: Number(timeLimit),
        shuffleOptions: Boolean(shuffleOptions),
        shuffleQuestions: Boolean(shuffleQuestions),
        allowCopyPaste: Boolean(allowCopyPaste),
        showLeaderboardLive: Boolean(showLeaderboardLive),
        professorId: req.professor.id,
        questions: {
          create: questions.map((q, idx) => ({
            order: q.order !== undefined ? q.order : idx,
            type: q.type || 'MCQ',
            text: q.text,
            codeSnippet: q.codeSnippet || null,
            marks: q.marks ? Number(q.marks) : 1,
            timeLimit: q.timeLimit ? Number(q.timeLimit) : null,
            acceptedAnswers: q.acceptedAnswers ? (typeof q.acceptedAnswers === 'string' ? q.acceptedAnswers : JSON.stringify(q.acceptedAnswers)) : null,
            explanation: q.explanation || null,
            starterCode: q.starterCode || null,
            codingLanguage: q.codingLanguage || 'python',
            options: q.options
              ? {
                  create: q.options.map((opt, optIdx) => ({
                    text: opt.text,
                    isCorrect: Boolean(opt.isCorrect),
                    order: opt.order !== undefined ? opt.order : optIdx
                  }))
                }
              : undefined,
            testCases: q.testCases
              ? {
                  create: q.testCases.map((tc) => ({
                    input: tc.input || '',
                    expectedOutput: tc.expectedOutput || '',
                    isHidden: Boolean(tc.isHidden),
                    explanation: tc.explanation || null
                  }))
                }
              : undefined
          }))
        }
      },
      include: {
        questions: {
          include: {
            options: true,
            testCases: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    res.status(201).json({ message: 'Quiz created successfully.', quiz });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create quiz.', error: error.message });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      timeLimit,
      shuffleOptions,
      shuffleQuestions,
      allowCopyPaste,
      showLeaderboardLive,
      questions
    } = req.body;

    const existingQuiz = await prisma.quiz.findFirst({
      where: { id, professorId: req.professor.id }
    });

    if (!existingQuiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    // Update basic quiz properties
    await prisma.quiz.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingQuiz.title,
        description: description !== undefined ? description : existingQuiz.description,
        timeLimit: timeLimit !== undefined ? Number(timeLimit) : existingQuiz.timeLimit,
        shuffleOptions: shuffleOptions !== undefined ? Boolean(shuffleOptions) : existingQuiz.shuffleOptions,
        shuffleQuestions: shuffleQuestions !== undefined ? Boolean(shuffleQuestions) : existingQuiz.shuffleQuestions,
        allowCopyPaste: allowCopyPaste !== undefined ? Boolean(allowCopyPaste) : existingQuiz.allowCopyPaste,
        showLeaderboardLive: showLeaderboardLive !== undefined ? Boolean(showLeaderboardLive) : existingQuiz.showLeaderboardLive
      }
    });

    // If questions array is provided, sync questions
    if (questions && Array.isArray(questions)) {
      // Remove old questions to replace with updated ones
      await prisma.question.deleteMany({ where: { quizId: id } });

      for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];
        await prisma.question.create({
          data: {
            quizId: id,
            order: q.order !== undefined ? q.order : idx,
            type: q.type || 'MCQ',
            text: q.text,
            codeSnippet: q.codeSnippet || null,
            marks: q.marks ? Number(q.marks) : 1,
            timeLimit: q.timeLimit ? Number(q.timeLimit) : null,
            acceptedAnswers: q.acceptedAnswers ? (typeof q.acceptedAnswers === 'string' ? q.acceptedAnswers : JSON.stringify(q.acceptedAnswers)) : null,
            explanation: q.explanation || null,
            starterCode: q.starterCode || null,
            codingLanguage: q.codingLanguage || 'python',
            options: q.options
              ? {
                  create: q.options.map((opt, optIdx) => ({
                    text: opt.text,
                    isCorrect: Boolean(opt.isCorrect),
                    order: opt.order !== undefined ? opt.order : optIdx
                  }))
                }
              : undefined,
            testCases: q.testCases
              ? {
                  create: q.testCases.map((tc) => ({
                    input: tc.input || '',
                    expectedOutput: tc.expectedOutput || '',
                    isHidden: Boolean(tc.isHidden),
                    explanation: tc.explanation || null
                  }))
                }
              : undefined
          }
        });
      }
    }

    const updatedQuiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            options: { orderBy: { order: 'asc' } },
            testCases: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    res.json({ message: 'Quiz updated successfully.', quiz: updatedQuiz });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update quiz.', error: error.message });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await prisma.quiz.findFirst({
      where: { id, professorId: req.professor.id }
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    await prisma.quiz.delete({ where: { id } });
    res.json({ message: 'Quiz deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete quiz.', error: error.message });
  }
};

export const duplicateQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const sourceQuiz = await prisma.quiz.findFirst({
      where: { id, professorId: req.professor.id },
      include: {
        questions: {
          include: {
            options: true,
            testCases: true
          }
        }
      }
    });

    if (!sourceQuiz) {
      return res.status(404).json({ message: 'Source quiz not found.' });
    }

    const duplicated = await prisma.quiz.create({
      data: {
        title: `${sourceQuiz.title} (Copy)`,
        description: sourceQuiz.description,
        timeLimit: sourceQuiz.timeLimit,
        shuffleOptions: sourceQuiz.shuffleOptions,
        shuffleQuestions: sourceQuiz.shuffleQuestions,
        allowCopyPaste: sourceQuiz.allowCopyPaste,
        showLeaderboardLive: sourceQuiz.showLeaderboardLive,
        professorId: req.professor.id,
        questions: {
          create: sourceQuiz.questions.map((q) => ({
            order: q.order,
            type: q.type,
            text: q.text,
            codeSnippet: q.codeSnippet,
            marks: q.marks,
            timeLimit: q.timeLimit,
            acceptedAnswers: q.acceptedAnswers,
            explanation: q.explanation,
            starterCode: q.starterCode,
            codingLanguage: q.codingLanguage,
            options: {
              create: q.options.map((opt) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
                order: opt.order
              }))
            },
            testCases: {
              create: q.testCases.map((tc) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden,
                explanation: tc.explanation
              }))
            }
          }))
        }
      },
      include: {
        questions: {
          include: { options: true, testCases: true }
        }
      }
    });

    res.status(201).json({ message: 'Quiz duplicated successfully.', quiz: duplicated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to duplicate quiz.', error: error.message });
  }
};
