FROM mysql:5.7

# Set ownership (this line might not be necessary, depending on your use case)
RUN chown -R mysql:root /var/lib/mysql/

# Define build arguments
ARG MYSQL_DATABASE

# Add the SQL files
ADD 01-framework.sql /docker-entrypoint-initdb.d/00-migration-tracker.sql
ADD 01-framework.sql /docker-entrypoint-initdb.d/01-framework.sql

# Replace placeholders with actual values from the environment variables
RUN sed -i 's/MYSQL_DATABASE/'${MYSQL_DATABASE}'/g' /docker-entrypoint-initdb.d/01-framework.sql

EXPOSE 3306
