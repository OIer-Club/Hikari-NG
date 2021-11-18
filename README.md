# Introduction
# 警告：当前版本为预览版，尚未部署Sandbox，请勿在生产环境下使用。建议在Windows Sandbox或Sandboxie中运行。
## 欢迎访问我们的网站[Hikari](https://oj.hikari.owo.fit/)
## 含有MinGW编译器的完整版代码可以从[蓝奏云](https://wwo.lanzoui.com/imK4Vwm7wxg)下载
### Q：什么是Hikari-NG？
A：Hikari-NG是一款分布式的OJ，用户和题目信息等存放在云端，而评测等则在用户本地进行。
![](https://i.loli.net/2021/08/29/kIu1i37tbSsFL5Y.png)



### Q：为什么需要Hikari-NG?
1. 分布式的架构可以阻止别有用心的用户通过提交恶意代码的方式攻击OJ；
2. 分布式的架构可以缩减小微OJ的开支，从而让小微OJ有更大的概率活下去，从而使OIer有更多选择，形成互利共赢的局面。


# Changelog
### V0.1.9
- 数据库安全性全面升级，告别SQL注入
- 大规模数据分段传输
- 评测结果差异对比

### V0.1.7
- 更人性化的交互体验
- 更快速的数据库操作
- 修复若干Bug

### V0.1.3:
- 添加自适应评测时间计算
- 添加Validate Code防作弊系统

感谢 @[swift-zym](https://github.com/swift-zym) 和 @[officeyutong](https://github.com/officeyutong) 提出的宝贵意见！

# Installation
1. 安装[VSCode](https://code.visualstudio.com/)
2. 在VSCode插件市场搜索hikari-VSCode并安装



# Configuration

1.![sample2](https://i.loli.net/2021/09/03/Wv5hM6Vn8jNOulX.png)



2.OJ网址（OJ_URL)请填``1.116.217.97``,密码请填OJ上的密码，用户名请填OJ上的用户名。

# Usage

在代码编写界面右键选中“将代码提交至Hikari”或按Ctrl+F11提交代码，在上方弹出的对话框中输入题目编号，然后回车并耐心等待，一段时间后右下角将弹出评测结果

# Milestones

### Milestone1(Finished)
- [x] User Account Management System
- [x] Distributed Judge System

### Milestone2(Currently working on)
- [x] Time Limit Evaluation System
- [x] Anti-Cheating System
- [ ] Blog System
- [ ] Ranking System

### Milestone3(In Future)
- [ ] Sandbox based on MIPS regulation
- [ ] More...
