# RAG 向量持久化功能

## 概述

此功能将 Zhang Reader 的 RAG (Retrieval Augmented Generation) 向量存储从纯内存实现升级为 SQLite 持久化存储。这意味着：

- **重启应用时向量会自动加载**：不需要每次重新向量化所有文档
- **节省时间和 API 调用**:避免重复的 embedding 生成
- **智能增量更新**:只对修改过的文件重新索引
- **跨平台兼容**:Electron 模式使用数据库,Web 模式仍用内存存储

## 实现架构

### 数据库设计

#### vector_chunks 表
存储文档的向量块:

```sql
CREATE TABLE vector_chunks (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    embedding BLOB,                -- Float32Array 转为 Buffer 存储
    chunk_start INTEGER NOT NULL,
    chunk_end INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_last_modified INTEGER NOT NULL,
    created_at INTEGER,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(file_id, chunk_index)
);
```

#### vector_index_meta 表
存储索引元数据:

```sql
CREATE TABLE vector_index_meta (
    file_id TEXT PRIMARY KEY,
    last_modified INTEGER NOT NULL,
    chunk_count INTEGER NOT NULL,
    indexed_at INTEGER,
    embedding_model TEXT,           -- 记录使用的模型
    embedding_provider TEXT,        -- 记录使用的提供商
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

### 代码结构

1. **数据库迁移** (`electron/database/migrations.ts`)
   - Version 2 迁移创建向量表
   - 在应用启动时自动运行

2. **数据访问层** (`electron/database/repositories/vectorRepository.ts`)
   - `VectorRepository` 类封装所有数据库操作
   - 核心方法:
     - `needsIndexing()` - 检查文件是否需要重新索引
     - `getChunksByFile()` - 获取指定文件的向量块
     - `getAllChunks()` - 获取所有向量块
     - `saveChunks()` - 保存文件的向量块(事务)
     - `deleteByFile()` - 删除文件的向量块
     - `clearAll()` - 清空所有向量数据

3. **IPC 通信** (`electron/ipc/dbHandlers.ts`)
   - 注册向量操作的 IPC 处理器
   - 渲染进程可通过 `window.electronAPI.db.vectors.*` 调用

4. **Preload 桥接** (`electron/preload.ts`)
   - 暴露 `vectors` 命名空间到渲染进程
   - TypeScript 类型定义完整

5. **向量存储重构** (`services/ragService.ts`)
   - `VectorStore` 类新增:
     - `initialize()` - 异步初始化,从数据库加载
     - `isElectron()` - 平台检测
     - `needsIndexing()` - 改为异步方法
     - `hasFilesToIndex()` - 改为异步方法
     - `indexFile()` - 添加数据库持久化逻辑
     - `clear()` - 改为异步,同时清空数据库

## 使用指南

### 1. 初始化 VectorStore

在应用启动时(例如 `App.tsx` 的 `useEffect`):

```typescript
// 在组件顶部
const vectorStore = useRef(new VectorStore()).current;

useEffect(() => {
  // 初始化向量存储
  vectorStore.initialize().then(() => {
    console.log('VectorStore initialized');
    // 检查是否有文件需要索引
    vectorStore.hasFilesToIndex(files).then(needsIndex => {
      if (needsIndex) {
        // 触发索引操作
      }
    });
  });
}, []);
```

### 2. 索引文件

```typescript
// 索引单个文件
const indexed = await vectorStore.indexFile(file, aiConfig);
if (indexed) {
  console.log(`File ${file.name} indexed successfully`);
}
```

### 3. 检查索引状态

```typescript
// 检查单个文件
const needsIndex = await vectorStore.needsIndexing(file);

