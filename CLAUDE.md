# 自律日记 (Discipline Diary)

一个移动端优先的个人自律 + 记账小工具。

## 技术栈
- Vite + React + TypeScript + Tailwind CSS v4
- 纯前端，数据存 localStorage（单 key: `discipline-diary-data`）
- PWA 支持（manifest + service worker），可添加到手机主屏幕
- 部署在 GitHub Pages

## 常用命令
```bash
npm run dev      # 本地开发
npm run build    # 构建
git push         # 推送到 GitHub → 自动触发 GitHub Actions 部署
```

## 功能模块
- 💰 **攒钱目标** — 设定目标金额，记录攒钱流水，进度条，显示最近 3 条记录（可展开）
- 🎯 **年度目标** — 三种模式：
  - 百分比：拖 slider
  - 子任务：添加子项并勾选，进度自动计算
  - 一次性：纯勾选，不显示进度
  - 完成的目标自动沉底
- ✅ **每日目标** — 习惯打卡 checkbox，连续 streak 🔥，本月热力图 + 各目标完成率
  - 补打卡：前一天的可以补（显示「补昨日」），但不计入统计和 streak
- 💳 **记账** — 手动记账 + CSV 导入（支持支付宝/微信导出格式）
  - 每月收支汇总、分类占比条形图
  - 可设置月限额，存款 = 限额 - 支出
- 📝 **备忘录** — 按时间排列，点击可编辑

## PWA 注意事项

### 离线缓存策略（sw.js）
- **HTML（导航请求）**：network-first，总是尝试联网拿最新版，离线时降级到缓存
- **JS/CSS**：cache-first（文件名带 hash，安全）
- **版本号**：缓存 key 使用 `v2` 后缀，升级时删除旧缓存

### PWA 更新流程
用户在桌面 PWA 中不一定能实时收到更新。如果更新后用户看不到：
1. 先让用户彻底关闭 PWA（多任务卡片划掉）
2. 重新打开
3. 如果还不行，让用户打开浏览器网页版，页面上蓝色横幅"新版本已发布"点刷新
4. 或者用 `?v=N` 查询参数绕过缓存

### 数据安全
- **数据存 localStorage，清网站数据会丢失！**
- 应用内 ⚙️ 齿轮按钮提供导出/导入备份功能（JSON 文件）
- 每次打开 App 会请求 `/version.json`，对比本地版本号判断是否需要刷新

## API / 外部服务
- 无后端依赖，纯客户端
- CSV 解析器内置（支付宝/微信格式）
- Notification API：每日提醒（需用户授权），仅在浏览器/PWA 前台时触发

## 数据模型（types.ts）
```typescript
AppData {
  savingGoals: SavingGoal[]    // 攒钱目标 + 流水
  annualGoals: AnnualGoal[]    // 含三种 mode + subtasks
  dailyGoals: DailyGoal[]
  dailyRecords: DailyRecord[]  // completed + late 标记
  expenses: ExpenseRecord[]    // 含 category, source(alipay/wechat)
  notes: Note[]
  reminderTime: string | null  // HH:MM 或 null
  lastNotifyDate: string | null
  monthlyBudget: number | null
}
```

## GitHub
- 仓库: https://github.com/Lynn319425/discipline-diary
- 线上地址: https://lynn319425.github.io/discipline-diary/
- 分支策略：main 直推，GitHub Actions 自动部署
