<#
.SYNOPSIS
  Push the current branch, open a pull request, and have GitHub merge it once CI passes.

.DESCRIPTION
  One command for the whole path from a finished branch to main:

    1. pushes the branch (never forced)
    2. opens a pull request against main, or reuses the one that is already open
    3. arms auto-merge, so GitHub merges it when the required `verify` check passes

  Render then deploys the merge commit once its own checks pass. The pull request
  and the CI check stay in the path; only the waiting and the clicking go away.

  Run it from the repository root:

    npm run ship
    npm run ship -- -Title "Add the invite screen"
    npm run ship -- -BodyFile pr-body.md
    npm run ship -- -NoAutoMerge        open the PR but merge it yourself later
    npm run ship -- -DryRun             show what would happen, change nothing

  Needs the GitHub CLI (`gh auth login` done once) and, for auto-merge, the
  repository setting Settings > General > Pull Requests > "Allow auto-merge".

.PARAMETER Title
  Pull request title. By default GitHub fills it from the commits.

.PARAMETER BodyFile
  Path to a file holding the pull request description.

.PARAMETER NoAutoMerge
  Open the pull request but do not arm auto-merge.

.PARAMETER DryRun
  Run the checks and print the commands that would run. Pushes and creates nothing.
#>
[CmdletBinding()]
param(
  [string]$Title,
  [string]$BodyFile,
  [switch]$NoAutoMerge,
  [switch]$DryRun
)

# Not "Stop": in Windows PowerShell 5.1 any text a native command (git, gh) writes
# to stderr becomes a terminating error under "Stop", even when the command
# succeeded. `gh auth status` and `git push` both write to stderr on success. Every
# native call below checks its exit code explicitly instead.
$ErrorActionPreference = "Continue"

function Fail([string]$Message) {
  Write-Host "ship: $Message" -ForegroundColor Red
  exit 1
}

function Step([string]$Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

# Runs a native command, or only prints it with -DryRun. Stops on a non-zero exit.
function Invoke-Step([string]$Display, [scriptblock]$Action) {
  if ($DryRun) {
    Write-Host "[dry run] $Display"
    return
  }
  & $Action
  if ($LASTEXITCODE -ne 0) {
    Fail "'$Display' failed (exit code $LASTEXITCODE)."
  }
}

# ---- Checks first: refuse before anything leaves the machine ----------------------

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail "git is not installed or not on PATH." }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Fail "the GitHub CLI (gh) is not installed or not on PATH. Install it with: winget install --id GitHub.cli"
}

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) { Fail "this is not a git repository." }

$branch = (git branch --show-current).Trim()
if (-not $branch) { Fail "HEAD is detached. Switch to a branch first." }
if ($branch -eq "main") {
  Fail "you are on main. Ship from a branch: git switch -c my-change, commit there, then run this again."
}

$dirty = git status --porcelain
if ($dirty) {
  Write-Host ($dirty | Out-String)
  Fail "there are uncommitted changes (listed above). Commit or stash them: only committed work is shipped."
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) { Fail "gh is not signed in. Run: gh auth login" }

git fetch origin main --quiet
if ($LASTEXITCODE -ne 0) { Fail "could not fetch origin/main. Check your network and remote." }

$ahead = [int](git rev-list --count "origin/main..HEAD")
$behind = [int](git rev-list --count "HEAD..origin/main")
if ($ahead -eq 0) { Fail "branch '$branch' has nothing that main does not already have." }
if ($BodyFile -and -not (Test-Path -LiteralPath $BodyFile)) { Fail "BodyFile '$BodyFile' does not exist." }

Step "Shipping '$branch': $ahead commit(s) ahead of main, $behind behind."
if ($behind -gt 0) {
  Write-Host "    main has moved on. GitHub merges anyway unless there is a conflict; if there is, rebase or merge main into this branch."
}

# ---- Push, open the PR, arm auto-merge ---------------------------------------------

Step "Pushing the branch"
Invoke-Step "git push --set-upstream origin $branch" { git push --set-upstream origin $branch }

Step "Looking for an open pull request"
# --jq prints one "number<TAB>url" line, or nothing when there is no open PR. (Parsing
# the JSON in PowerShell 5.1 is unreliable: an empty array comes back as one object.
# The program has no double quotes because 5.1 mangles them when passing arguments.)
$existing = gh pr list --head $branch --base main --state open --limit 1 --json number,url --jq '.[0] | select(. != null) | [.number, .url] | @tsv'
if ($LASTEXITCODE -ne 0) { Fail "could not list pull requests." }

if ($existing) {
  $parts = ($existing | Select-Object -First 1).Trim() -split "`t", 2
  $number = $parts[0]
  $url = $parts[1]
  Write-Host "    reusing #$number $url"
}
else {
  $createArgs = @("pr", "create", "--base", "main", "--head", $branch)
  if ($Title) { $createArgs += @("--title", $Title) } else { $createArgs += "--fill" }
  if ($BodyFile) { $createArgs += @("--body-file", $BodyFile) } elseif ($Title) { $createArgs += @("--body", "") }

  Step "Opening a pull request"
  if ($DryRun) {
    Write-Host "[dry run] gh $($createArgs -join ' ')"
    $number = "<number>"
    $url = "<url>"
  }
  else {
    $url = (gh @createArgs | Select-Object -Last 1).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $url) { Fail "could not open the pull request." }
    $number = ($url -split "/")[-1]
    Write-Host "    opened #$number $url"
  }
}

if ($NoAutoMerge) {
  Write-Host ""
  Write-Host "Pull request is open and will NOT merge by itself: $url" -ForegroundColor Yellow
  exit 0
}

Step "Arming auto-merge"
if ($DryRun) {
  Write-Host "[dry run] gh pr merge $number --auto --merge"
}
else {
  gh pr merge $number --auto --merge
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ship: the pull request is open ($url) but auto-merge could not be armed." -ForegroundColor Red
    Write-Host "      Most likely 'Allow auto-merge' is off: Settings > General > Pull Requests."
    Write-Host "      Until then, merge it by hand on GitHub once the checks pass."
    exit 1
  }
}

Write-Host ""
Write-Host "Done. #$number merges by itself when the 'verify' check passes; Render deploys it after that." -ForegroundColor Green
Write-Host "      $url"
Write-Host "      Afterwards: git switch main; git pull; git branch -d $branch"
