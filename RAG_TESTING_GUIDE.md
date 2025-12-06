# RAG 工具集成测试指南

## 快速测试流程

### 准备工作
1. 确保应用已构建：`npm run build`
2. 启动开发服务器：`npm run dev`
3. 打开浏览器访问 `http://localhost:3000`

---

## 测试用例

### 测试 1：VectorStore 初始化
**目的：** 验证应用启动时向量存储正确初始化

**步骤：**
1. 打开浏览器开发者工具 (F12)
2. 刷新页面
3. 查看 Console 输出

**预期结果：**
```
[VectorStore] Initializing from database...
[VectorStore] Initialized from database { totalFiles: X, totalChunks: Y }
```
或（Web 模式）：
```
[VectorStore] Running in Web mode, using in-memory storage
[VectorStore] Initialized
```

---

### 测试 2：智能 RAG 触发（有笔记内容）
**目的：** 验证 AI 正确调用 search_knowledge_base 工具

**步骤：**
1. 导入或创建几个包含技术内容的 Markdown 文件（如 React、TypeScript 笔记）
2. 打开聊天面板（右上角聊天图标或 Alt+C）
3. 输入："我的笔记中关于 React Hooks 的内容是什么？"
4. 观察 AI 响应

**预期结果：**
- Console 显示：`[AI] Tool Call: search_knowledge_base`
- AI 返回基于笔记内容的回答
- 回答中引用了具体文件或章节

**验证点：**
- ✅ AI 调用了工具（Console 日志）
- ✅ 返回的内容与笔记相关
- ✅ 响应时间合理（< 5秒）

---

### 测试 3：无需 RAG 的对话
**目的：** 验证 AI 不会对无关问题调用工具

**步骤：**
1. 继续上一个聊天会话
2. 输入："你好，今天天气怎么样？"
3. 观察 Console 和响应时间

**预期结果：**
- Console **不显示** `search_knowledge_base` 调用
- AI 直接回答问题
- 响应速度快（< 2秒）

**验证点：**
- ✅ 无工具调用日志
- ✅ 延迟明显低于测试 2
- ✅ 回答合理且不引用笔记

---

### 测试 4：自动索引新文件
**目的：** 验证查询前自动索引未处理文件

**步骤：**
1. 导入新的 PDF 或 Markdown 文件
2. 立即在聊天中询问该文件内容（不手动点击"刷新索引"）
3. 观察系统消息和响应

**预期结果：**
- 底部显示短暂的 Toast："Indexing Knowledge Base..."
- Console 显示索引进度
- AI 能回答新文件的内容

**验证点：**
- ✅ 自动触发索引
- ✅ 索引成功后立即搜索
- ✅ 返回新文件的内容

---

### 测试 5：空知识库场景
**目的：** 验证无文件时的优雅降级

**步骤：**
1. 删除所有文件（或使用新的浏览器 Profile）
2. 询问："我的笔记中有哪些内容？"
3. 观察响应

**预期结果：**
- AI 回复类似："您当前没有笔记文件" 或 "我无法找到相关内容"
- 无崩溃或错误

**验证点：**
- ✅ 无 JavaScript 错误
- ✅ 回答合理（告知无内容）
- ✅ 应用保持稳定

---

### 测试 6：多轮对话上下文
**目的：** 验证对话历史和多次工具调用

**步骤：**
1. 询问："总结我所有关于 TypeScript 的笔记"
2. 等待 AI 回答
3. 继续："详细说明第一点"
4. 观察 AI 是否保持上下文

**预期结果：**
- 第一次回答：调用 `search_knowledge_base`，返回总结
- 第二次回答：可能再次调用工具，或基于之前上下文回答
- 对话连贯

**验证点：**
- ✅ AI 记住之前的搜索结果
- ✅ 无需重复搜索相同内容
- ✅ 上下文连贯

---

## 性能基准测试

### 对比测试（可选）

**旧版（自动 RAG）：**
- 任何对话都会触发索引 + 搜索
- 延迟：~3-5秒

**新版（工具调用）：**
- 仅相关问题触发搜索
- 无关对话延迟：~1-2秒
- 相关对话延迟：~3-5秒（与旧版相同）

**测试方法：**
1. 使用浏览器 Network 面板记录请求时间
2. 对比相同问题在两个版本的响应时间
3. 记录日志中的 `queryTime` 值

