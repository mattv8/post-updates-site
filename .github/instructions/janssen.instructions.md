---
applyTo: '**'
---
### Project Architecture
- Built on Smarty Portal Framework (external dependency)
- PHP backend with MySQL database
- Bootstrap 5 for UI components
- Docker-based development environment
- Framework mounted from external directory via Docker volumes (not tracked in this repo)

### Development Environment
- Clone framework separately: `git clone https://github.com/mattv8/smarty-portal-framework.git`
- Update `.env` file with path to framework: `FRAMEWORK_PATH=/path/to/smarty-portal-framework`
- Use Docker Compose for local development: `sudo docker compose up --build`
- Database schema auto-initializes from `database/` folder during Docker build
- SQL scripts use environment variable substitution via sed during build
- PHP errors logged to `logs/php_errors.log`, nginx to `logs/nginx_error.log`
- To update framework: `cd /path/to/smarty-portal-framework && git pull`

### File Structure Patterns
- Page templates: `src/templates/*.tpl` (Smarty templates)
- Page logic: `src/*.php` (main page controllers)
- Business logic: `src/functions.php` (shared functions)
- CSS: Separate files per page (`src/css/page_name.css`) + global styles
- JavaScript: Separate files per page (`src/js/page_name.js`)
- Framework includes CSS/JS automatically via `src/templates/header.tpl`
- Framework files: External dependency, mounted at runtime (DO NOT edit directly)

### Database Management
- Development: Auto-initialized via Docker, ephemeral volumes
- Production: Manual migration using scripts in `database/` folder
- Always backup before schema changes in production
- Use environment variables for database names in SQL scripts
- Run migrations: `sudo docker exec -i mysql bash -c 'mysql -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE' < database/script-name.sql`

### Smarty Templating Guidelines
- This is a Smarty-based project - use Smarty variables and templating features extensively
- Pass data from PHP controllers to templates using `$smarty->assign('variable_name', $value)`
- In templates, use Smarty syntax: `{$variable_name}` for variables, `{if}`, `{foreach}`, etc.
- Leverage Smarty's built-in functions for formatting, escaping, and logic in templates
- Keep business logic in PHP files, presentation logic in Smarty templates
- Use Smarty template inheritance and includes for code reusability

### Framework Management (External Dependency)
- Framework is NOT tracked in this repository
- Framework must be cloned separately to location specified in `.env` file
- Clone from: https://github.com/mattv8/smarty-portal-framework.git
- Update framework: `cd /path/to/framework && git pull`
- NEVER edit framework files - changes should be contributed upstream via PR
- Framework provides: routing (`index.php`), user auth, navigation, modals, base templates
- Override framework templates by creating same filename in `src/templates/`
