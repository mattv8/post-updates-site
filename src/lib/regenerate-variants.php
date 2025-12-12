#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * CLI Utility to Regenerate Image Variants
 * Usage: php regenerate-variants.php [--all|--id=123]
 */

require_once(__DIR__ . '/../vendor/autoload.php');
require_once(__DIR__ . '/../config.php');
require_once(__DIR__ . '/MediaProcessor.php');

// Parse command line arguments
$options = getopt('', ['all', 'id::', 'help']);

if (isset($options['help'])) {
    echo "Usage: php regenerate-variants.php [OPTIONS]\n\n";
    echo "Options:\n";
    echo "  --all          Regenerate variants for all media\n";
    echo "  --id=N         Regenerate variants for specific media ID\n";
    echo "  --help         Show this help message\n\n";
    exit(0);
}

// Connect to database using environment configuration
$db_conn = getDefaultDbConnection();
if (!$db_conn) {
    die("Database connection failed: " . mysqli_connect_error() . "\n");
}

$processor = new MediaProcessor();

if (isset($options['all'])) {
    echo "Regenerating variants for all media...\n";

    $query = "SELECT id, filename FROM media ORDER BY id";
    $result = mysqli_query($db_conn, $query);

    if (!$result) {
        die("Query failed: " . mysqli_error($db_conn) . "\n");
    }

    $total = mysqli_num_rows($result);
    $count = 0;
    $errors = 0;

    while ($row = mysqli_fetch_assoc($result)) {
        $count++;
        echo "Processing {$count}/{$total}: Media ID {$row['id']} ({$row['filename']})... ";

        $result = $processor->regenerateVariants(null, $row['filename']);

        if ($result['success']) {
            // Update database with new variants
            $variantsJson = json_encode($result['variants']);
            $updateQuery = "UPDATE media SET variants_json = ?, updated_at = NOW() WHERE id = ?";
            $stmt = mysqli_prepare($db_conn, $updateQuery);
            mysqli_stmt_bind_param($stmt, 'si', $variantsJson, $row['id']);

            if (mysqli_stmt_execute($stmt)) {
                echo "OK\n";
            } else {
                echo "ERROR updating database\n";
                $errors++;
            }
        } else {
            echo "ERROR: {$result['error']}\n";
            $errors++;
        }
    }

    echo "\nCompleted: {$count} processed, {$errors} errors\n";

} elseif (isset($options['id'])) {
    $id = intval($options['id']);
    echo "Regenerating variants for media ID {$id}...\n";

    $query = "SELECT id, filename FROM media WHERE id = ?";
    $stmt = mysqli_prepare($db_conn, $query);
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    if (!$result || mysqli_num_rows($result) === 0) {
        die("Media ID {$id} not found\n");
    }

    $row = mysqli_fetch_assoc($result);
    $result = $processor->regenerateVariants(null, $row['filename']);

    if ($result['success']) {
        $variantsJson = json_encode($result['variants']);
        $updateQuery = "UPDATE media SET variants_json = ?, updated_at = NOW() WHERE id = ?";
        $stmt = mysqli_prepare($db_conn, $updateQuery);
        mysqli_stmt_bind_param($stmt, 'si', $variantsJson, $id);

        if (mysqli_stmt_execute($stmt)) {
            echo "Successfully regenerated variants\n";
        } else {
            echo "ERROR updating database: " . mysqli_error($db_conn) . "\n";
        }
    } else {
        echo "ERROR: {$result['error']}\n";
    }

} else {
    echo "Error: Please specify --all or --id=N\n";
    echo "Use --help for usage information\n";
    exit(1);
}

mysqli_close($db_conn);
