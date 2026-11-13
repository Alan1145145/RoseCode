Unicode true
!include "MUI2.nsh"
!include "StrFunc.nsh"
${Using:StrFunc} StrStr
${Using:StrFunc} UnStrStr

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!define ROOT "..\..\.."

Name "RoseCode"
OutFile "${ROOT}\dist\windows\RoseCode-${VERSION}-windows-x64-setup.exe"
InstallDir "$LOCALAPPDATA\Programs\RoseCode"
; 覆盖升级使用 RoseCode 已登记的安装目录。
InstallDirRegKey HKCU "Software\RoseCode" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!ifndef VERSION_NUMERIC
  !define VERSION_NUMERIC "${VERSION}"
!endif
VIProductVersion "${VERSION_NUMERIC}.0"
VIAddVersionKey "ProductName" "RoseCode"
VIAddVersionKey "FileDescription" "RoseCode Installer"
VIAddVersionKey "CompanyName" "Alan1145145"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
Var ExistingInstall
Var HadDesktopEntry
Var LegacyInstall

!define MUI_ICON "${ROOT}\apps\codex-plus-manager\src-tauri\icons\icon.ico"
!define MUI_UNICON "${ROOT}\apps\codex-plus-manager\src-tauri\icons\icon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

; 主程序退出时负责恢复系统浏览器及清理后台服务，安装器不能强制结束进程。
; 每 500ms 检查一次；10 秒仍未退出时提示从托盘退出，再重试或取消安装/卸载。
; 确认进程退出后再补 500ms 文件锁释放缓冲，避免 File/Delete 撞上残留锁（issue #2362）。
; 判据用 tasklist 输出 + 字符串包含，不用其退出码（实测 Win11 无匹配仍返回 0），
; 也不用 cmd 管道 find（PATH 里的 Unix find.exe 会劫持、多层引号易变形）。
!macro WAIT_FOR_PROCESS_EXIT UNFUNC UNSTR
  Function ${UNFUNC}
    Pop $1
    StrCpy $2 0
  wait_loop:
    nsExec::ExecToStack '$SYSDIR\tasklist.exe /FI "IMAGENAME eq $1" /NH'
    Pop $0
    Pop $9
    !if "${UNSTR}" == ""
      ${StrStr} $8 "$9" "$1"
    !else
      ${UnStrStr} $8 "$9" "$1"
    !endif
    StrCmp $8 "" wait_done 0
    IntOp $2 $2 + 1
    IntCmp $2 20 wait_prompt 0 wait_prompt
    Sleep 500
    Goto wait_loop
  wait_prompt:
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "请从系统托盘退出 RoseCode，等待后台服务清理完成后重试。" IDRETRY wait_retry IDCANCEL wait_cancel
  wait_retry:
    StrCpy $2 0
    Goto wait_loop
  wait_cancel:
    Abort
  wait_done:
    Sleep 500
  FunctionEnd
!macroend
!insertmacro WAIT_FOR_PROCESS_EXIT WaitForProcessExit ""
!insertmacro WAIT_FOR_PROCESS_EXIT un.WaitForProcessExit un.

Function DetectLegacyRoseCode
  ; 1.0.0 沿用了上游注册表键，必须先检查 exe 的产品信息才能迁移。
  ReadRegStr $LegacyInstall HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusPlus" "InstallLocation"
  StrCmp $LegacyInstall "" legacy_not_owned
  IfFileExists "$LegacyInstall\codex-plus-plus.exe" 0 legacy_not_owned
  System::Call 'kernel32::SetEnvironmentVariableW(w "ROSECODE_LEGACY_EXE", w "$LegacyInstall\codex-plus-plus.exe") i.r0'
  StrCmp $0 0 legacy_not_owned
  nsExec::ExecToStack /TIMEOUT=15000 `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -Command "if ((Get-Item -LiteralPath $$env:ROSECODE_LEGACY_EXE).VersionInfo.ProductName -ceq 'RoseCode') { exit 0 }; exit 1"`
  Pop $0
  Pop $1
  System::Call 'kernel32::SetEnvironmentVariableW(w "ROSECODE_LEGACY_EXE", p 0)'
  StrCmp $0 0 legacy_owned
  legacy_not_owned:
  StrCpy $LegacyInstall ""
  legacy_owned:
FunctionEnd

