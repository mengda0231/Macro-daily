param(
    [string]$RequestId,
    [int]$Limit,
    [string]$Consumer
)

$ErrorActionPreference = "Stop"

if (-not $PSBoundParameters.ContainsKey("Limit")) {
    $Limit = 10
}
if (-not $PSBoundParameters.ContainsKey("Consumer")) {
    $Consumer = "macro-daily"
}

$args = @(
    "F:\Codex\projects\feishu-codex-remote\scripts\archive_cli.py",
    "--root", "F:\Codex\projects\feishu-codex-remote",
    "claim-feishu-approval-responses",
    "--source-thread", "macro-daily",
    "--limit", $Limit,
    "--consumer", $Consumer
)
if ($RequestId) {
    $args += @("--request-id", $RequestId)
}

& "D:\anaconda\python.exe" @args
