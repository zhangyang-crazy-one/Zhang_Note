# 文件层级结构测试

## 项目结构示例

```
project/
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   ├── Footer.js
│   │   └── Navigation.js
│   ├── pages/
│   │   ├── Home.js
│   │   ├── About.js
│   │   └── Contact.js
│   └── utils/
│       ├── helpers.js
│       └── constants.js
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── assets/
│       ├── images/
│       └── styles/
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   ├── api/
│   └── guides/
├── config/
├── scripts/
└── README.md
```

## 目录说明

### 1. 根目录文件
- **README.md** - 项目说明文档
- **package.json** - 项目配置和依赖
- **.gitignore** - Git忽略文件配置
- **LICENSE** - 开源许可证

### 2. 源代码目录 (src/)
```
src/
├── index.js              # 应用入口文件
├── App.js               # 主应用组件
├── styles/              # 样式文件
│   ├── main.css
│   └── components.css
├── components/          # 可复用组件
│   ├── common/         # 通用组件
│   │   ├── Button/
│   │   │   ├── Button.js
│   │   │   ├── Button.css
│   │   │   └── Button.test.js
│   │   └── Input/
│   ├── layout/         # 布局组件
│   └── features/       # 功能组件
├── pages/              # 页面组件
│   ├── Home/
│   ├── About/
│   └── Contact/
├── hooks/              # 自定义Hooks
├── context/            # React Context
├── utils/              # 工具函数
│   ├── api.js         # API调用
│   ├── validation.js  # 验证函数
│   └── formatters.js  # 格式化函数
└── constants/          # 常量定义
```

### 3. 测试目录结构
```
tests/
├── unit/               # 单元测试
│   ├── components/
│   ├── utils/
│   └── hooks/
├── integration/        # 集成测试
├── e2e/               # 端到端测试
└── fixtures/          # 测试数据
```

### 4. 文档目录结构
```
docs/
├── README.md          # 文档首页
├── getting-started.md # 快速开始
├── api/               # API文档
│   ├── components.md
│   ├── hooks.md
│   └── utils.md
├── guides/            # 使用指南
│   ├── installation.md
│   ├── configuration.md
│   └── deployment.md
└── examples/          # 示例代码
```

### 5. 配置文件结构
```
config/
├── development.js     # 开发环境配置
├── production.js      # 生产环境配置
├── test.js           # 测试环境配置
└── webpack/          # Webpack配置
    ├── common.js
    ├── dev.js
    └── prod.js
```

## 文件命名规范

### 1. 组件文件
- **PascalCase** 用于组件文件：`Button.js`, `UserProfile.js`
- 相关文件使用相同前缀：`Button.css`, `Button.test.js`

### 2. 工具函数文件
- **camelCase** 或 **kebab-case**：`helpers.js`, `date-utils.js`

### 3. 配置文件
- **kebab-case** 或 **dot-prefix**：`.env.development`, `webpack.config.js`

### 4. 测试文件
- 与源文件同名加 `.test` 后缀：`Button.test.js`
- 或使用 `__tests__` 目录

## 最佳实践

1. **扁平化结构**：避免过深的嵌套层级
2. **按功能组织**：将相关文件放在一起
3. **一致性**：保持整个项目的结构一致
4. **可扩展性**：设计易于扩展的结构
5. **文档化**：每个目录应有 README 说明

## 示例：React项目结构

```
my-react-app/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   ├── images/
│   │   ├── fonts/
│   │   └── styles/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   └── ui/
│   ├── pages/
│   ├── services/
│   ├── store/
│   ├── utils/
│   ├── hooks/
│   ├── App.js
│   └── index.js
├── tests/
├── docs/
├── .env
├── .gitignore
├── package.json
└── README.md
```

这个文件用于测试文件层级结构的展示和导航功能。