Section "Install"
  ReadRegStr $ExistingInstall HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RoseCode" "InstallLocation"
  Call DetectLegacyRoseCode
  StrCmp $ExistingInstall "" 0 existing_install_checked
  StrCpy $ExistingInstall $LegacyInstall
  existing_install_checked:

  Push "RoseCode.exe"
  Call WaitForProcessExit
  StrCmp $LegacyInstall "" legacy_process_done
  Push "codex-plus-plus.exe"
  Call WaitForProcessExit
  legacy_process_done:
  SetOutPath "$INSTDIR"
  File "${ROOT}\dist\windows\app\RoseCode.exe"

  StrCpy $HadDesktopEntry 0
  IfFileExists "$DESKTOP\RoseCode.lnk" desktop_entry_found 0
  StrCmp $LegacyInstall "" desktop_entry_checked
  IfFileExists "$DESKTOP\Codex++.lnk" desktop_entry_found desktop_entry_checked
  desktop_entry_found:
  StrCpy $HadDesktopEntry 1
  desktop_entry_checked:
  StrCmp $ExistingInstall "" desktop_entry_create 0
  StrCmp $HadDesktopEntry 1 desktop_entry_create desktop_entry_done
  desktop_entry_create:
  CreateShortcut "$DESKTOP\RoseCode.lnk" "$INSTDIR\RoseCode.exe" "" "$INSTDIR\RoseCode.exe"
  desktop_entry_done:
  CreateDirectory "$SMPROGRAMS\RoseCode"
  CreateShortcut "$SMPROGRAMS\RoseCode\RoseCode.lnk" "$INSTDIR\RoseCode.exe" "" "$INSTDIR\RoseCode.exe"
  CreateShortcut "$SMPROGRAMS\RoseCode\卸载 RoseCode.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\RoseCode.exe"

  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "Software\RoseCode" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RoseCode" "DisplayName" "RoseCode"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RoseCode" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RoseCode" "Publisher" "Alan1145145"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RoseCode" "DisplayIcon" "$INSTDIR\RoseCode.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RoseCode" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RoseCode" "UninstallString" '"$INSTDIR\uninstall.exe"'

  ; 仅迁移已确认属于 RoseCode 1.0.0 的快捷方式和注册项。旧二进制保留，供已写入的钩子路径继续工作。
  StrCmp $LegacyInstall "" legacy_entries_done
  Delete "$DESKTOP\Codex++.lnk"
  Delete "$SMPROGRAMS\Codex++\Codex++.lnk"
  Delete "$SMPROGRAMS\Codex++\卸载 Codex++.lnk"
  RMDir "$SMPROGRAMS\Codex++"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusPlus"
  DeleteRegValue HKCU "Software\Codex++" "InstallDir"
  legacy_entries_done:

  ; 注册 codexplusplus:// 与 dreamskin:// URL 协议（issue #2354）。
  ; 键名与值同 codex-plus-core 的 install::windows::register_url_protocol 保持一致，
  ; 应用内"修复快捷方式"会以相同键幂等覆盖，两边互不冲突。
  WriteRegStr HKCU "Software\Classes\codexplusplus" "" "URL:RoseCode Import Protocol"
  WriteRegStr HKCU "Software\Classes\codexplusplus" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\codexplusplus\shell\open\command" "" '"$INSTDIR\RoseCode.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\dreamskin" "" "URL:DreamSkin Community Theme Protocol"
  WriteRegStr HKCU "Software\Classes\dreamskin" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\dreamskin\shell\open\command" "" '"$INSTDIR\RoseCode.exe" "%1"'

  ; 新版只更新已有开机项；迁移旧版时校验旧项的目标路径。
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RoseCodeWatcher"
  StrCmp $0 "" 0 watcher_run_write
  StrCmp $LegacyInstall "" watcher_run_done
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "CodexPlusPlusWatcher"
  StrCmp $0 '"$LegacyInstall\codex-plus-plus.exe" --autostart' 0 watcher_run_done
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "CodexPlusPlusWatcher"
  watcher_run_write:
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RoseCodeWatcher" '"$INSTDIR\RoseCode.exe" --autostart'
  watcher_run_done:
  IfFileExists "$SMSTARTUP\RoseCodeWatcher.lnk" 0 watcher_shortcut_done
  CreateShortcut "$SMSTARTUP\RoseCodeWatcher.lnk" "$INSTDIR\RoseCode.exe" "--autostart" "$INSTDIR\RoseCode.exe"
  watcher_shortcut_done:
SectionEnd

Section "Uninstall"
  Push "RoseCode.exe"
  Call un.WaitForProcessExit

  ; 主程序退出后恢复代理配置，再删除本次安装的入口。
  IfFileExists "$INSTDIR\RoseCode.exe" 0 +2
    ExecWait '"$INSTDIR\RoseCode.exe" --codex-plus-uninstall-cleanup'

  Delete "$DESKTOP\RoseCode.lnk"
  Delete "$SMPROGRAMS\RoseCode\RoseCode.lnk"
  Delete "$SMPROGRAMS\RoseCode\卸载 RoseCode.lnk"
  RMDir "$SMPROGRAMS\RoseCode"

  Delete "$INSTDIR\RoseCode.exe"
  IfFileExists "$INSTDIR\RoseCode.exe" 0 +2
    MessageBox MB_OK|MB_ICONEXCLAMATION "RoseCode 仍被占用。请从系统托盘退出 RoseCode 后重新卸载。"

  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RoseCode"
  DeleteRegKey HKCU "Software\RoseCode"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RoseCodeWatcher"
  Delete "$SMSTARTUP\RoseCodeWatcher.lnk"

  ; 若用户安装了其他应用并接管协议，不移除它的注册。
  ReadRegStr $0 HKCU "Software\Classes\codexplusplus\shell\open\command" ""
  StrCmp $0 '"$INSTDIR\RoseCode.exe" "%1"' 0 +2
  DeleteRegKey HKCU "Software\Classes\codexplusplus"
  ReadRegStr $0 HKCU "Software\Classes\dreamskin\shell\open\command" ""
  StrCmp $0 '"$INSTDIR\RoseCode.exe" "%1"' 0 +2
  DeleteRegKey HKCU "Software\Classes\dreamskin"
SectionEnd
