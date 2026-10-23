// 主题初始化：在首屏渲染前按 localStorage 决定是否启用深色模式
// 独立成脚本文件是为了让 CSP 可以用 script-src 'self'（不放行内联脚本）
;(function () {
  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const setting = localStorage.getItem('color-schema') || 'auto'
  if (setting === 'dark' || (prefersDark && setting !== 'light'))
    document.documentElement.classList.toggle('dark', true)
})()
