param(
    [Parameter(Mandatory = $true)]
    [string]$Summary,
    [Parameter(Mandatory = $true)]
    [string]$Question,
    [string]$MetadataJson,
    [switch]$WaitForResponse,
    [int]$PollSeconds,
    [int]$TimeoutSeconds,
    [string]$Consumer
)

$ErrorActionPreference = "Stop"

if (-not $PSBoundParameters.ContainsKey("PollSeconds")) {
    $PollSeconds = 5
}
if (-not $PSBoundParameters.ContainsKey("TimeoutSeconds")) {
    $TimeoutSeconds = 1800
}
if (-not $PSBoundParameters.ContainsKey("Consumer")) {
    $Consumer = "macro-daily"
}

$scriptArgs = @{
    SourceThread = "macro-daily"
    ProjectPath = "F:\Codex\projects\Macro-daily"
    Summary = $Summary
    Question = $Question
    PollSeconds = $PollSeconds
    TimeoutSeconds = $TimeoutSeconds
    Consumer = $Consumer
}
if ($MetadataJson) {
    $scriptArgs.MetadataJson = $MetadataJson
}
if ($WaitForResponse) {
    $scriptArgs.WaitForResponse = $true
}

& "F:\Codex\scripts\invoke-feishu-human-confirmation.ps1" @scriptArgs