---

## 调试技巧

### Console 关键日志

**成功的工具调用：**
```
[AI] Using Real MCP Client (Electron)
或
[AI] Using Virtual MCP Client (Browser Simulation)

[MCP] Tool Call: search_knowledge_base
Arguments: { query: "React Hooks", maxResults: 10 }

[VectorStore] Searching... (queryTime: 123ms)
```

**索引日志：**
```
[VectorStore] Indexing file: example.md
[VectorStore] Persisted 15 chunks for file example.md
```

### 错误排查

**问题：AI 不调用工具**
- 检查：AI 配置中是否启用了工具调用
- 检查：Console 是否有 MCP 初始化错误
- 尝试：重新配置 AI 设置

**问题：工具调用失败**
- 检查：`executeAiTool` 中的错误日志
- 检查：向量数据库是否正常（Electron 模式）
- 尝试：清空聊天历史并重试

**问题：返回结果不相关**
- 调整：相似度阈值（在 `ragService.ts` 中）
- 检查：文件是否正确索引
- 尝试：重新索引知识库

---

## 验收标准

### 必须通过（Critical）
- ✅ 应用启动无错误
- ✅ VectorStore 正确初始化
- ✅ 智能触发 RAG（测试 2）
- ✅ 无需 RAG 的对话快速响应（测试 3）
- ✅ 自动索引新文件（测试 4）

### 应该通过（High Priority）
- ✅ 空知识库不崩溃（测试 5）
- ✅ 多轮对话上下文保持（测试 6）
- ✅ 性能改善明显（无关对话 < 2秒）

### 可选优化（Nice to Have）
- 显示工具调用过程（UI 改进）
- 恢复 RAG 结果卡片显示
- 配置化工具参数

---

## 报告模板

### 测试报告示例

```markdown
## 测试执行日期：2025-12-04

### 环境
- 浏览器：Chrome 120
- 模式：Web / Electron
- AI 提供商：Gemini / Ollama / OpenAI
- 文件数量：10 个 Markdown 文件

### 测试结果

| 测试用例 | 状态 | 延迟 | 备注 |
|---------|------|-----|------|
| 测试 1：初始化 | ✅ 通过 | - | 加载 125 个 chunks |
| 测试 2：智能 RAG | ✅ 通过 | 4.2s | 正确调用工具 |
| 测试 3：无需 RAG | ✅ 通过 | 1.5s | 延迟显著降低 |
| 测试 4：自动索引 | ✅ 通过 | 6.8s | 索引 + 搜索 |
| 测试 5：空知识库 | ✅ 通过 | 2.1s | 优雅降级 |
| 测试 6：多轮对话 | ✅ 通过 | 3.5s | 上下文正确 |

### 性能对比
- 无关对话延迟：1.5s（旧版 3.2s，提升 53%）
- 相关对话延迟：4.2s（旧版 4.5s，相当）
- 工具调用成功率：100%

### 发现的问题
- 无

### 建议
- 考虑添加工具调用可见性
- 可选恢复 RAG 结果卡片
```

---

## 自动化测试（未来）

### Jest 单元测试示例

```typescript
// __tests__/executeAiTool.test.ts
describe('executeAiTool', () => {
  it('should handle search_knowledge_base correctly', async () => {
    const result = await executeAiTool('search_knowledge_base', {
      query: 'React Hooks',
      maxResults: 5
    });

    expect(result.success).toBe(true);
    expect(result.sources).toBeDefined();
    expect(result.context).toContain('React');
  });
});
```

### Playwright E2E 测试示例

```typescript
// e2e/rag-integration.spec.ts
test('AI should call search_knowledge_base for relevant queries', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Open chat
  await page.click('[data-testid="chat-button"]');

  // Send message
  await page.fill('[data-testid="chat-input"]', '我的笔记中有什么？');
  await page.press('[data-testid="chat-input"]', 'Enter');

  // Wait for response
  await page.waitForSelector('[data-testid="assistant-message"]');

  // Verify console logs
  const logs = await page.evaluate(() => console.logs);
  expect(logs).toContain('search_knowledge_base');
});
```

---

**祝测试顺利！**

如遇到问题，请参考 `RAG_INTEGRATION_SUMMARY.md` 的"已知限制与优化建议"章节。
