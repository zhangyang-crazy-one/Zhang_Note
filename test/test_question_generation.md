# 题目生成测试文件

## 选择题示例

### 1. 单选题

**题目1：** JavaScript中，以下哪个方法用于向数组末尾添加元素？
- A) `push()`
- B) `pop()`
- C) `shift()`
- D) `unshift()`

**正确答案：** A

**解析：** `push()` 方法用于向数组末尾添加一个或多个元素，并返回新的长度。

---

**题目2：** CSS中，以下哪个属性用于设置元素的外边距？
- A) `padding`
- B) `margin`
- C) `border`
- D) `outline`

**正确答案：** B

**解析：** `margin` 属性用于设置元素的外边距，控制元素与其他元素之间的空间。

---

**题目3：** React中，以下哪个Hook用于在函数组件中添加状态？
- A) `useEffect`
- B) `useContext`
- C) `useState`
- D) `useReducer`

**正确答案：** C

**解析：** `useState` 是React Hook，允许在函数组件中添加状态管理。

### 2. 多选题

**题目4：** 以下哪些是JavaScript的基本数据类型？（多选）
- A) String
- B) Array
- C) Number
- D) Object
- E) Boolean
- F) Function

**正确答案：** A, C, E

**解析：** JavaScript的基本数据类型包括：String、Number、Boolean、Undefined、Null、Symbol、BigInt。Array和Object是引用类型。

---

**题目5：** 以下哪些HTTP方法是安全的？（多选）
- A) GET
- B) POST
- C) PUT
- D) DELETE
- E) HEAD
- F) OPTIONS

**正确答案：** A, E, F

**解析：** 安全的HTTP方法是指不会修改服务器状态的方法，包括GET、HEAD、OPTIONS。

### 3. 判断题

**题目6：** JavaScript中，`==` 和 `===` 运算符的功能完全相同。
- 正确
- 错误

**正确答案：** 错误

**解析：** `==` 是宽松相等，会进行类型转换；`===` 是严格相等，不会进行类型转换。

---

**题目7：** CSS中，`position: absolute` 的元素会相对于最近的已定位祖先元素进行定位。
- 正确
- 错误

**正确答案：** 正确

**解析：** 绝对定位的元素会相对于最近的已定位（非static）祖先元素进行定位。

## 填空题示例

### 4. 单词填空

**题目8：** 在JavaScript中，用于声明变量的关键字有 `var`、`let` 和 `______`。

**正确答案：** const

**解析：** `const` 用于声明常量，其值在声明后不能被重新赋值。

---

**题目9：** HTML中，`<img>` 标签必须包含 `______` 属性来指定图像的URL。

**正确答案：** src

**解析：** `src` 属性指定图像的源文件路径。

### 5. 代码填空

**题目10：** 完成以下函数，使其返回两个数字的和：

```javascript
function add(a, b) {
    return ______;
}
```

**正确答案：** a + b

---

**题目11：** 完成以下React组件：

```jsx
function Greeting({ name }) {
    return <h1>Hello, {______}!</h1>;
}
```

**正确答案：** name

## 简答题示例

### 6. 概念解释

**题目12：** 请解释什么是"闭包"（Closure）？

**参考答案：** 闭包是指函数能够访问并记住其词法作用域，即使该函数在其词法作用域之外执行。闭包由函数和其周围状态（词法环境）的组合构成。

**评分要点：**
1. 函数访问其词法作用域
2. 函数在定义作用域外执行
3. 保持对外部变量的引用

---

**题目13：** 请简述React中props和state的区别。

**参考答案：**
1. **props**：从父组件传递给子组件的数据，是只读的
2. **state**：组件内部管理的数据，可以通过setState更新
3. props用于组件通信，state用于组件内部状态管理

### 7. 代码分析

**题目14：** 分析以下代码的输出结果：

```javascript
console.log(1);
setTimeout(() => console.log(2), 0);
console.log(3);
Promise.resolve().then(() => console.log(4));
console.log(5);
```

**参考答案：** 1, 3, 5, 4, 2

**解析：** 
1. 同步代码按顺序执行：1, 3, 5
2. Promise微任务先于setTimeout宏任务执行：4
3. 最后执行setTimeout回调：2

## 编程题示例

### 8. 算法题

**题目15：** 实现一个函数，判断给定的字符串是否是回文（忽略大小写和非字母数字字符）。

```javascript
function isPalindrome(str) {
    // 请在此处编写代码
}
```

**参考答案：**
```javascript
function isPalindrome(str) {
    // 清理字符串：转小写，移除非字母数字字符
    const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    // 比较字符串和其反转
    return cleaned === cleaned.split('').reverse().join('');
}
```

**测试用例：**
- `isPalindrome("A man, a plan, a canal: Panama")` 应该返回 `true`
- `isPalindrome("race a car")` 应该返回 `false`
- `isPalindrome(" ")` 应该返回 `true`

### 9. React组件题

**题目16：** 创建一个计数器组件，包含增加和减少按钮。

**参考答案：**
```jsx
import React, { useState } from 'react';

function Counter() {
    const [count, setCount] = useState(0);
    
    return (
        <div>
            <h2>计数器: {count}</h2>
            <button onClick={() => setCount(count + 1)}>增加</button>
            <button onClick={() => setCount(count - 1)}>减少</button>
            <button onClick={() => setCount(0)}>重置</button>
        </div>
    );
}
```

## 综合题示例

### 10. 项目设计题

**题目17：** 设计一个待办事项应用，需要包含以下功能：
1. 添加新任务
2. 标记任务完成
3. 删除任务
4. 过滤任务（全部/进行中/已完成）

请描述：
1. 组件结构设计
2. 状态管理方案
3. 主要功能实现思路

**参考答案要点：**
1. **组件结构**：
   - TodoApp（主组件）
   - TodoForm（添加任务表单）
   - TodoList（任务列表）
   - TodoItem（单个任务项）
   - FilterButtons（过滤按钮）

2. **状态管理**：
   - 使用React的useState或useReducer
   - 状态包括：任务列表、过滤条件
   - 每个任务对象包含：id、text、completed

3. **功能实现**：
   - 添加：表单提交时创建新任务对象
   - 标记完成：切换任务的completed状态
   - 删除：根据id过滤任务列表
   - 过滤：根据条件筛选显示的任务

## 题目生成规则测试

### 11. 不同难度级别

**初级题目：**
- 基础语法和概念
- 简单的代码填空
- 基本API使用

**中级题目：**
- 算法实现
- 框架使用
- 性能优化

**高级题目：**
- 系统设计
- 架构设计
- 复杂算法

### 12. 题目类型分布

| 类型 | 比例 | 示例 |
|------|------|------|
| 选择题 | 30% | 单选、多选 |
| 填空题 | 20% | 单词填空、代码填空 |
| 简答题 | 25% | 概念解释、代码分析 |
| 编程题 | 25% | 算法实现、组件开发 |

## 测试总结

这个文件包含了各种类型的题目，用于测试题目生成系统的功能：
1. 多种题型支持
2. 答案解析功能
3. 难度分级
4. 代码高亮
5. 评分标准

可以根据需要扩展更多题目类型和测试场景。