# Ensure UTF-8 encoding in console to handle emojis
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Habitica API credentials
$USER_ID = "4cxxxxxxxxxxxxxxxxxxxxxxxxxxd"
$API_TOKEN = "5xxxxxxxxxxxxxxxxxx337a1"
$API_URL = "https://habitica.com/api/v3"

# Function to fetch all Todos from Habitica API
function Fetch-Todos {
    $headers = @{
        "x-api-user" = $USER_ID
        "x-api-key" = $API_TOKEN
    }

    $response = Invoke-RestMethod -Uri "$API_URL/tasks/user?type=todos" -Headers $headers
    return $response
}

# Function to identify the last markdown file in the JOURNAL folder
function Get-LastJournalFile {
    $journalPath = ".\JOURNAL"
    $lastFile = Get-ChildItem -Path $journalPath -Filter "*.md" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return $lastFile.FullName
}

# Function to format Todos, including subtasks and descriptions
function Format-Todo {
    param ($todo)
    $formattedTodo = "- [ ] $($todo.text)"
    if ($todo.notes) {
        $formattedTodo += "`r`n    _" + $todo.notes + "_"
    }
    if ($todo.checklist -and $todo.checklist.Count -gt 0) {
        $subtasks = $todo.checklist | ForEach-Object {
            if ($_.completed) {
                # Apply strikethrough for completed subtasks
                "    - [x] ~~$($_.text)~~"
            } else {
                # Regular format for uncompleted subtasks
                "    - [ ] $($_.text)"
            }
        }
        $formattedTodo += "`r`n" + ($subtasks -join "`r`n")
    }
    return $formattedTodo
}

# Function to append uncompleted Todos to the last day's markdown file in JOURNAL
function Append-UncompletedTodos {
    $todosResponse = Fetch-Todos
    $uncompletedTodos = $todosResponse.data | Where-Object { -not $_.completed }

    if ($uncompletedTodos) {
        $todosSummaryArray = $uncompletedTodos | ForEach-Object { Format-Todo $_ }
        $todosSummary = $todosSummaryArray -join "`r`n"
        
        $lastJournalFile = Get-LastJournalFile
        if (Test-Path $lastJournalFile) {
            $fileContent = Get-Content -Path $lastJournalFile -Encoding UTF8 -Raw
            if ($fileContent -match '### TODO:') {
                $newContent = $fileContent + "`r`n" + $todosSummary
            } else {
                $newContent = $fileContent + "`r`n### TODO:`r`n" + $todosSummary
            }
            Set-Content -Path $lastJournalFile -Value $newContent -Encoding UTF8 -NoNewline
        } else {
            Write-Host "No last journal file found."
        }
    } else {
        Write-Host "No uncompleted Todos found."
    }
}

# Main script execution
Append-UncompletedTodos
