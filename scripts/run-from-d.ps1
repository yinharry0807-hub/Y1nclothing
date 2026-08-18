# =====================================================================
# 从 D 盘运行工作台（C 盘空间不足时的推荐方式）
# 用法：右键"使用 PowerShell 运行"，或
#   powershell -ExecutionPolicy Bypass -File scripts\run-from-d.ps1
#
# 说明：源码以 C 盘 Codex 工作区为准（Codex 会持续更新）；
#       本脚本把源码同步到 D:\tools\garment-workbench\app 并在此运行，
#       依赖与构建产物全部位于 D 盘，不占 C 盘空间。
# =====================================================================
$ErrorActionPreference = "Stop"

$proj = Split-Path -Parent $PSScriptRoot
$dst = "D:\tools\garment-workbench\app"

if (-not (Test-Path -LiteralPath $dst)) {
  New-Item -ItemType Directory -Path $dst -Force | Out-Null
}

Write-Host "正在同步源码到 $dst ..."
robocopy $proj $dst /E /XD node_modules .next work .git /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) {
  Write-Host "同步失败" -ForegroundColor Red
  exit 1
}

Set-Location $dst

if (-not (Test-Path -LiteralPath "$dst\node_modules")) {
  Write-Host "首次运行：安装依赖（npm，缓存与依赖都在 D 盘）..."
  $env:CI = "true"
  # npm 缓存固定在 D 盘（C 盘空间不足；此配置只在本机脚本生效，不随仓库上传）
  $env:npm_config_cache = "D:\tools\garment-workbench\npm-cache"
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "依赖安装失败" -ForegroundColor Red
    exit 1
  }
}

$mode = $args[0]
if ($mode -eq "build") {
  $env:CI = "true"
  $env:npm_config_cache = "D:\tools\garment-workbench\npm-cache"
  npm run build
} elseif ($mode -eq "start") {
  npm start
} else {
  npm run dev
}
