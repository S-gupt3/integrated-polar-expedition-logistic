# Installing PLOROPSIS on Windows

## 1. Prerequisites — get MySQL ready first

The installer only *configures* the connection — it doesn't install MySQL itself. Do this once, before running `PLOROPSIS-Setup.exe`:

### a) Install MySQL Server
1. Download MySQL Community Server (Windows) from https://dev.mysql.com/downloads/mysql/
2. Run the installer, choose the **"Server only"** setup type (no need for Workbench unless you want it).
3. During setup, set a root password and note it down.
4. Make sure MySQL is set to run as a Windows service so it starts automatically — the installer offers this by default.
5. Confirm it's running: open **Services** (`services.msc`) and check **MySQL80** (or similar) shows "Running".

### b) Create a database user and the schema
Open **MySQL Command Line Client** (or Workbench, or `cmd` with `mysql -u root -p`) and run:

```sql
CREATE DATABASE polar_db;
CREATE USER 'python_user'@'localhost' IDENTIFIED BY 'your_chosen_password';
GRANT ALL PRIVILEGES ON polar_db.* TO 'python_user'@'localhost';
FLUSH PRIVILEGES;
```

Then load the schema:
mysql -u python_user -p polar_db < schema.sql


`schema.sql` is copied into the install folder under `Database Setup\schema.sql` once PLOROPSIS is installed — or grab it straight from the repo's `backend/schema.sql` beforehand if you want to run this step first.

### c) (Optional) Load sample data
If you want the demo/sample records (`stations.csv`, `assets.csv`, `inventory.csv`, `consumption_logs.csv`) instead of starting from an empty database:

cd Data
python import_csv_to_mysql.py


This needs `pip install pymysql` and edits to the `DB_CONFIG` at the top of `import_csv_to_mysql.py` if your username/password differ from the defaults. Skip this step entirely if you'd rather start empty.

**Have ready before installing:** host (usually `localhost`), port (usually `3306`), the username and password you created, and the database name (`polar_db` if you followed the steps above).

---

## 2. Install PLOROPSIS

1. Run `PLOROPSIS-Setup.exe`. Windows may show a SmartScreen warning since the app isn't code-signed — click **More info → Run anyway**.
2. Accept the license and choose an install folder (defaults to `Program Files\PLOROPSIS`).
3. On the **MySQL Connection** screen, enter:
   - **Host** — `localhost` (or your MySQL server's address)
   - **Port** — `3306` unless you changed it
   - **Username** / **Password** — the MySQL user you created above
   - **Database name** — `polar_db`
   - **App port (web UI)** — `5000` unless that port is already in use on your machine
4. Choose whether to create a desktop shortcut.
5. Finish the wizard — leave "Launch PLOROPSIS" checked to start it right away.

The installer writes these values into `config.json` in the install folder, so you won't need to edit anything by hand. PLOROPSIS opens your browser to `http://localhost:5000` automatically on launch.

---

## 3. Troubleshooting

- **"Cannot connect to MySQL" on launch** — MySQL service isn't running, or the host/port/user/password/database in `config.json` don't match what you set up. Check `services.msc` for MySQL first, then edit `config.json` in the install folder and restart PLOROPSIS.
- **Browser doesn't open / port already in use** — another app is using port 5000. Edit `server_port` in `config.json` to something free (e.g. `5050`) and restart.
- **Need to redo the DB settings** — just edit `config.json` directly, it's plain JSON in the install folder; no need to reinstall.

---

## 4. Uninstalling

Use **Settings → Apps → PLOROPSIS → Uninstall**, or the shortcut in the Start Menu group. This removes the app files but does **not** touch your MySQL database — uninstall and reinstall freely without losing data.
