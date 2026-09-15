# Distribution Checklist

When shipping PLOROPSIS to a field station:

- [ ] Build the executable (`build_app.bat` / `build_app.sh`)
- [ ] Verify `dist/PLOROPSIS/` contains:
    - `PLOROPSIS.exe` (or `PLOROPSIS` binary)
    - `config.json`
    - `_internal/` folder (PyInstaller dependencies)
- [ ] Zip the entire `dist/PLOROPSIS/` folder
- [ ] Recipient must have:
    - MySQL 8.0+ installed
    - `polar_db` database created with schema imported
    - (Optional) Python 3.10+ if they need to edit `config.json` beyond basics
- [ ] Recipient double-clicks `PLOROPSIS.exe` → browser opens → ready to use

## Distribution-ready features

- **One executable** — `PLOROPSIS.exe` (Windows) or `PLOROPSIS` (Linux)
- **User-editable config** — `config.json` lives next to the exe
- **Auto browser launch** — opens the dashboard on startup
- **Friendly error handling** — clear messages if MySQL isn't reachable
