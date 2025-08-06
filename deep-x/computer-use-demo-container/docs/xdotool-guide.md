# xdotool 自动化工具使用指南

xdotool 是这个演示容器中的核心桌面自动化工具，提供了强大的鼠标、键盘和窗口操作功能。本指南将详细介绍如何在 Daytona Computer Use Demo Container 环境中使用 xdotool。

## 目录

- [基础概念](#基础概念)
- [鼠标操作](#鼠标操作)
- [键盘操作](#键盘操作)
- [窗口管理](#窗口管理)
- [高级技巧](#高级技巧)
- [实际应用示例](#实际应用示例)
- [调试技巧](#调试技巧)
- [常见问题](#常见问题)

## 基础概念

### 什么是 xdotool

xdotool 是一个命令行工具，可以模拟键盘输入、鼠标活动，以及操作窗口。它特别适合在 X11 环境中进行桌面自动化。

### 环境要求

在容器中使用 xdotool 需要：

- `DISPLAY=:1` 环境变量已设置
- X11 服务器正在运行（Xvfb）
- 桌面环境已启动（XFCE4）

### 验证环境

```bash
# 检查 DISPLAY 环境变量
echo $DISPLAY

# 检查 xdotool 是否可用
xdotool version

# 检查窗口管理器
wmctrl -m
```

## 鼠标操作

### 基本鼠标命令

#### 获取鼠标位置

```bash
# 获取当前鼠标位置
xdotool getmouselocation

# 获取位置并存储到变量
eval $(xdotool getmouselocation --shell)
echo "X=$X, Y=$Y, Screen=$SCREEN, Window=$WINDOW"
```

#### 移动鼠标

```bash
# 移动到绝对坐标
xdotool mousemove 640 360

# 相对移动（相对当前位置）
xdotool mousemove_relative 100 50

# 移动到屏幕中心
screen_width=1280
screen_height=720
center_x=$((screen_width / 2))
center_y=$((screen_height / 2))
xdotool mousemove $center_x $center_y
```

#### 鼠标点击

```bash
# 左键点击
xdotool click 1

# 右键点击
xdotool click 3

# 中键点击
xdotool click 2

# 双击
xdotool click --repeat 2 1

# 在指定位置点击
xdotool mousemove 500 300 click 1
```

#### 鼠标拖拽

```bash
# 按下左键（开始拖拽）
xdotool mousedown 1

# 移动到目标位置
xdotool mousemove 800 400

# 释放左键（结束拖拽）
xdotool mouseup 1

# 一步完成拖拽操作
xdotool mousemove 100 100 mousedown 1 mousemove 300 300 mouseup 1
```

#### 滚轮操作

```bash
# 向上滚动
xdotool click 4

# 向下滚动
xdotool click 5

# 滚动多次
xdotool click --repeat 3 4  # 向上滚动3次
```

### 高级鼠标技巧

#### 等待并点击

```bash
# 等待2秒后点击
sleep 2 && xdotool click 1

# 移动、等待、点击的组合
xdotool mousemove 640 360 sleep 1 click 1
```

#### 基于窗口的鼠标操作

```bash
# 在特定窗口中点击
window_id=$(xdotool search --name "Terminal")
xdotool mousemove --window $window_id 50 30 click 1
```

## 键盘操作

### 基本键盘命令

#### 输入文本

```bash
# 输入简单文本
xdotool type "Hello World"

# 输入包含特殊字符的文本
xdotool type "echo 'Hello from xdotool!'"

# 设置输入延迟（每个字符之间100毫秒）
xdotool type --delay 100 "Slow typing"
```

#### 按键操作

```bash
# 单个按键
xdotool key Return
xdotool key Escape
xdotool key Tab
xdotool key space

# 功能键
xdotool key F1
xdotool key F11  # 通常用于全屏切换

# 方向键
xdotool key Up Down Left Right
```

#### 组合键

```bash
# Ctrl 组合键
xdotool key ctrl+c     # 复制
xdotool key ctrl+v     # 粘贴
xdotool key ctrl+a     # 全选
xdotool key ctrl+s     # 保存

# Alt 组合键
xdotool key alt+Tab    # 切换窗口
xdotool key alt+F4     # 关闭窗口

# 多键组合
xdotool key ctrl+alt+t  # 打开终端（XFCE4）
xdotool key ctrl+alt+l  # 锁屏

# 系统级组合键
xdotool key Super_L    # Windows/Super 键
```

#### 特殊字符输入

```bash
# 使用 Unicode 输入特殊字符
xdotool type "Copyright: "
xdotool key U00A9      # © 符号

# 输入换行
xdotool key Return

# Tab 字符
xdotool key Tab
```

### 高级键盘技巧

#### 按键序列

```bash
# 复杂的按键序列
xdotool key ctrl+a type "new content" key Return
```

#### 重复按键

```bash
# 重复按键
xdotool key --repeat 3 BackSpace  # 删除3个字符
xdotool key --repeat 5 Right      # 向右移动5次
```

## 窗口管理

### 窗口查找

```bash
# 根据窗口标题查找
window_id=$(xdotool search --name "Terminal")
echo "Terminal window ID: $window_id"

# 查找包含特定文本的窗口
window_id=$(xdotool search --name "Firefox")

# 查找类名
window_id=$(xdotool search --class "xfce4-terminal")

# 列出所有窗口
xdotool search --all --name ".*"
```

### 窗口操作

#### 激活和聚焦

```bash
# 激活窗口（带到前台）
window_id=$(xdotool search --name "Terminal")
xdotool windowactivate $window_id

# 聚焦窗口（准备接收键盘输入）
xdotool windowfocus $window_id

# 激活并聚焦
xdotool windowactivate --sync $window_id
```

#### 窗口尺寸和位置

```bash
# 移动窗口
xdotool windowmove $window_id 100 100

# 调整窗口大小
xdotool windowsize $window_id 800 600

# 最大化窗口
xdotool windowstate $window_id add,maximized_vert,maximized_horz

# 最小化窗口
xdotool windowminimize $window_id

# 获取窗口信息
xdotool getwindowgeometry $window_id
```

### 窗口管理实例

#### 打开应用并操作

```bash
# 打开终端
xfce4-terminal &
sleep 2

# 找到终端窗口
terminal_id=$(xdotool search --name "Terminal")

# 激活终端
xdotool windowactivate $terminal_id

# 在终端中执行命令
xdotool type "ls -la"
xdotool key Return
```

#### 窗口切换

```bash
# 获取当前活动窗口
active_window=$(xdotool getactivewindow)

# 切换到下一个窗口
xdotool key alt+Tab

# 等待并切换回原窗口
sleep 2
xdotool windowactivate $active_window
```

## 高级技巧

### 条件执行

#### 等待窗口出现

```bash
# 等待特定窗口出现
wait_for_window() {
    local window_name="$1"
    local timeout="$2"
    local count=0
    
    while [ $count -lt $timeout ]; do
        if xdotool search --name "$window_name" > /dev/null 2>&1; then
            echo "Window '$window_name' found"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    echo "Timeout waiting for window '$window_name'"
    return 1
}

# 使用示例
xfce4-terminal &
wait_for_window "Terminal" 10
```

#### 条件检查

```bash
# 检查窗口是否存在
if xdotool search --name "Firefox" > /dev/null 2>&1; then
    echo "Firefox is running"
    firefox_id=$(xdotool search --name "Firefox")
    xdotool windowactivate $firefox_id
else
    echo "Starting Firefox"
    firefox &
fi
```

### 循环和自动化

#### 重复操作

```bash
# 重复点击操作
for i in {1..5}; do
    xdotool mousemove 640 360 click 1
    sleep 1
done

# 遍历多个位置
positions=("100,100" "200,200" "300,300")
for pos in "${positions[@]}"; do
    x=$(echo $pos | cut -d',' -f1)
    y=$(echo $pos | cut -d',' -f2)
    xdotool mousemove $x $y click 1
    sleep 0.5
done
```

### 屏幕区域操作

#### 基于屏幕区域的操作

```bash
# 获取屏幕尺寸
screen_info=$(xdpyinfo | grep dimensions)
echo "Screen info: $screen_info"

# 点击屏幕的四个角
xdotool mousemove 0 0 click 1        # 左上角
xdotool mousemove 1279 0 click 1     # 右上角
xdotool mousemove 0 719 click 1      # 左下角
xdotool mousemove 1279 719 click 1   # 右下角
```

## 实际应用示例

### 示例1：自动化文本编辑

```bash
#!/bin/bash
# 自动化文本编辑示例

# 打开文本编辑器
mousepad &
sleep 3

# 找到编辑器窗口
editor_id=$(xdotool search --name "Mousepad")
xdotool windowactivate $editor_id

# 输入内容
xdotool type "# This is a test file"
xdotool key Return Return

xdotool type "Generated by xdotool at: "
xdotool type "$(date)"
xdotool key Return

# 保存文件
xdotool key ctrl+s
sleep 1
xdotool type "test_file.txt"
xdotool key Return
```

### 示例2：浏览器自动化

```bash
#!/bin/bash
# 浏览器自动化示例

# 打开浏览器
chromium-browser &
sleep 5

# 找到浏览器窗口
browser_id=$(xdotool search --name "Chromium")
xdotool windowactivate $browser_id

# 在地址栏输入 URL
xdotool key ctrl+l
sleep 1
xdotool type "https://github.com/daytonaio/daytona"
xdotool key Return

# 等待页面加载
sleep 5

# 滚动页面
xdotool click --repeat 3 5  # 向下滚动
sleep 2
xdotool click --repeat 3 4  # 向上滚动
```

### 示例3：文件管理自动化

```bash
#!/bin/bash
# 文件管理自动化示例

# 打开文件管理器
thunar &
sleep 3

# 找到文件管理器窗口
fm_id=$(xdotool search --name "File Manager")
xdotool windowactivate $fm_id

# 导航到 home 目录
xdotool key ctrl+h
sleep 1

# 创建新文件夹
xdotool key ctrl+shift+n
sleep 1
xdotool type "automated_folder"
xdotool key Return

# 进入新文件夹
xdotool key Return
sleep 1

# 在文件夹中创建文件
xdotool key F4  # 打开终端
sleep 2
xdotool type "touch new_file.txt"
xdotool key Return
xdotool type "exit"
xdotool key Return
```

### 示例4：截图自动化

```bash
#!/bin/bash
# 截图自动化示例

# 创建截图目录
mkdir -p ~/screenshots

# 全屏截图
scrot ~/screenshots/fullscreen_$(date +%Y%m%d_%H%M%S).png

# 等待2秒，然后截图特定区域
sleep 2
scrot -s ~/screenshots/selection_$(date +%Y%m%d_%H%M%S).png

# 截图特定窗口
terminal_id=$(xdotool search --name "Terminal")
if [ -n "$terminal_id" ]; then
    xdotool windowactivate $terminal_id
    sleep 1
    scrot -u ~/screenshots/terminal_$(date +%Y%m%d_%H%M%S).png
fi
```

## 调试技巧

### 调试模式

```bash
# 启用详细输出
set -x

# 添加调试信息
debug_log() {
    echo "[DEBUG] $1" >&2
}

debug_log "Moving mouse to center"
xdotool mousemove 640 360

debug_log "Clicking left button"
xdotool click 1
```

### 错误处理

```bash
# 检查命令执行结果
if xdotool mousemove 640 360; then
    echo "Mouse move successful"
else
    echo "Mouse move failed"
    exit 1
fi

# 使用 trap 处理错误
error_handler() {
    echo "Error occurred at line $1"
    exit 1
}
trap 'error_handler $LINENO' ERR
```

### 测试和验证

```bash
# 验证窗口存在
verify_window() {
    local window_name="$1"
    if xdotool search --name "$window_name" > /dev/null 2>&1; then
        echo "✓ Window '$window_name' found"
        return 0
    else
        echo "✗ Window '$window_name' not found"
        return 1
    fi
}

# 验证鼠标位置
verify_mouse_position() {
    local expected_x="$1"
    local expected_y="$2"
    local tolerance="${3:-5}"
    
    eval $(xdotool getmouselocation --shell)
    
    if [ $((X - expected_x)) -le $tolerance ] && [ $((Y - expected_y)) -le $tolerance ]; then
        echo "✓ Mouse at expected position ($X, $Y)"
        return 0
    else
        echo "✗ Mouse not at expected position. Expected: ($expected_x, $expected_y), Actual: ($X, $Y)"
        return 1
    fi
}
```

## 常见问题

### Q: xdotool 命令不响应或失败

**A**: 检查以下几点：

1. **DISPLAY 环境变量**：

   ```bash
   echo $DISPLAY  # 应该输出 :1
   export DISPLAY=:1
   ```

2. **X11 权限**：

   ```bash
   xauth list
   echo $XAUTHORITY
   ```

3. **进程状态**：

   ```bash
   ps aux | grep Xvfb
   ps aux | grep xfce4
   ```

### Q: 窗口查找失败

**A**: 尝试不同的查找方法：

```bash
# 方法1：按名称查找
xdotool search --name "Terminal"

# 方法2：按类名查找
xdotool search --class "xfce4-terminal"

# 方法3：列出所有窗口
wmctrl -l

# 方法4：使用部分匹配
xdotool search --name ".*Terminal.*"
```

### Q: 鼠标或键盘操作没有效果

**A**: 确保目标窗口处于活动状态：

```bash
# 先激活窗口
window_id=$(xdotool search --name "Terminal")
xdotool windowactivate --sync $window_id

# 然后进行操作
xdotool type "hello"
```

### Q: 在容器中使用 xdotool 的最佳实践

**A**: 遵循以下最佳实践：

1. **总是设置正确的环境变量**：

   ```bash
   export DISPLAY=:1
   export XAUTHORITY=/home/daytona/.Xauthority
   ```

2. **使用适当的延迟**：

   ```bash
   xdotool mousemove 640 360
   sleep 0.5  # 给操作时间生效
   xdotool click 1
   ```

3. **验证操作结果**：

   ```bash
   xdotool type "test"
   # 验证是否成功输入
   ```

4. **使用错误处理**：

   ```bash
   if ! xdotool search --name "Terminal" > /dev/null 2>&1; then
       echo "Terminal not found, starting one..."
       xfce4-terminal &
       sleep 2
   fi
   ```

## 总结

xdotool 是一个强大的桌面自动化工具，在 Daytona Computer Use Demo Container 中可以实现：

- **鼠标自动化**：精确的位置控制和点击操作
- **键盘自动化**：文本输入和快捷键操作
- **窗口管理**：查找、激活、调整窗口
- **复杂自动化**：组合多种操作实现复杂任务

通过理解这些基础概念和技巧，您可以创建强大的桌面自动化脚本，充分利用 xdotool 的功能来简化重复性任务和测试工作。

## 相关资源

- [xdotool 官方文档](https://github.com/jordansissel/xdotool)
- [XFCE4 键盘快捷键](https://docs.xfce.org/xfce/xfce4-settings/keyboard)
- [X11 环境变量](https://www.x.org/releases/X11R7.6/doc/libX11/specs/libX11/libX11.html)
- [demo.sh 脚本示例](../scripts/demo.sh)
