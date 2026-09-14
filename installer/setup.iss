#define MyAppName "PLOROPSIS"
#define MyAppVersion "3.0.0"
#define MyAppPublisher "Versus-DEV"
#define MyAppURL "https://github.com/S-gupt3/integrated-polar-expedition-logistic"
#define MyAppExeName "PLOROPSIS.exe"

[Setup]
AppId={{7C2E9F3A-4B1D-4E6A-9C2F-1A8D5E3B7F90}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
LicenseFile=..\LICENSE.md
OutputDir=Output
OutputBaseFilename=PLOROPSIS-Setup
SetupIconFile=..\test folder\frontend\assets\icons\favicon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\dist\PLOROPSIS\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\backend\schema.sql"; DestDir: "{app}\Database Setup"; Flags: ignoreversion
Source: "..\Data\*"; DestDir: "{app}\Database Setup\Data"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Database Setup"; Filename: "{app}\Database Setup"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  DBPage: TInputQueryWizardPage;

procedure InitializeWizard;
begin
  DBPage := CreateInputQueryPage(wpSelectDir,
    'MySQL Connection', 'Configure the database connection for PLOROPSIS',
    'PLOROPSIS needs an existing MySQL server. Enter the connection details below (run Database Setup\schema.sql on that server first if you haven''t already).');
  DBPage.Add('Host:', False);
  DBPage.Add('Port:', False);
  DBPage.Add('Username:', False);
  DBPage.Add('Password:', True);
  DBPage.Add('Database name:', False);
  DBPage.Add('App port (web UI):', False);

  DBPage.Values[0] := 'localhost';
  DBPage.Values[1] := '3306';
  DBPage.Values[2] := 'python_user';
  DBPage.Values[3] := '';
  DBPage.Values[4] := 'polar_db';
  DBPage.Values[5] := '5000';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = DBPage.ID then
  begin
    if (Trim(DBPage.Values[0]) = '') or (Trim(DBPage.Values[2]) = '') or (Trim(DBPage.Values[4]) = '') then
    begin
      MsgBox('Host, username and database name are required.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigJson: String;
  ConfigPath: String;
begin
  if CurStep = ssPostInstall then
  begin
    ConfigJson :=
      '{' + #13#10 +
      '  "db_host": "' + DBPage.Values[0] + '",' + #13#10 +
      '  "db_port": ' + DBPage.Values[1] + ',' + #13#10 +
      '  "db_user": "' + DBPage.Values[2] + '",' + #13#10 +
      '  "db_password": "' + DBPage.Values[3] + '",' + #13#10 +
      '  "db_name": "' + DBPage.Values[4] + '",' + #13#10 +
      '  "server_port": ' + DBPage.Values[5] + ',' + #13#10 +
      '  "auto_open_browser": true' + #13#10 +
      '}';
    ConfigPath := ExpandConstant('{app}') + '\config.json';
    SaveStringToFile(ConfigPath, ConfigJson, False);
  end;
end;
