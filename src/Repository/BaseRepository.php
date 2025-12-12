<?php

declare(strict_types=1);

namespace PostPortal\Repository;

use mysqli;
use mysqli_result;
use RuntimeException;

/**
 * Base repository class with prepared statement helpers and error handling
 */
abstract class BaseRepository
{
    protected mysqli $db;

    public function __construct(mysqli $db)
    {
        $this->db = $db;
    }

    /**
     * Execute a SQL query with optional parameters using prepared statements
     *
     * @param string $sql SQL query with ? placeholders
     * @param array<int|float|string|null> $params Parameters to bind
     * @return mysqli_result|bool Query result
     * @throws RuntimeException If query preparation or execution fails
     */
    protected function execute(string $sql, array $params = []): mysqli_result|bool
    {
        try {
            // If no params, execute directly
            if (empty($params)) {
                $result = $this->db->query($sql);
                if ($result === false) {
                    throw new RuntimeException('Query failed: ' . $this->db->error);
                }
                return $result;
            }

            // Prepare statement
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Prepare failed: ' . $this->db->error);
            }

            // Build type string and bind parameters
            $types = '';
            foreach ($params as $param) {
                $types .= match (true) {
                    is_int($param) => 'i',
                    is_float($param) => 'd',
                    is_string($param) => 's',
                    default => 's',
                };
            }

            $stmt->bind_param($types, ...$params);
            
            // Execute statement
            if (!$stmt->execute()) {
                throw new RuntimeException('Execute failed: ' . $stmt->error);
            }

            // Get result
            $result = $stmt->get_result();
            
            // For INSERT/UPDATE/DELETE, get_result() returns false
            if ($result === false) {
                // Return true for successful non-SELECT queries
                return true;
            }
            
            return $result;
        } catch (\Throwable $e) {
            error_log('DB error: ' . $e->getMessage() . ' | SQL: ' . $sql);
            throw $e;
        }
    }

    /**
     * Execute a query and fetch a single row as an associative array
     *
     * @param string $sql SQL query with ? placeholders
     * @param array<int|float|string|null> $params Parameters to bind
     * @return array<string, mixed>|null Single row or null if not found
     */
    protected function fetchOne(string $sql, array $params = []): ?array
    {
        $result = $this->execute($sql, $params);
        
        if ($result instanceof mysqli_result) {
            $row = $result->fetch_assoc();
            return $row !== null ? $row : null;
        }
        
        return null;
    }

    /**
     * Execute a query and fetch all rows as an array of associative arrays
     *
     * @param string $sql SQL query with ? placeholders
     * @param array<int|float|string|null> $params Parameters to bind
     * @return array<int, array<string, mixed>> Array of rows
     */
    protected function fetchAll(string $sql, array $params = []): array
    {
        $result = $this->execute($sql, $params);
        
        if ($result instanceof mysqli_result) {
            return $result->fetch_all(MYSQLI_ASSOC);
        }
        
        return [];
    }

    /**
     * Execute a query and fetch a single column value
     *
     * @param string $sql SQL query with ? placeholders
     * @param array<int|float|string|null> $params Parameters to bind
     * @return mixed Single column value or null if not found
     */
    protected function fetchColumn(string $sql, array $params = []): mixed
    {
        $result = $this->execute($sql, $params);
        
        if ($result instanceof mysqli_result) {
            $row = $result->fetch_row();
            return $row !== null ? $row[0] : null;
        }
        
        return null;
    }

    /**
     * Get the last inserted ID
     *
     * @return int Last insert ID
     */
    protected function lastInsertId(): int
    {
        return $this->db->insert_id;
    }

    /**
     * Get the number of affected rows from the last query
     *
     * @return int Number of affected rows
     */
    protected function affectedRows(): int
    {
        return $this->db->affected_rows;
    }

    /**
     * Begin a transaction
     *
     * @return bool True on success
     */
    protected function beginTransaction(): bool
    {
        return $this->db->begin_transaction();
    }

    /**
     * Commit a transaction
     *
     * @return bool True on success
     */
    protected function commit(): bool
    {
        return $this->db->commit();
    }

    /**
     * Rollback a transaction
     *
     * @return bool True on success
     */
    protected function rollback(): bool
    {
        return $this->db->rollback();
    }
}
