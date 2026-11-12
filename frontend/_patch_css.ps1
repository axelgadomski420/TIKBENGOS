$path = "src\app\back-office\events\pages\detail\event-detail.component.css"
$bytes = [System.IO.File]::ReadAllBytes($path)
$content = [System.Text.Encoding]::UTF8.GetString($bytes)

# Find the exact marker and insert after it
$marker = "color: #a71d33;`r`n}`r`n`r`n/* =="
$newCss = @"
color: #a71d33;
}

/* Small variant -- Transit-matched for inline table actions */
.action-button--sm {
  min-height: 30px;
  padding: 0.28rem 0.62rem;
  font-size: 0.72rem;
}

/* Primary button -- Transit-matched (create-button from destinations-list) */
.detail-primary-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0.68rem 1.15rem;
  border-radius: 50px;
  border: 1px solid transparent;
  background: linear-gradient(135deg, #3a9282, #2f7a6e);
  color: #fff;
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 700;
  box-shadow: 0 12px 24px -18px rgba(58, 146, 130, 0.9);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  cursor: pointer;
}
.detail-primary-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 30px -18px rgba(58, 146, 130, 0.96);
  filter: saturate(108%);
}

/* Secondary button -- Transit-matched */
.detail-secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  text-decoration: none;
  border: 1px solid #e2e8f0;
  background: #f1f5f9;
  color: #475569;
}
.detail-secondary-button:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

/* ==
"@

if ($content.Contains($marker)) {
  $content = $content.Replace($marker, $newCss)
  $outBytes = [System.Text.Encoding]::UTF8.GetBytes($content)
  [System.IO.File]::WriteAllBytes($path, $outBytes)
  Write-Host "SUCCESS: CSS inserted"
} else {
  Write-Host "MARKER NOT FOUND"
  # Show context around line 310
  $lines = $content.Split("`n")
  for ($i = 308; $i -lt 315; $i++) {
    $escaped = $lines[$i] -replace "`r", "[CR]"
    Write-Host "Line $($i+1): $escaped"
  }
}
