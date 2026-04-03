# 宏观日报

这是宏观日报网页的静态发布仓库。

当前线上版本：

- 最新日报日期：`2026-04-03`
- 生成模式：`分析日报`
- 站点地址：`https://mengda0231.github.io/Macro-daily/`

## 本地预览

这个仓库内置了本地可携带版 Node 入口：

- `run-local-node.cmd`
- `run-local-npm.cmd`
- `run-local-npx.cmd`

即使本机没有全局安装 Node，也可以直接运行：

```bat
run-local-npm.cmd install
run-local-npm.cmd run check
run-local-npm.cmd run dev
```

默认本地地址：

- `http://127.0.0.1:4173/`

`run check` 会校验 `data/latest.json` 的关键字段，避免把结构异常的数据发布到线上。

说明：

- 前台页面只展示当日新闻流、官方发布、媒体报道、财联社与核心社媒信源的分析结果。
- 研究报告、学习卡、playbook 与 capability 只作为后台研究框架能力层，不直接作为每日日报素材展示。
- 页面默认采用中文优先展示，英文原文标题仅作为附属来源信息保留。
