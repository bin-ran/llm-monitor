// 主题初始化：首屏渲染前按 localStorage 写入 data-theme，避免闪烁
// 独立成脚本文件是为了让 CSP 可以用 script-src 'self'（不放行内联脚本）
;(function () {
  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const setting = localStorage.getItem('color-schema') || 'light'
  const mode = setting === 'dark' || (setting === 'auto' && prefersDark) ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', mode)
})()
