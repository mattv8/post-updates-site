# Database Migration Instructions

## Running the Soft Delete Migration

The migration `05-add-soft-delete-to-posts.sql` adds soft delete support to posts.

### For Development (Docker)

If you're starting fresh with Docker, the migration will be applied automatically during build.

If your Docker environment is already running:

```bash
# Run the migration
sudo docker exec -i janssen-care-bridge-mysql-1 bash -c 'mysql -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE' < database/05-add-soft-delete-to-posts.sql
```

### For Production

**IMPORTANT: Always backup your database before running migrations!**

```bash
# 1. Backup the database first
mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run the migration
mysql -u username -p database_name < database/05-add-soft-delete-to-posts.sql
```

## What This Migration Does

- Adds a `deleted_at` column to the `posts` table (nullable timestamp)
- Adds an index on `deleted_at` for query performance
- Posts with `deleted_at = NULL` are active
- Posts with a timestamp in `deleted_at` are archived (soft deleted)

## Soft Delete Behavior

- Delete operations now set `deleted_at = NOW()` instead of removing the record
- All queries automatically filter out deleted posts (`WHERE deleted_at IS NULL`)
- Deleted posts remain in the database for potential recovery
- The delete button appears for logged-in users on both the home page and admin panel
- A confirmation modal prevents accidental deletions
