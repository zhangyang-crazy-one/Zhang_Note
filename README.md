<div align="center">

# ZhangNote

**AI-Powered Markdown Editor & Knowledge Management Tool**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)](https://github.com/)
[![Electron](https://img.shields.io/badge/Electron-34-47848F.svg)](https://www.electronjs.org/)

[English](#features) | [中文](#功能特性)

</div>

---

## Features

ZhangNote is a modern AI-powered Markdown editor designed for knowledge workers, researchers, and note-taking enthusiasts. It combines beautiful editing experience with powerful AI capabilities.

### Core Features

- **Markdown Editor** - Real-time preview with syntax highlighting, supporting split view, editor-only, and preview-only modes
- **Multi-format Import** - Import PDF, DOCX, CSV files and automatically convert to Markdown
- **File Management** - Folder-based organization with drag-and-drop support
- **Theme System** - 5 built-in themes including Neon Cyber, Clean Paper, Sketchbook, Midnight Dracula, and Solarized Dawn
- **Chinese Font Support** - Built-in Noto Sans SC, Noto Serif SC, and Ma Shan Zheng fonts

### AI Capabilities

- **AI Chat Assistant** - Chat with your notes using context-aware AI
- **RAG (Retrieval Augmented Generation)** - Semantic search across your knowledge base
- **Content Polish** - AI-powered writing enhancement
- **Knowledge Graph** - Visualize relationships between concepts in your notes
- **Mind Map Generation** - Automatically generate mind maps from content
- **Quiz Generation** - Create quizzes from your study materials
- **Web Search** - AI can search the web for up-to-date information (Gemini only)

### Supported AI Providers

| Provider | Models | Features |
|----------|--------|----------|
| **Google Gemini** | gemini-2.5-flash, gemini-2.5-pro | Web Search, Large Context |
| **Ollama** | llama3, qwen, mistral, etc. | Local, Privacy-focused |
| **OpenAI Compatible** | GPT-4, DeepSeek, Claude, etc. | Flexible API |

### MCP (Model Context Protocol) Support

ZhangNote supports MCP servers for extended AI capabilities:
- Chrome DevTools integration
- Custom tool definitions
- Extensible architecture

---

## Installation

### Windows

1. Download the latest installer from [Releases](https://github.com/your-repo/releases)
2. Run `ZhangNote-Setup-x.x.x.exe`
3. Follow the installation wizard

### Portable Version

Download the portable `.zip` file and extract to any location.

---

## Quick Start

### 1. Configure AI Provider

1. Click the **Settings** icon in the toolbar
2. Select your AI provider (Gemini, Ollama, or OpenAI Compatible)
3. Enter your API key or configure the endpoint URL
4. Click **Save**

#### Gemini Setup
- Get your API key from [Google AI Studio](https://aistudio.google.com/)
- Paste the key in the API Key field

#### Ollama Setup (Local AI)
- Install [Ollama](https://ollama.ai/) on your machine
- Pull a model: `ollama pull llama3`
- Default URL: `http://localhost:11434`

#### OpenAI Compatible Setup
- Works with OpenAI, Azure OpenAI, DeepSeek, and other compatible APIs
- Enter your Base URL and API Key

### 2. Create Your First Note

1. Click the **+** button in the sidebar to create a new file
2. Start writing in Markdown
3. Use the view mode buttons to switch between Editor, Split, and Preview modes

### 3. Use AI Features

- **Chat**: Click the chat icon to open AI assistant
- **Polish**: Select text and click "Polish" to improve writing
- **Knowledge Graph**: Click the graph icon to visualize concepts
- **Mind Map**: Click the brain icon to generate a mind map
- **Quiz**: Click the graduation cap icon to generate a quiz

### 4. Import Files

- **Drag & Drop**: Drag PDF, DOCX, or CSV files into the sidebar
- **Open Folder**: Click "Open Folder" to import an entire directory

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Bold | `Ctrl + B` |
| Italic | `Ctrl + I` |
| Undo | `Ctrl + Z` |
| Redo | `Ctrl + Y` |
| Save | `Ctrl + S` |
| New File | `Ctrl + N` |

---

## RAG (Knowledge Base Search)

ZhangNote includes a built-in vector store for semantic search:

1. **Indexing**: Your notes are automatically indexed when you open them
2. **Search**: Ask questions in the chat, and AI will search your knowledge base
3. **Context-Aware**: AI responses are grounded in your actual notes

### Embedding Providers

| Provider | Model | Notes |
|----------|-------|-------|
| Gemini | text-embedding-004 | Recommended |
| OpenAI | text-embedding-3-small | High quality |
| Ollama | nomic-embed-text | Local, free |

---

## Themes

ZhangNote offers 5 carefully designed themes:

| Theme | Description |
|-------|-------------|
| **Neon Cyber** | Dark theme with cyan/violet accents |
| **Clean Paper** | Light theme resembling paper |
| **Sketchbook** | Handwriting-style with Ma Shan Zheng font |
| **Midnight Dracula** | Classic dark theme |
| **Solarized Dawn** | Warm light theme |

Switch themes in **Settings > Appearance**.

---

## FAQ

### Q: How do I use local AI models?

Install [Ollama](https://ollama.ai/), pull a model (`ollama pull llama3`), and select "Ollama" as your provider in settings.

### Q: My API key doesn't work?

- Gemini: Ensure you've enabled the Generative AI API in Google Cloud Console
- OpenAI: Check that your API key has sufficient credits
- Ollama: Make sure Ollama is running (`ollama serve`)

### Q: How do I backup my notes?

Your notes are stored in the application data folder:
- Windows: `%APPDATA%\zhangnote\`

You can also export individual files using the download button.

### Q: Can I use my own fonts?

Custom font support is coming in a future release. Currently, 5 font combinations are available through themes.

---

## Privacy

- **Local Storage**: All notes are stored locally on your device
- **API Calls**: AI features require sending content to your configured AI provider
- **No Telemetry**: ZhangNote does not collect any usage data

---

## License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

```
Copyright 2024 ZhangNote Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Acknowledgments

- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI capabilities
- [Ollama](https://ollama.ai/) - Local AI runtime

---

<div align="center">

**Made with love for knowledge seekers**

[Report Bug](https://github.com/your-repo/issues) · [Request Feature](https://github.com/your-repo/issues)

</div>

---

# 中文文档

## 功能特性

ZhangNote 是一款现代化的 AI 驱动 Markdown 编辑器，专为知识工作者、研究人员和笔记爱好者设计。它将优美的编辑体验与强大的 AI 能力相结合。

### 核心功能

- **Markdown 编辑器** - 实时预览与语法高亮，支持分屏、纯编辑、纯预览三种模式
- **多格式导入** - 支持导入 PDF、DOCX、CSV 文件并自动转换为 Markdown
- **文件管理** - 基于文件夹的组织方式，支持拖拽操作
- **主题系统** - 内置 5 套主题：霓虹赛博、简洁纸张、手绘风格、午夜德古拉、曙光主题
- **中文字体** - 内置思源黑体、思源宋体、马善政楷体

### AI 能力

- **AI 聊天助手** - 基于上下文的智能对话
- **RAG 知识检索** - 语义搜索您的知识库
- **内容润色** - AI 驱动的写作增强
- **知识图谱** - 可视化笔记中的概念关系
- **思维导图** - 自动生成思维导图
- **试卷生成** - 从学习材料创建测验题目
- MCP-Client - 可以直接使用现行网络上的Node.js服务的所有MCP，强大的工具调用系统

### 支持的 AI 提供商

| 提供商 | 模型 | 特点 |
|--------|------|------|
| **Google Gemini** | gemini-2.5-flash, gemini-2.5-pro | 网络搜索、超长上下文 |
| **Ollama** | llama3, qwen, mistral ,本地运行推荐Qwen3和Mistral | 本地运行、隐私保护 |
| **OpenAI 兼容** | DeepSeek, Claude ,Glm4.6,Kimi等 | 灵活的 API 接口 |

---

## 安装方法

### Windows 安装版

1. 从 [Releases](https://github.com/your-repo/releases) 下载最新安装包
2. 运行 `ZhangNote-Setup-x.x.x.exe`
3. 按照安装向导完成安装

### 便携版

下载 `.zip` 便携版，解压到任意位置即可使用。

---

## 快速开始

### 1. 配置 AI 提供商

1. 点击工具栏的 **设置** 图标
2. 选择 AI 提供商（Gemini、Ollama 或 OpenAI 兼容）
3. 输入 API 密钥或配置端点 URL
4. 点击 **保存**

#### Gemini 配置
- 从 [Google AI Studio](https://aistudio.google.com/) 获取 API 密钥
- 将密钥粘贴到 API Key 字段

#### Ollama 配置（本地 AI）
- 在您的电脑上安装 [Ollama](https://ollama.ai/)
- 拉取模型：`ollama pull llama3` 或 `ollama pull qwen2.5`
- 默认地址：`http://localhost:11434`

#### OpenAI 兼容配置
- 支持 OpenAI、Azure OpenAI、DeepSeek 等兼容 API
- 输入 Base URL 和 API Key

### 2. 创建您的第一篇笔记

1. 点击侧边栏的 **+** 按钮创建新文件
2. 开始用 Markdown 写作
3. 使用视图模式按钮在编辑器、分屏、预览之间切换

### 3. 使用 AI 功能

- **聊天**：点击聊天图标打开 AI 助手
- **润色**：选中文本后点击"润色"改善写作
- **知识图谱**：点击图谱图标可视化概念
- **思维导图**：点击脑图图标生成思维导图
- **测验**：点击学士帽图标生成测验题

### 4. 导入文件

- **拖放**：将 PDF、DOCX 或 CSV 文件拖入侧边栏
- **打开文件夹**：点击"打开文件夹"导入整个目录

---

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 加粗 | `Ctrl + B` |
| 斜体 | `Ctrl + I` |
| 撤销 | `Ctrl + Z` |
| 重做 | `Ctrl + Y` |
| 保存 | `Ctrl + S` |
| 新建文件 | `Ctrl + N` |

---

## 隐私说明

- **本地存储**：所有笔记都存储在您的设备本地
- **API 调用**：AI 功能需要将内容发送到您配置的 AI 提供商
- **无遥测**：ZhangNote 不收集任何使用数据

---

## 许可证

本项目采用 **Apache License 2.0** 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

<div align="center">

**为知识探索者用心打造**

[报告问题](https://github.com/your-repo/issues) · [功能建议](https://github.com/your-repo/issues)

</div>
