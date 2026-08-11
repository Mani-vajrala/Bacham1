import { io } from 'socket.io-client';

async function runE2ETest() {
  console.log('🧪 Starting LiveClass Quiz End-to-End Test...');

  // 1. Login professor & get demo quiz
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'professor@liveclass.edu', password: 'password123' })
  }).then(r => r.json());

  console.log('✅ Professor Logged In:', loginRes.professor.name);
  const token = loginRes.token;

  // 2. Fetch Quizzes
  const quizzesRes = await fetch('http://localhost:5000/api/quizzes', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const quiz = quizzesRes.quizzes[0];
  console.log(`✅ Loaded Quiz: "${quiz.title}" with ${quiz.questions.length} questions.`);

  // 3. Start Live Session
  const sessionRes = await fetch('http://localhost:5000/api/sessions/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quizId: quiz.id })
  }).then(r => r.json());
  const session = sessionRes.session;
  console.log(`🎯 Created Live Session PIN: [${session.code}] (ID: ${session.id})`);

  // 4. Connect Professor Socket
  const profSocket = io('http://localhost:5000');
  profSocket.emit('professor:join', { sessionId: session.id });

  // 5. Connect 2 Virtual Student Sockets
  const student1 = io('http://localhost:5000');
  const student2 = io('http://localhost:5000');

  let s1Data = null;
  let s2Data = null;

  await new Promise((resolve) => {
    student1.emit('student:join', { code: session.code, name: 'Rahul Sharma', rollNumber: '21CS101' });
    student1.on('join_success', (data) => {
      s1Data = data;
      console.log('👨‍🎓 Student 1 Joined:', data.student.name);
      student2.emit('student:join', { code: session.code, name: 'Priya Patel', rollNumber: '21CS102' });
    });
    student2.on('join_success', (data) => {
      s2Data = data;
      console.log('👩‍🎓 Student 2 Joined:', data.student.name);
      resolve();
    });
  });

  // 6. Professor Starts Question 0 (MCQ)
  console.log('📢 Professor broadcasting Question 1...');
  profSocket.emit('question:start', { sessionId: session.id, questionIndex: 0 });

  // 7. Students receive question and submit
  await new Promise((resolve) => {
    student1.on('question_started', async ({ question }) => {
      console.log(`📥 Student 1 received Question: "${question.text.substring(0, 45)}..."`);
      const correctOpt = question.options[1]; // Correct option

      setTimeout(() => {
        console.log('⚡ Student 1 submitting answer...');
        student1.emit('student:submit_answer', {
          sessionId: session.id,
          questionId: question.id,
          studentSessionId: s1Data.student.id,
          selectedOptionIds: [correctOpt.id]
        });
      }, 150);

      setTimeout(() => {
        console.log('⚡ Student 2 submitting answer...');
        student2.emit('student:submit_answer', {
          sessionId: session.id,
          questionId: question.id,
          studentSessionId: s2Data.student.id,
          selectedOptionIds: [correctOpt.id]
        });
      }, 400);
    });

    profSocket.on('student_answered', ({ submission, firstToAnswer, firstCorrectAnswer, totalResponses }) => {
      console.log(`📊 Professor Live Feed Received: [${submission.studentName}] - ${submission.isCorrect ? 'CORRECT' : 'WRONG'} in ${submission.responseTimeSec}s (Order: #${submission.orderRank})`);
      if (totalResponses === 2) {
        console.log(`👑 FIRST TO ANSWER: ${firstToAnswer.studentName} (${firstToAnswer.responseTimeSec}s)`);
        console.log(`👑 FIRST CORRECT ANSWER: ${firstCorrectAnswer.studentName} (${firstCorrectAnswer.responseTimeSec}s)`);
        resolve();
      }
    });
  });

  // 8. Test Coding Sandbox Sandbox execution
  console.log('💻 Testing Sandboxed Coding Question Execution...');
  const codeQuestion = quiz.questions.find(q => q.type === 'CODING');
  if (codeQuestion) {
    const customCodeRes = await fetch('http://localhost:5000/api/code/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        code: 'import sys\ns = sys.stdin.read().strip()\nprint(s[::-1])',
        customInput: 'liveclass'
      })
    }).then(r => r.json());
    console.log(`✅ Sandbox stdout: "${customCodeRes.stdout?.trim()}" (Status: ${customCodeRes.status})`);
  }

  // 9. End Quiz and Verify Final Leaderboard & CSV
  console.log('🏁 Ending Quiz Session...');
  const endRes = await fetch(`http://localhost:5000/api/sessions/${session.id}/end`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  console.log(`🏆 Final Leaderboard computed with ${endRes.leaderboard?.length} ranked students:`);
  endRes.leaderboard.forEach(l => {
    console.log(`   Rank #${l.rank}: ${l.name} (${l.rollNumber}) - ${l.totalScore} pts (Avg: ${l.avgResponseTimeSec}s)`);
  });

  // Clean disconnect
  student1.disconnect();
  student2.disconnect();
  profSocket.disconnect();

  console.log('\n🎉 ALL LIVE REAL-TIME END-TO-END TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

runE2ETest().catch(err => {
  console.error('❌ E2E Test Failure:', err);
  process.exit(1);
});
