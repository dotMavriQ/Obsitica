# Ensure UTF-8 encoding in console to handle emojis
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Habitica API credentials
$USER_ID = "your user ID"
$API_TOKEN = "your API token"
$API_URL = "https://habitica.com/api/v3"

# Function to fetch today's completed tasks from Habitica API
function Fetch-Tasks {
    $headers = @{
        "x-api-user" = $USER_ID
        "x-api-key" = $API_TOKEN
    }

    $response = Invoke-RestMethod -Uri "$API_URL/tasks/user" -Headers $headers
    return $response
}

# Function to parse tasks and return a summary for today
function Parse-Tasks {
    param ($apiResponse)
    
    $today = (Get-Date).ToString("yyyy-MM-dd")
    $summary = "## Achievements on $today`n"

    # Filter and summarize clicked Habits
    $completedHabits = $apiResponse.data | Where-Object { $_.type -eq "habit" -and $_.updatedAt.StartsWith($today) }
    foreach ($habit in $completedHabits) {
        $counterUp = $habit.counterUp
        $counterDown = $habit.counterDown
        if ($counterUp -gt 0 -or $counterDown -gt 0) {
            $summary += "* Habit clicked: $($habit.text) - Positive: $counterUp, Negative: $counterDown`n"
        }
    }

    # Filter and summarize completed Dailies
    $completedDailies = $apiResponse.data | Where-Object { $_.type -eq "daily" -and $_.completed -and $_.updatedAt.StartsWith($today) }
    if ($completedDailies) {
        $summary += "`n## Completed Dailies`n"
        foreach ($daily in $completedDailies) {
            $summary += "* $($daily.text)`n"
        }
    }

    # Filter and summarize completed To Do's
    $completedTodos = $apiResponse.data | Where-Object { $_.type -eq "todo" -and $_.completed }
    foreach ($todo in $completedTodos) {
        $completedDate = [DateTime]::Parse($todo.dateCompleted)
        if ($completedDate.ToString("yyyy-MM-dd") -eq $today) {
            $summary += "* $($todo.text)`n"
        }
    }

    return $summary
}

# Function to append achievements to today's markdown file in JOURNAL
function Append-To-Markdown {
    param ($achievementsSummary)

    $journalPath = ".\JOURNAL"
    $todayFileName = "$journalPath\" + (Get-Date).ToString("yyyy-MM-dd") + ".md"

    if (Test-Path $todayFileName) {
        # Using Out-File with encoding to ensure emojis are preserved
        $achievementsSummary | Out-File -FilePath $todayFileName -Append -Encoding UTF8
    } else {
        Write-Host "No journal file found for today."
    }
}

# Main script execution
$apiResponse = Fetch-Tasks
$achievementsSummary = Parse-Tasks -apiResponse $apiResponse
Append-To-Markdown -achievementsSummary $achievementsSummary
