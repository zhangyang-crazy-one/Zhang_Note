/**
 * MCP (Model Context Protocol) 类型定义
 * 用于主进程中的 MCP 服务器通信
 */

/**
 * MCP 服务器配置
 */
export interface MCPServerConfig {
  /** 启动命令 (例如: "npx", "node", "python") */
  command: string;
  /** 命令参数 */
  args: string[];
  /** 环境变量 */
  env?: Record<string, string>;
  /** 工作目录 */
  cwd?: string;
}

/**
 * MCP 配置文件格式
 */
export interface MCPConfig {
  /** MCP 服务器映射 { 服务器名称: 配置 } */
  mcpServers: Record<string, MCPServerConfig>;
}

/**
 * MCP 工具定义
 */
export interface MCPTool {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** JSON Schema 格式的输入参数定义 */
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

/**
 * JSON-RPC 2.0 请求格式
 */
export interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

/**
 * JSON-RPC 2.0 响应格式
 */
export interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP 服务器状态
 */
export type MCPServerStatusType = 'connecting' | 'running' | 'stopped' | 'error';

export interface MCPServerStatus {
  /** 服务器名称 */
  name: string;
  /** 运行状态 */
  status: MCPServerStatusType;
  /** 可用的工具列表 */
  tools: MCPTool[];
  /** 错误信息（如果有） */
  error?: string;
}

/**
 * MCP 初始化响应
 */
export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: {
    tools?: Record<string, any>;
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

/**
 * 工具列表响应
 */
export interface MCPToolsListResult {
  tools: MCPTool[];
}

/**
 * 工具调用结果
 */
export interface MCPToolCallResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
  isError?: boolean;
}