// 检查多个文件
const hasFilesToIndex = await vectorStore.hasFilesToIndex(files);
```

### 4. 搜索向量

```typescript
// 搜索(与之前一致,内部自动使用持久化的向量)
const results = await vectorStore.searchWithResults(query, aiConfig);
console.log(`Found ${results.results.length} chunks in ${results.queryTime}ms`);
```

### 5. 清空向量存储

```typescript
// 清空内存和数据库中的所有向量
await vectorStore.clear();
```

## 数据持久化细节

### Embedding 存储格式

- **输入**: `number[]` (JavaScript 数组)
- **存储**: `Buffer` (SQLite BLOB)
- **转换**:
  ```typescript
  // 保存时
  const buffer = Buffer.from(new Float32Array(embedding).buffer);

  // 读取时
  const float32Array = new Float32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.length / 4
  );
  const embedding = Array.from(float32Array);
  ```

### 增量索引逻辑

1. 应用启动时从数据库加载所有向量
2. 检查文件的 `lastModified` 时间戳
3. 只对修改过的文件重新生成 embedding
4. 新索引完成后立即持久化到数据库

### 事务保证

- 所有向量保存操作使用 SQLite 事务
- 确保向量块和元数据的原子性
- 失败时自动回滚

## 兼容性

### Electron 模式
- 完全启用持久化
- 向量存储在 `userData/zhang-reader.db`
- 支持跨会话持久化

### Web 模式
- 自动降级为内存存储
- 与之前的行为一致
- 无数据库依赖

## 性能优化

1. **索引优化**:
   - 按 `file_id` 索引快速查询
   - 按 `(file_id, file_last_modified)` 复合索引快速检查更新

2. **批量加载**:
   - 启动时一次性加载所有向量
   - 避免频繁的数据库查询

3. **延迟删除**:
   - 利用 `ON DELETE CASCADE` 自动清理
   - 删除文件时自动删除相关向量

## 故障恢复

### 数据库损坏

如果数据库损坏或版本不兼容:

1. VectorStore 会捕获错误并继续使用内存模式
2. 日志会记录错误信息
3. 用户可以通过清空向量重新开始

### 迁移失败

- 迁移在事务中运行,失败会回滚
- 应用会抛出错误并拒绝启动
- 需要手动检查日志并修复数据库

## 监控和调试

### 日志记录

所有向量操作都有详细日志:

```
[VectorStore] Initializing from database...
[VectorStore] Initialized from database { totalFiles: 10, totalChunks: 150 }
[VectorStore] Persisted 15 chunks for file example.md
```

### 统计信息

```typescript
// 获取向量存储统计
const stats = vectorStore.getStats();
console.log(stats);
// { totalFiles: 10, indexedFiles: 10, totalChunks: 150, isIndexing: false }

// 获取数据库统计
const dbStats = await window.electronAPI.db.vectors.getStats();
console.log(dbStats);
// { totalFiles: 10, totalChunks: 150 }
```

### 元数据查询

```typescript
// 查看索引元数据
const meta = await window.electronAPI.db.vectors.getMeta();
meta.forEach(m => {
  console.log(`File ${m.fileId}: ${m.chunkCount} chunks, model: ${m.embeddingModel}`);
});
```

## 未来改进

- [ ] 支持向量压缩(量化)以减少存储空间
- [ ] 实现向量索引(ANN)加速搜索
- [ ] 支持跨文件的向量去重
- [ ] 添加向量备份/导出功能
- [ ] 实现向量版本控制(跟踪模型变更)

## 测试建议

### 手动测试步骤

1. **首次索引**:
   - 打开应用,导入若干 Markdown 文件
   - 触发 RAG 索引,观察日志
   - 关闭应用

2. **持久化验证**:
   - 重新打开应用
   - 检查控制台,应显示 "Initialized from database"
   - 验证向量数量与之前一致

3. **增量更新**:
   - 修改一个文件的内容
   - 保存文件
   - 触发重新索引,应只处理修改的文件

4. **搜索功能**:
   - 执行 RAG 搜索
   - 验证结果准确性
   - 检查响应时间

5. **清空功能**:
   - 执行 `vectorStore.clear()`
   - 重启应用,验证向量已清空

### 自动化测试(TODO)

```typescript
describe('VectorStore Persistence', () => {
  it('should persist vectors to database', async () => {
    // 测试用例
  });

  it('should load vectors from database on init', async () => {
    // 测试用例
  });

  it('should update only modified files', async () => {
    // 测试用例
  });
});
```

## 相关文件

- `electron/database/migrations.ts` - 数据库迁移
- `electron/database/repositories/vectorRepository.ts` - 数据访问层
- `electron/ipc/dbHandlers.ts` - IPC 处理器
- `electron/preload.ts` - Preload 桥接
- `services/ragService.ts` - 向量存储核心逻辑

## 支持

如有问题请查看:
- 应用日志 (位于 `userData/logs/`)
- 数据库文件 (位于 `userData/zhang-reader.db`)
- 浏览器控制台 (F12 开发者工具)
