
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { AIConfig, MarkdownFile, GraphData, Quiz } from "../types";

// Default configuration
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// Initialize Gemini Client
const getClient = (apiKey?: string) => new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });

// --- Function Declarations for AI File Manipulation ---

const createFileParams = {
  name: 'create_file',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: "Name of the file (e.g. 'notes.md')" },
      content: { type: Type.STRING, description: "Markdown content of the file" }
    },
    required: ['filename', 'content']
  }
};

const updateFileParams = {
  name: 'update_file',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: "Name of the file to update" },
      content: { type: Type.STRING, description: "New content to append or replace" }
    },
    required: ['filename', 'content']
  }
};

const deleteFileParams = {
  name: 'delete_file',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: "Name of the file to delete" }
    },
    required: ['filename']
  }
};

// Helper to sanitize code blocks
const cleanCodeBlock = (text: string): string => {
  return text.replace(/```[a-z]*\n/gi, '').replace(/```/g, '').trim();
};

export const generateAIResponse = async (
  prompt: string, 
  config: AIConfig, 
  systemInstruction?: string,
  jsonMode: boolean = false,
  contextFiles: MarkdownFile[] = [],
  toolsCallback?: (toolName: string, args: any) => Promise<any>
): Promise<string> => {
  
  // RAG: Inject context from files
  let fullPrompt = prompt;
  if (contextFiles.length > 0) {
    const contextStr = contextFiles.map(f => `--- File: ${f.name} ---\n${f.content}`).join('\n\n');
    const truncatedContext = contextStr.substring(0, 100000); 
    fullPrompt = `Context from user knowledge base:\n${truncatedContext}\n\nUser Query: ${prompt}`;
  }
  
  // Language Injection
  const langInstruction = config.language === 'zh' 
    ? " IMPORTANT: Respond in Chinese (Simplified) for all content, explanations, and labels." 
    : "";

  const finalSystemInstruction = (systemInstruction || "") + langInstruction;

  if (config.provider === 'gemini') {
    return callGemini(fullPrompt, config.model, finalSystemInstruction, jsonMode, toolsCallback);
  } else if (config.provider === 'ollama') {
    return callOllama(fullPrompt, config, finalSystemInstruction, jsonMode);
  } else if (config.provider === 'openai') {
    return callOpenAICompatible(fullPrompt, config, finalSystemInstruction, jsonMode);
  }
  throw new Error(`Unsupported provider: ${config.provider}`);
};

const callGemini = async (
  prompt: string, 
  modelName: string, 
  systemInstruction?: string, 
  jsonMode: boolean = false,
  toolsCallback?: (toolName: string, args: any) => Promise<any>
): Promise<string> => {
  try {
    const client = getClient();
    
    // Add tools if callback provided
    const tools = toolsCallback ? [{
      functionDeclarations: [
        createFileParams,
        updateFileParams, 
        deleteFileParams
      ] as FunctionDeclaration[]
    }] : undefined;

    const response = await client.models.generateContent({
      model: modelName || DEFAULT_GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: jsonMode ? 'application/json' : 'text/plain',
        tools: tools,
      }
    });

    // Handle Function Calls
    if (response.functionCalls && toolsCallback) {
      const calls = response.functionCalls;
      let toolOutputs: string[] = [];
      
      for (const call of calls) {
        const result = await toolsCallback(call.name, call.args);
        toolOutputs.push(`Function ${call.name} executed. Result: ${JSON.stringify(result)}`);
      }
      return toolOutputs.join('\n') + "\n\n(AI performed file operations based on your request)";
    }

    return response.text || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to communicate with Google Gemini. Please check your network or API limits.");
  }
};

