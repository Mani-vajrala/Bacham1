import { prisma } from '../config.js';
import { evaluationService } from '../services/evaluationService.js';
import { analyticsService } from '../services/analyticsService.js';

export function setupQuizSocket(io) {
  // In-memory state tracker for active questions and high-precision timing
  const activeQuestions = new Map(); // sessionId -> { questionId, startTime, timerInterval, remainingSec, isPaused, answersReceived: [] }

  io.on('connection', (socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // PROFESSOR JOINS LIVE CONTROL ROOM
    socket.on('professor:join', async ({ sessionId }) => {
      try {
        socket.join(`session_${sessionId}`);
        socket.join(`session_${sessionId}_professor`);
        socket.sessionId = sessionId;
        socket.role = 'PROFESSOR';

        const session = await prisma.quizSession.findUnique({
          where: { id: sessionId },
          include: {
            quiz: {
              include: {
                questions: {
                  include: { options: true, testCases: true },
                  orderBy: { order: 'asc' }
                }
              }
            },
            studentSessions: true
          }
        });

        if (session) {
          const activeState = activeQuestions.get(sessionId);
          socket.emit('session_state', {
            session,
            activeQuestion: activeState || null
          });
        }
      } catch (err) {
        socket.emit('error_message', { message: 'Failed to join session as professor: ' + err.message });
      }
    });

    // STUDENT JOINS LIVE ROOM
    socket.on('student:join', async ({ code, name, rollNumber }) => {
      try {
        const cleanCode = (code || '').trim().toUpperCase();
        const cleanName = (name || '').trim();
        const cleanRoll = (rollNumber || '').trim().toUpperCase();

        if (!cleanCode || !cleanName || !cleanRoll) {
          return socket.emit('join_error', { message: 'Code, Name, and Roll Number are required.' });
        }

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
                professor: { select: { name: true, department: true } }
              }
            }
          }
        });

        if (!session) {
          return socket.emit('join_error', { message: 'Quiz session not found with code ' + cleanCode });
        }

        if (session.status === 'ENDED') {
          return socket.emit('join_error', { message: 'This quiz has ended.' });
        }

        // Upsert student session (One active session per roll number)
        const studentSession = await prisma.studentSession.upsert({
          where: {
            sessionId_rollNumber: {
              sessionId: session.id,
              rollNumber: cleanRoll
            }
          },
          update: {
            name: cleanName,
            socketId: socket.id,
            isOnline: true,
            lastActiveAt: new Date()
          },
          create: {
            sessionId: session.id,
            rollNumber: cleanRoll,
            name: cleanName,
            socketId: socket.id,
            isOnline: true
          }
        });

        socket.sessionId = session.id;
        socket.studentSessionId = studentSession.id;
        socket.rollNumber = cleanRoll;
        socket.studentName = cleanName;
        socket.role = 'STUDENT';

        socket.join(`session_${session.id}`);

        // Broadcast to room that student joined
        const totalOnline = await prisma.studentSession.count({
          where: { sessionId: session.id, isOnline: true }
        });

        io.to(`session_${session.id}`).emit('student_joined', {
          student: {
            id: studentSession.id,
            name: cleanName,
            rollNumber: cleanRoll,
            isOnline: true
          },
          totalOnline
        });

        // Send confirmation to student
        const activeState = activeQuestions.get(session.id);
        socket.emit('join_success', {
          student: studentSession,
          session: {
            id: session.id,
            code: session.code,
            status: session.status,
            currentQuestionIndex: session.currentQuestionIndex,
            quiz: session.quiz
          },
          activeQuestion: activeState ? {
            ...activeState.sanitizedQuestion,
            remainingSec: activeState.remainingSec,
            startTime: activeState.startTime
          } : null
        });
      } catch (err) {
        socket.emit('join_error', { message: 'Join failed: ' + err.message });
      }
    });

    // PROFESSOR STARTS QUIZ
    socket.on('quiz:start', async ({ sessionId }) => {
      try {
        const session = await prisma.quizSession.update({
          where: { id: sessionId },
          data: {
            status: 'ACTIVE',
            serverStartTime: new Date()
          }
        });

        io.to(`session_${sessionId}`).emit('quiz_started', { session });
      } catch (err) {
        socket.emit('error_message', { message: 'Failed to start quiz: ' + err.message });
      }
    });

    // PROFESSOR STARTS A SPECIFIC QUESTION
    socket.on('question:start', async ({ sessionId, questionIndex }) => {
      try {
        const session = await prisma.quizSession.findUnique({
          where: { id: sessionId },
          include: {
            quiz: {
              include: {
                questions: {
                  include: { options: true, testCases: true },
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        });

        if (!session || !session.quiz.questions[questionIndex]) {
          return socket.emit('error_message', { message: 'Invalid question index.' });
        }

        const question = session.quiz.questions[questionIndex];
        const serverStartTime = new Date();
        const timeLimit = question.timeLimit || session.quiz.timeLimit || 30;

        // Update session in DB
        await prisma.quizSession.update({
          where: { id: sessionId },
          data: {
            status: 'ACTIVE',
            currentQuestionIndex: questionIndex,
            questionStartTime: serverStartTime
          }
        });

        // Clear any previous timer for this session
        const prevState = activeQuestions.get(sessionId);
        if (prevState && prevState.timerInterval) {
          clearInterval(prevState.timerInterval);
        }

        // Prepare student-safe question payload (NO isCorrect, NO hidden test cases)
        const sanitizedQuestion = {
          id: question.id,
          quizId: question.quizId,
          order: question.order,
          type: question.type,
          text: question.text,
          codeSnippet: question.codeSnippet,
          marks: question.marks,
          timeLimit,
          starterCode: question.starterCode,
          codingLanguage: question.codingLanguage,
          options: (question.options || []).map((o) => ({
            id: o.id,
            text: o.text,
            order: o.order
          })),
          publicTestCases: (question.testCases || [])
            .filter((tc) => !tc.isHidden)
            .map((tc) => ({
              id: tc.id,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              explanation: tc.explanation
            }))
        };

        const activeState = {
          questionId: question.id,
          questionIndex,
          fullQuestion: question,
          sanitizedQuestion,
          startTime: serverStartTime.getTime(),
          timeLimit,
          remainingSec: timeLimit,
          isPaused: false,
          answersReceived: [], // list of submissions in real-time order
          timerInterval: null
        };

        // Start server timer loop
        activeState.timerInterval = setInterval(() => {
          if (!activeState.isPaused) {
            activeState.remainingSec--;

            io.to(`session_${sessionId}`).emit('timer_tick', {
              remainingSec: activeState.remainingSec,
              timeLimit: activeState.timeLimit
            });

            if (activeState.remainingSec <= 0) {
              clearInterval(activeState.timerInterval);
              io.to(`session_${sessionId}`).emit('question_time_up', {
                questionId: question.id,
                questionIndex
              });
            }
          }
        }, 1000);

        activeQuestions.set(sessionId, activeState);

        // Broadcast to students and professor
        io.to(`session_${sessionId}`).emit('question_started', {
          question: sanitizedQuestion,
          questionIndex,
          totalQuestions: session.quiz.questions.length,
          startTime: serverStartTime.getTime(),
          timeLimit
        });
      } catch (err) {
        socket.emit('error_message', { message: 'Failed to start question: ' + err.message });
      }
    });

    // PROFESSOR PAUSES / RESUMES QUESTION TIMER
    socket.on('question:toggle_pause', ({ sessionId }) => {
      const activeState = activeQuestions.get(sessionId);
      if (activeState) {
        activeState.isPaused = !activeState.isPaused;
        io.to(`session_${sessionId}`).emit('timer_pause_toggled', {
          isPaused: activeState.isPaused,
          remainingSec: activeState.remainingSec
        });
      }
    });

    // PROFESSOR REVEALS ANSWERS / ENDS QUESTION
    socket.on('question:end', async ({ sessionId }) => {
      const activeState = activeQuestions.get(sessionId);
      if (activeState) {
        if (activeState.timerInterval) clearInterval(activeState.timerInterval);
        
        const question = activeState.fullQuestion;

        // Reveal correct answer data
        io.to(`session_${sessionId}`).emit('question_ended', {
          questionId: question.id,
          questionIndex: activeState.questionIndex,
          correctOptionIds: question.options.filter((o) => o.isCorrect).map((o) => o.id),
          acceptedAnswers: question.acceptedAnswers,
          explanation: question.explanation,
          testCases: question.testCases
        });
      }
    });

    // STUDENT SUBMITS ANSWER (MCQ, Multi-MCQ, Fill in blank, True/False, Short Answer, Coding)
    socket.on('student:submit_answer', async (payload) => {
      // 1. CAPTURE PRECISE SERVER TIMESTAMP FIRST!
      const receivedAt = new Date();
      const { sessionId, questionId, studentSessionId, answerText, selectedOptionIds, code, language } = payload;

      try {
        const activeState = activeQuestions.get(sessionId);
        let question = activeState?.fullQuestion;

        if (!question) {
          question = await prisma.question.findUnique({
            where: { id: questionId },
            include: { options: true, testCases: true }
          });
        }

        if (!question) {
          return socket.emit('submission_error', { message: 'Question not found.' });
        }

        // Calculate exact response time in milliseconds from server question start
        const session = await prisma.quizSession.findUnique({ where: { id: sessionId } });
        const questionStartTime = session?.questionStartTime || new Date(activeState?.startTime || Date.now());
        const responseTimeMs = Math.max(50, receivedAt.getTime() - questionStartTime.getTime());

        // Check if student already submitted for this question
        const existingSub = await prisma.submission.findUnique({
          where: {
            sessionId_studentSessionId_questionId: {
              sessionId,
              studentSessionId,
              questionId
            }
          }
        });

        if (existingSub) {
          return socket.emit('submission_error', { message: 'You have already submitted an answer for this question.' });
        }

        // 2. SERVER EVALUATION
        const evalResult = await evaluationService.evaluate(question, {
          answerText,
          selectedOptionIds,
          code,
          language
        });

        // 3. PERSIST SUBMISSION IN DB
        const submission = await prisma.submission.create({
          data: {
            sessionId,
            studentSessionId,
            questionId,
            answerText: answerText || null,
            selectedOptionIds: selectedOptionIds ? JSON.stringify(selectedOptionIds) : null,
            isCorrect: evalResult.isCorrect,
            marksAwarded: evalResult.marksAwarded,
            receivedAt,
            responseTimeMs,
            status: evalResult.status,
            codingSubmission: evalResult.codingResult
              ? {
                  create: {
                    language: evalResult.codingResult.language,
                    code: evalResult.codingResult.code,
                    testsPassed: evalResult.codingResult.testsPassed,
                    totalTests: evalResult.codingResult.totalTests,
                    executionTimeMs: evalResult.codingResult.executionTimeMs,
                    status: evalResult.codingResult.status,
                    testResults: JSON.stringify(evalResult.codingResult.testResults)
                  }
                }
              : undefined
          },
          include: {
            studentSession: true,
            codingSubmission: true
          }
        });

        // 4. UPDATE LIVE ORDER AND RANKING
        const submissionEntry = {
          submissionId: submission.id,
          studentSessionId,
          studentName: submission.studentSession.name,
          rollNumber: submission.studentSession.rollNumber,
          isCorrect: submission.isCorrect,
          marksAwarded: submission.marksAwarded,
          responseTimeMs,
          responseTimeSec: Number((responseTimeMs / 1000).toFixed(2)),
          receivedAt: receivedAt.toISOString(),
          answerSummary: answerText || (selectedOptionIds ? selectedOptionIds.join(', ') : 'Code'),
          codingResult: evalResult.codingResult || null
        };

        if (activeState) {
          activeState.answersReceived.push(submissionEntry);
        }

        // Get all submissions for this question to compute precise ranks
        const allQuestionSubmissions = await prisma.submission.findMany({
          where: { sessionId, questionId },
          include: { studentSession: true, codingSubmission: true },
          orderBy: { responseTimeMs: 'asc' }
        });

        const sortedAll = allQuestionSubmissions.map((s, idx) => ({
          submissionId: s.id,
          studentSessionId: s.studentSessionId,
          studentName: s.studentSession.name,
          rollNumber: s.studentSession.rollNumber,
          isCorrect: s.isCorrect,
          marksAwarded: s.marksAwarded,
          responseTimeMs: s.responseTimeMs,
          responseTimeSec: Number((s.responseTimeMs / 1000).toFixed(2)),
          receivedAt: s.receivedAt,
          orderRank: idx + 1,
          codingSubmission: s.codingSubmission
        }));

        const correctOnly = sortedAll.filter((s) => s.isCorrect);

        const firstToAnswer = sortedAll.length > 0 ? sortedAll[0] : null;
        const firstCorrectAnswer = correctOnly.length > 0 ? correctOnly[0] : null;

        // Current submission's specific rank
        const currentRank = sortedAll.findIndex((s) => s.submissionId === submission.id) + 1;
        const currentCorrectRank = submission.isCorrect
          ? correctOnly.findIndex((s) => s.submissionId === submission.id) + 1
          : null;

        // 5. BROADCAST LIVE TO PROFESSOR ROOM IMMEDIATELY
        io.to(`session_${sessionId}_professor`).emit('student_answered', {
          submission: {
            ...submissionEntry,
            orderRank: currentRank,
            correctRank: currentCorrectRank
          },
          allSubmissions: sortedAll,
          firstToAnswer,
          firstCorrectAnswer,
          totalResponses: sortedAll.length,
          correctResponses: correctOnly.length
        });

        // 6. CONFIRM TO STUDENT
        socket.emit('submission_confirmed', {
          submissionId: submission.id,
          responseTimeSec: submissionEntry.responseTimeSec,
          isCorrect: submission.isCorrect,
          marksAwarded: submission.marksAwarded,
          codingResult: evalResult.codingResult || null
        });

        // 7. BROADCAST LIVE LEADERBOARD UPDATE
        const updatedLeaderboard = await analyticsService.computeLeaderboard(sessionId);
        io.to(`session_${sessionId}`).emit('leaderboard_updated', {
          leaderboard: updatedLeaderboard
        });
      } catch (err) {
        console.error('[Submission Error]', err);
        socket.emit('submission_error', { message: 'Submission failed: ' + err.message });
      }
    });

    // STUDENT TAB SWITCH WARNING (ANTI-CHEAT)
    socket.on('student:tab_switch', async ({ sessionId, studentSessionId }) => {
      try {
        if (studentSessionId) {
          const updated = await prisma.studentSession.update({
            where: { id: studentSessionId },
            data: { tabSwitchCount: { increment: 1 } }
          });

          io.to(`session_${sessionId}_professor`).emit('tab_switch_alert', {
            studentId: studentSessionId,
            studentName: updated.name,
            rollNumber: updated.rollNumber,
            tabSwitchCount: updated.tabSwitchCount,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } catch (_) {}
    });

    // PROFESSOR TOGGLES LEADERBOARD VISIBILITY
    socket.on('leaderboard:toggle_visibility', async ({ sessionId, isVisible }) => {
      try {
        await prisma.quizSession.update({
          where: { id: sessionId },
          data: { isLeaderboardVisible: isVisible }
        });

        io.to(`session_${sessionId}`).emit('leaderboard_visibility_changed', { isVisible });
      } catch (_) {}
    });

    // PROFESSOR ENDS ENTIRE QUIZ
    socket.on('quiz:end', async ({ sessionId }) => {
      try {
        const activeState = activeQuestions.get(sessionId);
        if (activeState && activeState.timerInterval) {
          clearInterval(activeState.timerInterval);
        }
        activeQuestions.delete(sessionId);

        await prisma.quizSession.update({
          where: { id: sessionId },
          data: { status: 'ENDED', endedAt: new Date() }
        });

        const analytics = await analyticsService.getSessionAnalytics(sessionId);

        io.to(`session_${sessionId}`).emit('quiz_ended', {
          session: analytics.session,
          summary: analytics.summary,
          leaderboard: analytics.leaderboard
        });
      } catch (err) {
        socket.emit('error_message', { message: 'Failed to end quiz: ' + err.message });
      }
    });

    // DISCONNECT HANDLER
    socket.on('disconnect', async () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
      if (socket.sessionId && socket.studentSessionId) {
        try {
          await prisma.studentSession.update({
            where: { id: socket.studentSessionId },
            data: { isOnline: false, lastActiveAt: new Date() }
          });

          const totalOnline = await prisma.studentSession.count({
            where: { sessionId: socket.sessionId, isOnline: true }
          });

          io.to(`session_${socket.sessionId}`).emit('student_left', {
            studentSessionId: socket.studentSessionId,
            studentName: socket.studentName,
            rollNumber: socket.rollNumber,
            totalOnline
          });
        } catch (_) {}
      }
    });
  });
}
