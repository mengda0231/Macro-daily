# 宏观日报

这是宏观日报网页的静态发布仓库。

当前线上版本：

- 最新日报日期：`2026-03-28`
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

当前源文件集合：

- `F:\cursor\research-report\learning\02-macro-synthesis\macro-research-motherboard.md`
- `F:\cursor\research-report\learning\02-macro-synthesis\macro-transmission-map.md`
- `F:\cursor\research-report\learning\02-macro-synthesis\macro-misjudgment-and-falsification.md`
- `F:\cursor\research-report\learning\02-macro-synthesis\macro-to-industry-interfaces.md`
- `F:\cursor\research-report\playbooks\macro-strategy-general-playbook.md`
- `F:\cursor\research-report\capability\macro-strategy-general.md`
- `F:\cursor\research-report\source-registry.json`
- `F:\cursor\research-report\_work\macro-daily\daily-analysis-latest.json`
