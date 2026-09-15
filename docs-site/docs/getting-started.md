# Getting Started

## Prerequisites

- **Python 3.10+**
- **MySQL 8.0+** running with a database named `polar_db`
- **Git** (for cloning)

## 1. Clone the repository

```bash
git clone https://github.com/S-gupt3/integrated-polar-expedition-logistic.git
cd integrated-polar-expedition-logistic
```

## 2. Set up the database

```bash
# Create the database and user
mysql -u root -p
```

```sql
CREATE DATABASE polar_db;
CREATE USER 'python_user'@'localhost' IDENTIFIED BY '1729';
GRANT ALL PRIVILEGES ON polar_db.* TO 'python_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Import the schema
mysql -u python_user -p polar_db < backend/schema.sql

# Import CSV data (optional but recommended)
python backend/import_csv_to_mysql.py
```

!!! warning "Security note"
    The sample credentials above (`python_user` / `1729`) are placeholders for local development only. Use a strong, unique password — and keep it out of version control — for any shared or field-deployed instance.

## 3. Run in development mode

=== "Windows"
    ```bat
    run_app.bat
    ```

=== "Linux"
    ```bash
    chmod +x run_app.sh
    ./run_app.sh
    ```

The server starts on `http://localhost:5000` and auto-opens the browser.

## 4. Build the executable

=== "Windows"
    ```bat
    build_app.bat
    ```

=== "Linux"
    ```bash
    chmod +x build_app.sh
    ./build_app.sh
    ```

The executable appears in `dist/PLOROPSIS/`. Zip the entire folder and distribute.
