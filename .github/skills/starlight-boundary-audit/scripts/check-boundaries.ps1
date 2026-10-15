# PowerShell script to audit Starlight Engine architectural boundaries (ADR-SL-016, ADR-SL-017, ADR-SL-018)
# Safe, idempotent boundary checker for C# project files and source code.
[CmdletBinding()]
param(
    [string]$SourcePath = "src"
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================================="
Write-Host " Starlight Engine -- Architectural Boundary Audit Tool"
Write-Host " Enforcing ADR-SL-016 (MonoGame Isolation) and Build Boundary"
Write-Host "=========================================================="

$WorkspaceRoot = (Get-Location).Path
$FullSourcePath = Join-Path $WorkspaceRoot $SourcePath

if (-not (Test-Path -LiteralPath $FullSourcePath)) {
    Write-Host "[INFO] Source directory '$SourcePath' does not exist yet."
    Write-Host "[INFO] No boundary violations detected (clean baseline state)."
    exit 0
}

$ViolationsFound = 0

# 1. Projects forbidden from referencing Microsoft.Xna.Framework or native backends
$PureAssemblies = @(
    "Starlight.Core",
    "Starlight.ProjectModel",
    "Starlight.Events",
    "Starlight.Events.Compiler",
    "Starlight.Editor.Protocol",
    "Starlight.Editor.Host",
    "Starlight.Build"
)

# Allowed MonoGame adapters / targets
$AllowedMonoGameAssemblies = @(
    "Starlight.Runtime.MonoGame",
    "Starlight.Rendering",
    "Starlight.Targets"
)

# Native backend identifiers forbidden across portable layers
$ForbiddenBackends = @(
    "Microsoft.Xna.Framework",
    "DesktopGL",
    "WindowsDX",
    "SharpDX",
    "SDL",
    "OpenGL",
    "DirectX",
    "System.Windows.Forms"
)

Write-Host "`n[1/3] Auditing .csproj project references..."

$CsprojFiles = Get-ChildItem -LiteralPath $FullSourcePath -Filter "*.csproj" -Recurse -File -ErrorAction SilentlyContinue

if ($null -ne $CsprojFiles) {
    foreach ($proj in $CsprojFiles) {
        $projName = [System.IO.Path]::GetFileNameWithoutExtension($proj.Name)
        $content = Get-Content -LiteralPath $proj.FullName -Raw

        $isPure = $false
        foreach ($pure in $PureAssemblies) {
            if ($projName -like "*$pure*") {
                $isPure = $true
                break
            }
        }

        if ($isPure) {
            foreach ($backend in $ForbiddenBackends) {
                if ($content -match "<PackageReference\s+Include=""[^""]*$backend[^""]*""" -or
                    $content -match "<Reference\s+Include=""[^""]*$backend[^""]*""") {
                    Write-Host "  [VIOLATION] Pure project '$projName' references forbidden backend '$backend': $($proj.FullName)"
                    $ViolationsFound++
                }
            }
        }
    }
}

Write-Host "`n[2/3] Auditing C# source code for prohibited types in pure assemblies..."

$CsFiles = Get-ChildItem -LiteralPath $FullSourcePath -Filter "*.cs" -Recurse -File -ErrorAction SilentlyContinue

$ForbiddenCsTokensInPure = @(
    @{ Name = "GameTime"; Pattern = '\bGameTime\b'; Reason = "Use FrameTime (Delta, Total, FrameIndex) instead (ADR-SL-010/016)" },
    @{ Name = "Microsoft.Xna.Framework"; Pattern = '\busing\s+Microsoft\.Xna\.Framework\b'; Reason = "MonoGame access restricted to adapter layers (ADR-SL-016)" },
    @{ Name = "GameComponent"; Pattern = ':\s*DrawableGameComponent\b|:\s*GameComponent\b'; Reason = "Domain objects must not inherit from GameComponent (ADR-SL-016)" },
    @{ Name = "IsConsole flag"; Pattern = '\bIsConsole\b'; Reason = "Platform capabilities must use IPlatformCapabilities descriptor (ADR-SL-017)" },
    @{ Name = "#if CONSOLE"; Pattern = '^\s*#\s*if\s+.*CONSOLE.*'; Reason = "Console branching must use IPlatformCapabilities and Swap Model (ADR-SL-017/018)" }
)

if ($null -ne $CsFiles) {
    foreach ($file in $CsFiles) {
        $parentPath = $file.FullName
        
        # Check if file belongs to an allowed MonoGame adapter
        $isAdapter = $false
        foreach ($adapter in $AllowedMonoGameAssemblies) {
            if ($parentPath -match [regex]::Escape($adapter)) {
                $isAdapter = $true
                break
            }
        }

        $lines = Get-Content -LiteralPath $file.FullName
        $lineNum = 0
        foreach ($line in $lines) {
            $lineNum++
            
            # Check forbidden tokens in pure assemblies
            if (-not $isAdapter) {
                foreach ($token in $ForbiddenCsTokensInPure) {
                    if ($line -match $token.Pattern) {
                        Write-Host "  [VIOLATION] $($file.FullName) line ${lineNum} -- Found $($token.Name): $($token.Reason)"
                        $ViolationsFound++
                    }
                }
            }

            # Check private reflection against MonoGame (forbidden everywhere)
            if ($line -match 'typeof\(.*Microsoft\.Xna\.Framework.*\)\.GetField\(' -or 
                $line -match 'typeof\(.*Microsoft\.Xna\.Framework.*\)\.GetMethod\(.*BindingFlags\.NonPublic') {
                Write-Host "  [VIOLATION] $($file.FullName) line ${lineNum} -- Private reflection against MonoGame is strictly forbidden (ADR-SL-018)"
                $ViolationsFound++
            }
        }
    }

    Write-Host "`n[3/3] Auditing Behavior lifecycle contracts..."

    foreach ($file in $CsFiles) {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        if ($content -match 'interface\s+IBehavior\b|class\s+\w+\s*:\s*.*\bIBehavior\b') {
            if ($content -match 'PreEvents\s*\(\s*GameTime\b' -or $content -match 'PostEvents\s*\(\s*GameTime\b') {
                Write-Host "  [VIOLATION] $($file.FullName) -- IBehavior PreEvents/PostEvents must receive FrameTime, not GameTime (ADR-SL-010/016)"
                $ViolationsFound++
            }
        }
    }
} else {
    Write-Host "`n[3/3] No C# source files found in '$SourcePath' yet."
}

Write-Host "`n=========================================================="
if ($ViolationsFound -eq 0) {
    Write-Host " Boundary Audit PASSED: 0 violations found."
    Write-Host " Code adheres to ADR-SL-016, ADR-SL-017, and ADR-SL-018."
    Write-Host "=========================================================="
    exit 0
} else {
    Write-Host " Boundary Audit FAILED: $ViolationsFound violation(s) detected."
    Write-Host " Fix violations before merging or passing QA gates."
    Write-Host "=========================================================="
    exit 1
}