const callOllama = async (prompt: string, config: AIConfig, systemInstruction?: string, jsonMode: boolean = false): Promise<string> => {
    const baseUrl = config.baseUrl || 'http://localhost:11434';
    const model = config.model || 'llama3';
    const messages = [];
    if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
    messages.push({ role: 'user', content: prompt });
  
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model, messages: messages, stream: false, format: jsonMode ? 'json' : undefined,
          options: { temperature: config.temperature }
        }),
      });
      if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
      const data = await response.json();
      return data.message?.content || '';
    } catch (error) { throw new Error("Failed to communicate with Ollama."); }
  };
  
  const callOpenAICompatible = async (prompt: string, config: AIConfig, systemInstruction?: string, jsonMode: boolean = false): Promise<string> => {
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const messages = [];
    if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
    messages.push({ role: 'user', content: prompt });
  
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey || ''}`
        },
        body: JSON.stringify({
          model: config.model, messages: messages, temperature: config.temperature,
          response_format: jsonMode ? { type: "json_object" } : undefined
        }),
      });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error: any) { throw new Error(`Failed to connect to AI provider: ${error.message}`); }
  };

export const polishContent = async (content: string, config: AIConfig): Promise<string> => {
  const systemPrompt = "You are an expert technical editor. Improve the provided Markdown content for clarity, grammar, and flow. Return only the polished Markdown.";
  return generateAIResponse(content, config, systemPrompt);
};

export const expandContent = async (content: string, config: AIConfig): Promise<string> => {
  const systemPrompt = "You are a creative technical writer. Expand on the provided Markdown content, adding relevant details, examples, or explanations. Return only the expanded Markdown.";
  return generateAIResponse(content, config, systemPrompt);
};

export const generateKnowledgeGraph = async (files: MarkdownFile[], config: AIConfig): Promise<GraphData> => {
  const combinedContent = files.map(f => `--- File: ${f.name} ---\n${f.content}`).join('\n\n');
  const prompt = `Analyze the following markdown notes. Identify key concepts (as nodes) and their relationships (as links). 
  Return a strictly valid JSON object with this structure:
  {
    "nodes": [{"id": "ConceptName", "label": "ConceptName", "val": 1}],
    "links": [{"source": "ConceptName", "target": "RelatedConceptName", "relationship": "contains"}]
  }
  Limit to the most important 20-30 nodes. Ensure source/target IDs match node IDs exactly.
  
  Content to analyze:
  ${combinedContent.substring(0, 50000)} 
  `; 
  
  const systemPrompt = "You are a Knowledge Graph extraction engine. Output JSON only.";
  
  try {
    const jsonStr = await generateAIResponse(prompt, config, systemPrompt, true);
    const cleanedJson = cleanCodeBlock(jsonStr);
    return JSON.parse(cleanedJson) as GraphData;
  } catch (e) {
    console.error("Graph Parsing Error", e);
    return {
      nodes: files.map(f => ({ id: f.name, label: f.name, val: 5 })),
      links: []
    };
  }
};

export const synthesizeKnowledgeBase = async (files: MarkdownFile[], config: AIConfig): Promise<string> => {
  const combinedContent = files.map(f => `--- File: ${f.name} ---\n${f.content}`).join('\n\n');
  const prompt = `Read the following notes from a user's knowledge base. 
  1. Organize the information into a coherent structure.
  2. Synthesize the key findings, finding connections between different notes.
  3. Produce a new comprehensive "Master Summary" in Markdown format.
  
  Notes:
  ${combinedContent.substring(0, 50000)}
  `;

  const systemPrompt = "You are a Knowledge Manager. Summarize and organize notes into a single cohesive markdown document.";
  return generateAIResponse(prompt, config, systemPrompt);
};

export const generateMindMap = async (content: string, config: AIConfig): Promise<string> => {
  // MindMap generation needs to be very strict to avoid rendering errors
  const langPrompt = config.language === 'zh' ? "Use Chinese for all node labels." : "Use English.";
  
  const prompt = `Create a Mermaid.js MindMap syntax based on the following text.
  
  RULES:
  1. Start directly with the keyword 'mindmap'.
  2. Use strictly 2 spaces for indentation.
  3. Keep node labels short (max 5-6 words).
  4. Do NOT use special characters like colon (:), parens (), or quotes inside node labels unless wrapped in quotes.
  5. Do NOT wrap the output in markdown code blocks (no \`\`\`).
  6. Return raw mermaid code only.
  7. ${langPrompt}

  Structure example:
  mindmap
    Root
      Node1
        LeafA
        LeafB
      Node2
  
  Content to visualize:
  ${content.substring(0, 20000)}
  `;
  
  const systemPrompt = "You are a Visualization Expert. Output strictly valid Mermaid mindmap syntax only. No explanations.";
  const result = await generateAIResponse(prompt, config, systemPrompt);
  
  // Robust Cleanup
  let clean = cleanCodeBlock(result);
  
  // Fix common AI formatting errors
  // 1. Remove "mermaid" if it appears as the first line (common hallucination)
  if (clean.toLowerCase().startsWith('mermaid')) {
    clean = clean.split('\n').slice(1).join('\n').trim();
  }
  
  // 2. Ensure it starts with mindmap
  if (!clean.toLowerCase().startsWith('mindmap')) {
    clean = 'mindmap\n' + clean;
  }

  // 3. Remove lines that might be conversational filler
  clean = clean.split('\n').filter(line => {
    const trimmed = line.trim();
    // Filter out lines that are likely markdown or chat
    if (trimmed.startsWith('```')) return false;
    if (trimmed === 'mermaid') return false; 
    return true;
  }).join('\n');
  
  return clean;
};

