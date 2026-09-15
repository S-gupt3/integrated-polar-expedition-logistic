# Troubleshooting

## "Cannot connect to MySQL"
- Verify MySQL is running: `mysql -u python_user -p`
- Check `config.json` credentials
- Ensure `polar_db` exists and schema is imported

## Frontend not loading
- Verify `test folder/frontend/index.html` exists
- Check browser console for 404 errors
- Ensure the exe was built with the correct `--add-data` paths

## Build fails with "hidden import" errors
- The build scripts include all necessary hidden imports for `uvicorn` and `pymysql`
- If adding new modules, update `build_app.bat` / `build_app.sh` with `--hidden-import=<module>`

## Port 5000 already in use
- Edit `config.json` and change `server_port` to another value (e.g., `5001`)
- Restart the application
