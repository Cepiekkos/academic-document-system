$path = 'c:\Users\acatt\Desktop\academic-document-system\src\main.jsx'
$tmp = 'c:\Users\acatt\Desktop\academic-document-system\src\main.jsx.tmp2'
$content = Get-Content $path -Raw
$old = 'tab === "Overview" && <><div className="detail-section">{editing ?'
$new = 'tab === "Overview" || tab === "Versions" && <><div className="detail-section">{editing ?'
if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Set-Content $tmp $content -NoNewline
    Move-Item $tmp $path -Force
    Write-Host 'Replaced'
} else {
    Write-Host 'Not found'
}
