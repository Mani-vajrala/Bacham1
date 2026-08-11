import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding LiveClass Quiz database...');

  // Create demo professor
  const hashedPassword = await bcrypt.hash('password123', 10);

  const professor = await prisma.professor.upsert({
    where: { email: 'professor@liveclass.edu' },
    update: {
      name: 'Dr. Alan Turing',
      department: 'Computer Science & Engineering',
      password: hashedPassword
    },
    create: {
      name: 'Dr. Alan Turing',
      email: 'professor@liveclass.edu',
      password: hashedPassword,
      department: 'Computer Science & Engineering'
    }
  });

  console.log(`👨‍🏫 Created/Updated Professor: ${professor.name} (${professor.email})`);

  // Clear existing demo quizzes for clean state
  await prisma.quiz.deleteMany({
    where: { professorId: professor.id }
  });

  // Quiz 1: Computer Networks & Systems Test
  const quiz1 = await prisma.quiz.create({
    data: {
      title: 'Computer Networks & Systems Test',
      description: 'Comprehensive mid-term evaluation covering OSI layers, time complexities, socket fundamentals, and string algorithms.',
      professorId: professor.id,
      timeLimit: 30,
      shuffleOptions: false,
      shuffleQuestions: false,
      allowCopyPaste: true,
      showLeaderboardLive: true,
      questions: {
        create: [
          {
            order: 0,
            type: 'MCQ',
            text: 'What is the time complexity of searching for an element in a balanced Binary Search Tree (BST)?',
            codeSnippet: null,
            marks: 2,
            timeLimit: 25,
            explanation: 'In a balanced BST, the height of the tree is log2(n), leading to O(log n) comparison steps.',
            options: {
              create: [
                { text: 'O(n)', isCorrect: false, order: 0 },
                { text: 'O(log n)', isCorrect: true, order: 1 },
                { text: 'O(n²)', isCorrect: false, order: 2 },
                { text: 'O(1)', isCorrect: false, order: 3 }
              ]
            }
          },
          {
            order: 1,
            type: 'MULTI_MCQ',
            text: 'Which of the following protocols operate at the Transport Layer of the OSI model?',
            codeSnippet: null,
            marks: 3,
            timeLimit: 30,
            explanation: 'TCP (Transmission Control Protocol) and UDP (User Datagram Protocol) operate at Layer 4 (Transport Layer). IP is Layer 3 (Network) and HTTP is Layer 7 (Application).',
            options: {
              create: [
                { text: 'TCP (Transmission Control Protocol)', isCorrect: true, order: 0 },
                { text: 'IP (Internet Protocol)', isCorrect: false, order: 1 },
                { text: 'UDP (User Datagram Protocol)', isCorrect: true, order: 2 },
                { text: 'HTTP (Hypertext Transfer Protocol)', isCorrect: false, order: 3 }
              ]
            }
          },
          {
            order: 2,
            type: 'FILL_BLANK',
            text: 'The time complexity of binary search algorithm on a sorted array of size n is ______.',
            marks: 2,
            timeLimit: 25,
            acceptedAnswers: JSON.stringify(['O(log n)', 'O(logn)', 'log n', 'logn', 'O(log(n))', 'log(n)']),
            explanation: 'Binary search halves the search space at each iteration, resulting in logarithmic time complexity O(log n).'
          },
          {
            order: 3,
            type: 'TRUE_FALSE',
            text: 'TCP (Transmission Control Protocol) is a connection-oriented and reliable byte-stream protocol.',
            marks: 1,
            timeLimit: 20,
            explanation: 'True. TCP establishes a 3-way handshake connection before transmitting data with delivery guarantees.',
            options: {
              create: [
                { text: 'True', isCorrect: true, order: 0 },
                { text: 'False', isCorrect: false, order: 1 }
              ]
            }
          },
          {
            order: 4,
            type: 'CODING',
            text: 'Write a program that reads a string from standard input and prints the reversed string to standard output.',
            marks: 5,
            timeLimit: 60,
            codingLanguage: 'python',
            starterCode: `# Reverse a String\nimport sys\n\ndef main():\n    line = sys.stdin.read().strip()\n    # TODO: Print reversed string\n    print(line[::-1])\n\nif __name__ == '__main__':\n    main()\n`,
            explanation: 'Reversing a string can be achieved using two pointers or slice notation [::-1] in O(n) time.',
            testCases: {
              create: [
                {
                  input: 'hello',
                  expectedOutput: 'olleh',
                  isHidden: false,
                  explanation: 'Reversing "hello" produces "olleh"'
                },
                {
                  input: 'world',
                  expectedOutput: 'dlrow',
                  isHidden: true,
                  explanation: 'Hidden test 1'
                },
                {
                  input: 'college',
                  expectedOutput: 'egelloc',
                  isHidden: true,
                  explanation: 'Hidden test 2'
                },
                {
                  input: 'programming',
                  expectedOutput: 'gnimmargorp',
                  isHidden: true,
                  explanation: 'Hidden test 3'
                }
              ]
            }
          },
          {
            order: 5,
            type: 'SHORT_ANSWER',
            text: 'Explain polymorphism in object-oriented programming in one or two sentences.',
            marks: 2,
            timeLimit: 40,
            acceptedAnswers: JSON.stringify(['many forms', 'overriding', 'overloading', 'interface', 'same method']),
            explanation: 'Polymorphism allows objects of different classes to be treated as objects of a common superclass, commonly implemented through method overriding and overloading.'
          }
        ]
      }
    }
  });

  console.log(`✅ Created Quiz: ${quiz1.title} with 6 question types.`);
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
