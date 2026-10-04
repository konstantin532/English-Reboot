' English Reboot - silent launcher (minimized server window)
Set shell = CreateObject("WScript.Shell")
Set fso   = CreateObject("Scripting.FileSystemObject")

' Folder where this .vbs lies = project folder
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = projectDir

' Detect Python
pyCmd = ""
On Error Resume Next
shell.Run "cmd /c where py >nul 2>&1", 0, True
If Err.Number = 0 Then pyCmd = "py -3"
If pyCmd = "" Then
    shell.Run "cmd /c where python >nul 2>&1", 0, True
    If Err.Number = 0 Then pyCmd = "python"
End If
On Error Goto 0

' Start server minimized (window style 7 = minimized, no wait)
If pyCmd <> "" Then
    shell.Run "cmd /c title EnglishReboot-Server && " & pyCmd & " -m http.server 8000", 7, False
    WScript.Sleep 1500
    shell.Run "http://localhost:8000"
Else
    ' No Python - fallback: just open the file
    MsgBox "Python не найден. Установите Python (python.org)," & vbCrLf & _
           "затем запустите Запустить_тихо.vbs снова." & vbCrLf & vbCrLf & _
           "Пока открываю приложение напрямую (без PWA-функций).", _
           vbExclamation, "English Reboot"
    shell.Run """" & projectDir & "\index.html"""
End If
