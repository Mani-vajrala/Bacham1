import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * Isolated Sandboxed Code Execution Service
 * Executes code in isolated temporary directories with strict timeouts,
 * buffer caps, and test-case comparison.
 */
class SandboxService {
  constructor() {
    this.timeoutMs = 4000; // 4 seconds max per test case
    this.maxOutputBytes = 64 * 1024; // 64 KB output limit
  }

  /**
   * Run code against custom test input or execute a test suite
   */
  async runCode({ language, code, customInput = '' }) {
    const tempDir = await this._createTempDirectory();
    try {
      const result = await this._executeSingle({
        language,
        code,
        input: customInput,
        tempDir
      });
      return result;
    } finally {
      await this._cleanupTempDirectory(tempDir);
    }
  }

  /**
   * Execute code against multiple test cases (public + hidden)
   */
  async evaluateTestCases({ language, code, testCases = [] }) {
    if (!testCases || testCases.length === 0) {
      return {
        status: 'PASSED',
        testsPassed: 0,
        totalTests: 0,
        executionTimeMs: 0,
        testResults: []
      };
    }

    const tempDir = await this._createTempDirectory();
    const testResults = [];
    let testsPassed = 0;
    let totalTime = 0;
    let overallStatus = 'PASSED';

    try {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const singleResult = await this._executeSingle({
          language,
          code,
          input: tc.input || '',
          tempDir
        });

        totalTime += singleResult.executionTimeMs || 0;

        const normalizedActual = (singleResult.stdout || '').trim().replace(/\r\n/g, '\n');
        const normalizedExpected = (tc.expectedOutput || '').trim().replace(/\r\n/g, '\n');
        const passed = singleResult.status === 'SUCCESS' && normalizedActual === normalizedExpected;

        if (passed) {
          testsPassed++;
        } else if (overallStatus === 'PASSED') {
          if (singleResult.status === 'TIMEOUT') overallStatus = 'TIMEOUT';
          else if (singleResult.status === 'ERROR') overallStatus = 'RUNTIME_ERROR';
          else overallStatus = 'FAILED';
        }

        testResults.push({
          testCaseId: tc.id || `tc_${i + 1}`,
          index: i + 1,
          input: tc.isHidden ? '[Hidden Test Case]' : tc.input,
          expected: tc.isHidden ? '[Hidden Expected Output]' : tc.expectedOutput,
          actual: tc.isHidden && !passed ? '[Hidden Result]' : singleResult.stdout,
          passed,
          isHidden: !!tc.isHidden,
          status: singleResult.status,
          error: singleResult.stderr || singleResult.error || null,
          executionTimeMs: singleResult.executionTimeMs
        });
      }

      return {
        status: testsPassed === testCases.length ? 'PASSED' : overallStatus,
        testsPassed,
        totalTests: testCases.length,
        executionTimeMs: totalTime,
        testResults
      };
    } finally {
      await this._cleanupTempDirectory(tempDir);
    }
  }

  async _executeSingle({ language, code, input, tempDir }) {
    const lang = (language || '').toLowerCase();
    const startTime = Date.now();

    try {
      switch (lang) {
        case 'javascript':
        case 'js':
          return await this._runNode(code, input, tempDir);
        case 'python':
        case 'py':
        case 'python3':
          return await this._runPython(code, input, tempDir);
        case 'cpp':
        case 'c++':
          return await this._runCpp(code, input, tempDir);
        case 'c':
          return await this._runC(code, input, tempDir);
        case 'java':
          return await this._runJava(code, input, tempDir);
        default:
          return {
            status: 'ERROR',
            stdout: '',
            stderr: `Unsupported language: ${language}`,
            executionTimeMs: 0
          };
      }
    } catch (err) {
      return {
        status: 'ERROR',
        stdout: '',
        stderr: err.message,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  async _runNode(code, input, tempDir) {
    const filePath = path.join(tempDir, 'solution.cjs');
    // Wrap to handle stdin comfortably
    await fs.writeFile(filePath, code, 'utf8');
    return await this._spawnProcess('node', [filePath], input, tempDir);
  }

  async _runPython(code, input, tempDir) {
    const filePath = path.join(tempDir, 'solution.py');
    await fs.writeFile(filePath, code, 'utf8');

    // Try python3 first, fallback to python
    const py3Res = await this._spawnProcess('python3', ['-u', filePath], input, tempDir);
    if (py3Res.status !== 'ERROR' || !py3Res.stderr.includes('ENOENT')) {
      return py3Res;
    }
    return await this._spawnProcess('python', ['-u', filePath], input, tempDir);
  }

  async _runCpp(code, input, tempDir) {
    const srcPath = path.join(tempDir, 'solution.cpp');
    const exePath = path.join(tempDir, os.platform() === 'win32' ? 'solution.exe' : 'solution');
    await fs.writeFile(srcPath, code, 'utf8');

    // Compile
    const compileResult = await this._spawnProcess('g++', ['-O2', srcPath, '-o', exePath], '', tempDir);
    if (compileResult.status !== 'SUCCESS') {
      return {
        status: 'COMPILATION_ERROR',
        stdout: compileResult.stdout,
        stderr: compileResult.stderr,
        executionTimeMs: compileResult.executionTimeMs
      };
    }

    return await this._spawnProcess(exePath, [], input, tempDir);
  }

  async _runC(code, input, tempDir) {
    const srcPath = path.join(tempDir, 'solution.c');
    const exePath = path.join(tempDir, os.platform() === 'win32' ? 'solution.exe' : 'solution');
    await fs.writeFile(srcPath, code, 'utf8');

    const compileResult = await this._spawnProcess('gcc', ['-O2', srcPath, '-o', exePath], '', tempDir);
    if (compileResult.status !== 'SUCCESS') {
      return {
        status: 'COMPILATION_ERROR',
        stdout: compileResult.stdout,
        stderr: compileResult.stderr,
        executionTimeMs: compileResult.executionTimeMs
      };
    }

    return await this._spawnProcess(exePath, [], input, tempDir);
  }

  async _runJava(code, input, tempDir) {
    // Extract Main class name or default to Solution
    const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
    const className = classMatch ? classMatch[1] : 'Solution';
    const srcPath = path.join(tempDir, `${className}.java`);
    await fs.writeFile(srcPath, code, 'utf8');

    const compileResult = await this._spawnProcess('javac', [srcPath], '', tempDir);
    if (compileResult.status !== 'SUCCESS') {
      return {
        status: 'COMPILATION_ERROR',
        stdout: compileResult.stdout,
        stderr: compileResult.stderr,
        executionTimeMs: compileResult.executionTimeMs
      };
    }

    return await this._spawnProcess('java', ['-cp', tempDir, className], input, tempDir);
  }

  _spawnProcess(command, args, input = '', cwd) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const proc = spawn(command, args, {
        cwd,
        env: {
          PATH: process.env.PATH,
          TEMP: cwd,
          TMP: cwd
        },
        windowsHide: true
      });

      const timer = setTimeout(() => {
        isTimedOut = true;
        try {
          proc.kill('SIGKILL');
        } catch (_) {}
        resolve({
          status: 'TIMEOUT',
          stdout: stdout.slice(0, this.maxOutputBytes),
          stderr: 'Execution timed out (limit exceeded)',
          executionTimeMs: Date.now() - startTime
        });
      }, this.timeoutMs);

      if (proc.stdin) {
        if (input) {
          proc.stdin.write(input);
          if (!input.endsWith('\n')) proc.stdin.write('\n');
        }
        proc.stdin.end();
      }

      proc.stdout.on('data', (chunk) => {
        if (stdout.length < this.maxOutputBytes) {
          stdout += chunk.toString();
        }
      });

      proc.stderr.on('data', (chunk) => {
        if (stderr.length < this.maxOutputBytes) {
          stderr += chunk.toString();
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        if (!isTimedOut) {
          resolve({
            status: 'ERROR',
            stdout,
            stderr: `Process launch error: ${err.message}`,
            executionTimeMs: Date.now() - startTime
          });
        }
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (isTimedOut) return;

        resolve({
          status: code === 0 ? 'SUCCESS' : 'ERROR',
          stdout: stdout.slice(0, this.maxOutputBytes),
          stderr: stderr.slice(0, this.maxOutputBytes),
          executionTimeMs: Date.now() - startTime
        });
      });
    });
  }

  async _createTempDirectory() {
    const randomId = crypto.randomBytes(8).toString('hex');
    const tempDir = path.join(os.tmpdir(), `liveclass_sandbox_${randomId}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  async _cleanupTempDirectory(dirPath) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (_) {}
  }
}

export const sandboxService = new SandboxService();
