const STUDIO_URL = 'roblox-studio:1';
const CTX = "You are an expert Roblox developer. I work in Roblox Studio with Luau. Prefer modern APIs (task.wait, TweenService, RemoteEvents for client-server communication). Keep explanations short and give complete, ready-to-paste code blocks.";
const TEMPLATES = [
  { id: 'script', name: 'Script', prefix: 'Write a Luau script for Roblox Studio. Tell me where to put it (ServerScriptService, StarterPlayerScripts or inside the part).' },
  { id: 'fix', name: 'Fix error', prefix: 'This error appears in the Output window of Roblox Studio. Explain the cause and give me the fixed code.' },
  { id: 'build', name: '3D model', prefix: 'Explain step by step how to build this in Roblox Studio with Parts and properties (size, color, material). Add a Luau script if it helps.' },
  { id: 'explain', name: 'Explain', prefix: 'Explain this Luau code in simple words, line by line, and point out bugs or improvements.' }
];
const MODELS = [
  { id: 'chatgpt', name: 'ChatGPT', maker: 'OpenAI', color: '#10A37F', icon: 'assets/models/chatgpt.png', home: 'https://chatgpt.com/', prefill: true,
    tag: 'The all-rounder.', pros: ['Clear step-by-step answers for scripts and fixes', 'Understands screenshots of errors and builds', 'Most widely used, so tips are easy to find'], best: ['Scripts', 'Debugging', 'Learning'],
    url: function (p) { return 'https://chatgpt.com/?q=' + encodeURIComponent(p); } },
  { id: 'claude', name: 'Claude', maker: 'Anthropic', color: '#D97757', icon: 'assets/models/claude.png', home: 'https://claude.ai/new', prefill: true,
    tag: 'Careful with big code.', pros: ['Strong at long, structured scripts and refactors', 'Follows detailed instructions closely', 'Keeps track of large files'], best: ['Refactors', 'Big scripts', 'Explanations'],
    url: function (p) { return 'https://claude.ai/new?q=' + encodeURIComponent(p); } },
  { id: 'gemini', name: 'Gemini', maker: 'Google', color: '#4C8DF6', icon: 'assets/models/gemini.png', home: 'https://gemini.google.com/app', prefill: false,
    tag: 'Sees the whole picture.', pros: ['Very large context for entire projects', 'Reads images and video, like a recording of a bug', 'Works well alongside Google tools'], best: ['Long projects', 'Screenshots', 'Research'] },
  { id: 'deepseek', name: 'DeepSeek', maker: 'DeepSeek', color: '#6B7CFF', icon: 'assets/models/deepseek.png', home: 'https://chat.deepseek.com/', prefill: false,
    tag: 'Thinks out loud.', pros: ['Strong at code and logic puzzles', 'Can show its reasoning step by step', 'Great for tracking down tricky bugs'], best: ['Debugging', 'Algorithms', 'Logic'] },
  { id: 'grok', name: 'Grok', maker: 'xAI', color: '#EDEDED', icon: 'assets/models/grok.png', home: 'https://grok.com/', prefill: true,
    tag: 'Straight to the point.', pros: ['Pulls in fresh info from the web and X', 'Short, direct answers', 'Fun for brainstorming game ideas'], best: ['Ideas', 'Fresh info', 'Quick answers'],
    url: function (p) { return 'https://grok.com/?q=' + encodeURIComponent(p); } },
  { id: 'llama', name: 'Llama', maker: 'Meta', color: '#2BA3FF', icon: 'assets/models/llama.png', home: 'https://www.meta.ai/', prefill: false,
    tag: 'Open and quick.', pros: ['Part of Meta’s open model family', 'Fast help for everyday questions', 'Easy to chat with right in the browser'], best: ['Quick questions', 'Brainstorming', 'Casual chat'] },
  { id: 'mistral', name: 'Mistral', maker: 'Mistral AI', color: '#FF7A1A', icon: 'assets/models/mistral.png', home: 'https://chat.mistral.ai/chat', prefill: true,
    tag: 'Fast and focused.', pros: ['Quick, concise replies', 'Solid at code and many languages', 'Good for small edits and snippets'], best: ['Fast edits', 'Snippets', 'Multilingual'],
    url: function (p) { return 'https://chat.mistral.ai/chat?q=' + encodeURIComponent(p); } }
];
function buildPrompt(t, text) { return CTX + '\n\n' + t.prefix + '\n\n' + text; }
function openUrl(m, p) { return (m.prefill && encodeURIComponent(p).length < 6000) ? m.url(p) : m.home; }
