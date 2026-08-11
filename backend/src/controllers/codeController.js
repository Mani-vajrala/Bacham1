import { sandboxService } from '../services/sandboxService.js';

export const runCustomCode = async (req, res) => {
  try {
    const { language, code, customInput } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Code cannot be empty.' });
    }

    const result = await sandboxService.runCode({
      language: language || 'python',
      code,
      customInput: customInput || ''
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Code execution failed.', error: error.message });
  }
};
