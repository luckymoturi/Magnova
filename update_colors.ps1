# Color Scheme Update Script
# This script replaces ALL colors with monochrome (black/white/gray) + teal only

$frontendPath = "C:\Users\sandi\Downloads\Magnovaa\magnova_mobile_purchase\frontend\src"

# Define replacements - process most specific patterns first
$replacements = [ordered]@{
    # Green/Emerald -> Teal (for positive states)
    'emerald-50' = 'teal-50'
    'emerald-100' = 'teal-100'
    'emerald-200' = 'teal-200'
    'emerald-300' = 'teal-300'
    'emerald-400' = 'teal-400'
    'emerald-500' = 'teal-500'
    'emerald-600' = 'teal-600'
    'emerald-700' = 'teal-700'
    'emerald-800' = 'teal-800'
    'emerald-900' = 'teal-900'
    
    'green-50' = 'teal-50'
    'green-100' = 'teal-100'
    'green-200' = 'teal-200'
    'green-300' = 'teal-300'
    'green-400' = 'teal-400'
    'green-500' = 'teal-500'
    'green-600' = 'teal-600'
    'green-700' = 'teal-700'
    'green-800' = 'teal-800'
    'green-900' = 'teal-900'
    
    # Orange/Amber -> Neutral gray (for warning/secondary states)
    'orange-50' = 'neutral-100'
    'orange-100' = 'neutral-200'
    'orange-200' = 'neutral-300'
    'orange-300' = 'neutral-400'
    'orange-400' = 'neutral-500'
    'orange-500' = 'neutral-600'
    'orange-600' = 'neutral-700'
    'orange-700' = 'neutral-800'
    'orange-800' = 'neutral-900'
    'orange-900' = 'neutral-900'
    
    'amber-50' = 'neutral-100'
    'amber-100' = 'neutral-200'
    'amber-200' = 'neutral-300'
    'amber-300' = 'neutral-400'
    'amber-400' = 'neutral-500'
    'amber-500' = 'neutral-600'
    'amber-600' = 'neutral-700'
    'amber-700' = 'neutral-800'
    'amber-800' = 'neutral-900'
    'amber-900' = 'neutral-900'
    
    # Red -> Neutral dark (for destructive states)
    'red-50' = 'neutral-100'
    'red-100' = 'neutral-200'
    'red-200' = 'neutral-300'
    'red-300' = 'neutral-400'
    'red-400' = 'neutral-500'
    'red-500' = 'neutral-600'
    'red-600' = 'neutral-800'
    'red-700' = 'neutral-900'
    'red-800' = 'neutral-900'
    'red-900' = 'neutral-900'
    
    # Yellow -> Neutral gray
    'yellow-50' = 'neutral-100'
    'yellow-100' = 'neutral-200'
    'yellow-200' = 'neutral-300'
    'yellow-300' = 'neutral-400'
    'yellow-400' = 'neutral-500'
    'yellow-500' = 'neutral-600'
    'yellow-600' = 'neutral-700'
    'yellow-700' = 'neutral-800'
}

# Get all JS, JSX files
$files = Get-ChildItem -Path $frontendPath -Include "*.js", "*.jsx" -Recurse

$totalFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($old in $replacements.Keys) {
        $new = $replacements[$old]
        if ($content -match [regex]::Escape($old)) {
            $content = $content -replace [regex]::Escape($old), $new
            $fileReplacements++
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalFiles++
        $totalReplacements += $fileReplacements
        Write-Host "Updated: $($file.Name) - $fileReplacements replacements"
    }
}

Write-Host "`nComplete!"
Write-Host "Files updated: $totalFiles"
Write-Host "Total replacements: $totalReplacements"
