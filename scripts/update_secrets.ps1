param (
    [string]$EnvFile = "..\.env"
)

# Move to script directory
Set-Location -Path $PSScriptRoot

if (-Not (Test-Path $EnvFile)) {
    Write-Host "Error: Could not find .env file at $EnvFile" -ForegroundColor Red
    exit 1
}

Write-Host "Reading .env file..." -ForegroundColor Cyan

# Parse .env file
$envData = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $key = $Matches[1].Trim()
        $value = $Matches[2].Trim()
        # Remove quotes if present
        if ($value -match '^"(.*)"$') { $value = $Matches[1] }
        elseif ($value -match "^'(.*)'$") { $value = $Matches[1] }

        $envData[$key] = $value
    }
}

$ProjectName = if ($envData.ContainsKey("PROJECT_NAME")) { $envData["PROJECT_NAME"] } else { "npo-ai" }
$Environment = if ($envData.ContainsKey("ENVIRONMENT")) { $envData["ENVIRONMENT"] } else { "dev" }
$Region = if ($envData.ContainsKey("REGION")) { $envData["REGION"] } else { "ap-southeast-2" }

function Update-AWSSecret {
    param (
        [string]$SecretName,
        [string]$SecretValue
    )

    if ([string]::IsNullOrWhiteSpace($SecretValue)) {
        Write-Host "Skipping $SecretName (Value is empty in .env)" -ForegroundColor Yellow
        return
    }

    Write-Host "Updating secret: $SecretName..." -NoNewline
    try {
        aws secretsmanager put-secret-value --secret-id $SecretName --secret-string "$SecretValue" --region $Region | Out-Null
        Write-Host " [SUCCESS]" -ForegroundColor Green
    }
    catch {
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

Write-Host "Updating AWS Secrets Manager in region $Region..." -ForegroundColor Cyan

Update-AWSSecret -SecretName "$ProjectName-$Environment-jira-client-id" -SecretValue $envData["JIRA_CLIENT_ID"]
Update-AWSSecret -SecretName "$ProjectName-$Environment-jira-client-secret" -SecretValue $envData["JIRA_CLIENT_SECRET"]

Update-AWSSecret -SecretName "$ProjectName-$Environment-slack-client-id" -SecretValue $envData["SLACK_CLIENT_ID"]
Update-AWSSecret -SecretName "$ProjectName-$Environment-slack-client-secret" -SecretValue $envData["SLACK_CLIENT_SECRET"]

Write-Host "Done!" -ForegroundColor Cyan
