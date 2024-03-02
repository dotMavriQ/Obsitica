# Ensure UTF-8 encoding in console to handle emojis
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Habitica API credentials
$USER_ID = "4c1193fa-dadsadasdasdasdcd"
$API_TOKEN = "5486dsfsdf37a1"
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

# Function to parse tasks and return a summary for the target date(s)
function Parse-Tasks {
    param ($apiResponse, $targetDates)

    $summaries = @()

    foreach ($targetDate in $targetDates) {
        $summary = "## Achievements on $targetDate`n"

        # Filter and summarize clicked Habits
        $completedHabits = $apiResponse.data | Where-Object { $_.type -eq "habit" -and $_.updatedAt.StartsWith($targetDate) }
        foreach ($habit in $completedHabits) {
            $counterUp = $habit.counterUp
            $counterDown = $habit.counterDown
            if ($counterUp -gt 0 -or $counterDown -gt 0) {
                $summary += "* Habit clicked: $($habit.text) - Positive: $counterUp, Negative: $counterDown`n"
            }
        }

        # Filter and summarize completed Dailies
        $completedDailies = $apiResponse.data | Where-Object { $_.type -eq "daily" -and $_.completed -and $_.updatedAt.StartsWith($targetDate) }
        if ($completedDailies) {
            $summary += "`n## Completed Dailies`n"
            foreach ($daily in $completedDailies) {
                $summary += "* $($daily.text)`n"
            }
        }

        # Filter and summarize completed To Do's
        $completedTodos = $apiResponse.data | Where-Object { $_.type -eq "todo" -and $_.completed -and [DateTime]::Parse($_.dateCompleted).ToString("yyyy-MM-dd") -eq $targetDate }
        foreach ($todo in $completedTodos) {
            $summary += "* $($todo.text)`n"
        }

        $summaries += $summary
    }

    return $summaries
}

# Function to determine the target date(s) for the markdown file
function Get-TargetDates {
    $currentTime = Get-Date
    $dates = @($currentTime.ToString("yyyy-MM-dd"))
    if ($currentTime.Hour -lt 8) {
        $dates += $currentTime.AddDays(-1).ToString("yyyy-MM-dd")
    }
    return $dates
}

# Function to append achievements to the target date's markdown file in JOURNAL
function Append-To-Markdown {
    param ($achievementsSummaries, $targetDates)

    $journalPath = ".\JOURNAL"

    for ($i=0; $i -lt $targetDates.Count; $i++) {
        $targetDate = $targetDates[$i]
        $achievementsSummary = $achievementsSummaries[$i]
        $targetFileName = Join-Path -Path $journalPath -ChildPath "$targetDate.md"

        if (Test-Path $targetFileName) {
            # Using Add-Content with encoding to ensure emojis are preserved
            $achievementsSummary | Add-Content -Path $targetFileName -Encoding UTF8
        } else {
            Write-Host "No journal file found for target date: $targetDate."
        }
    }
}

# Main script execution
$targetDates = Get-TargetDates
$apiResponse = Fetch-Tasks
$achievementsSummaries = Parse-Tasks -apiResponse $apiResponse -targetDates $targetDates
Append-To-Markdown -achievementsSummaries $achievementsSummaries -targetDates $targetDates
