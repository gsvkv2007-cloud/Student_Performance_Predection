$csv = Import-Csv 'c:\Users\gsvkv\project\student_performance_updated_1000.csv'
$records = @()
$counter = 1
foreach ($row in $csv) {
    $name = $row.Name
    $gender = $row.Gender
    $attendance = $row.AttendanceRate
    $studyHours = $row.StudyHoursPerWeek
    $prevGrade = $row.PreviousGrade
    $ec = $row.ExtracurricularActivities
    $ps = $row.ParentalSupport
    $fg = $row.FinalGrade
    $oc = $row.'Online Classes Taken'
    $sh = $row.'Study Hours'
    $attPct = $row.'Attendance (%)'

    if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($gender) -or
        [string]::IsNullOrWhiteSpace($attendance) -or [string]::IsNullOrWhiteSpace($studyHours) -or
        [string]::IsNullOrWhiteSpace($prevGrade) -or [string]::IsNullOrWhiteSpace($ec) -or
        [string]::IsNullOrWhiteSpace($ps) -or [string]::IsNullOrWhiteSpace($fg) -or
        [string]::IsNullOrWhiteSpace($oc) -or [string]::IsNullOrWhiteSpace($sh) -or
        [string]::IsNullOrWhiteSpace($attPct)) {
        continue
    }

    $studyHoursVal = [double]$studyHours
    $attendanceVal = [double]$attendance
    $prevGradeVal = [double]$prevGrade
    $fgVal = [double]$fg
    $ecVal = [int][double]$ec
    $shVal = [double]$sh
    $attPctVal = [double]$attPct

    # Skip outliers (including Screen Time >=0 and <=24, Sleep Hours equivalent to Att% between 20 and 120, i.e., 2.0h to 12.0h)
    if ($studyHoursVal -lt 0 -or $attendanceVal -gt 100 -or $fgVal -lt 0 -or $fgVal -gt 100 -or
        $shVal -lt 0 -or $shVal -gt 24 -or $attPctVal -lt 20 -or $attPctVal -gt 120) { continue }

    $sid = $row.StudentID
    if ([string]::IsNullOrWhiteSpace($sid)) { $sid = $counter }

    $ocBool = if ($oc -eq 'True') { 'true' } else { 'false' }

    $cleanName = $name -replace '"', '\"' -replace "'", "\'"
    
    # Calculate Sleep Hours (Attendance % column / 10) and Screen Time (Study Hours column)
    $sleepHours = $attPctVal / 10.0
    $screenTime = $shVal

    $record = '  {"StudentID": "STU' + [string]([int][double]$sid) + '", "Name": "' + $cleanName + '", "Gender": "' + $gender + '", "AttendanceRate": ' + $attendanceVal + ', "StudyHoursPerWeek": ' + $studyHoursVal + ', "PreviousGrade": ' + $prevGradeVal + ', "ExtracurricularActivities": ' + $ecVal + ', "ParentalSupport": "' + $ps + '", "FinalGrade": ' + $fgVal + ', "OnlineClassesTaken": ' + $ocBool + ', "SleepHours": ' + $sleepHours + ', "ScreenTime": ' + $screenTime + '}'
    $records += $record
    $counter++
}

$output = "// Student Performance Dataset - Parsed from student_performance_updated_1000.csv`n"
$output += "// Clean records with no missing values and no outliers`n"
$output += "window.studentDataset = [`n"
$output += ($records -join ",`n")
$output += "`n];`n"

[System.IO.File]::WriteAllText('c:\Users\gsvkv\project\dataset.js', $output, [System.Text.Encoding]::UTF8)

Write-Host "Generated dataset.js with $($records.Count) clean records"