export const generateQuiz = async (content: string, config: AIConfig): Promise<Quiz> => {
  // Strategy: 1 question per 300 words, minimum 3, max 15.
  const wordCount = content.split(/\s+/).length;
  // Ensure we get at least 3 questions, and cap at 15
  const numQuestions = Math.min(15, Math.max(3, Math.ceil(wordCount / 300)));
  
  const langPrompt = config.language === 'zh' 
    ? "Generate the quiz title, description, questions, options, and explanations in Chinese." 
    : "Generate everything in English.";

  const prompt = `Based on the provided content, create a comprehensive educational quiz.
  
  REQUIREMENTS:
  - Generate EXACTLY ${numQuestions} questions.
  - Mix question types: 'single' (multiple choice), 'multiple' (select all), and 'text' (short answer).
  - Ensure questions cover different parts of the text evenly.
  - ${langPrompt}
  - Return strictly valid JSON matching this interface:
  {
    "id": "quiz-generated-1",
    "title": "Topic Title",
    "description": "Short description of what this quiz covers",
    "questions": [
      {
        "id": "q1",
        "type": "single",
        "question": "Question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"], 
        "correctAnswer": "Option A", 
        "explanation": "Detailed explanation of why A is correct."
      }
    ],
    "isGraded": false
  }

  Content:
  ${content.substring(0, 50000)}
  `;
  
  const systemPrompt = "You are an expert Teacher. Create a challenging and accurate educational quiz in JSON format.";
  
  try {
    const jsonStr = await generateAIResponse(prompt, config, systemPrompt, true);
    const cleanedJson = cleanCodeBlock(jsonStr);
    return JSON.parse(cleanedJson) as Quiz;
  } catch (e) {
    console.error("Quiz Parsing Error", e);
    throw new Error("Failed to generate quiz. The AI response was not valid JSON.");
  }
};

export const gradeQuizQuestion = async (question: string, userAnswer: string, context: string, config: AIConfig): Promise<string> => {
  const prompt = `Question: ${question}
  User Answer: ${userAnswer}
  Context: ${context.substring(0, 5000)}
  
  Grade this answer. Provide a short explanation and state if it is Correct or Incorrect. ${config.language === 'zh' ? "Reply in Chinese." : ""}`;
  return generateAIResponse(prompt, config, "You are a helpful teaching assistant.");
};
