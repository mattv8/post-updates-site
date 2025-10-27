<?php
/*
    Custom PHP Functions
*/
require_once(__DIR__ . '/framework/conf/config.php');
require_once(__DIR__ . '/framework/lib/functions.php');
require_once(__DIR__ . '/vendor/autoload.php'); // Composer autoload

/**
 * Debug logging function that only logs when debug mode is enabled
 * @param string $message The message to log
 * @param string $prefix Optional prefix for the log message
 */
function debug_log($message, $prefix = 'DEBUG') {
    global $debug;
    if ($debug === true) {
        error_log("[$prefix] " . $message);
    }
}

# Simple function to pretty-print out all the field names of a given PDF
# Code loosely based off the following SetaPDF examples:
#   https://demos.setasign.com/?p=%2Fdemo%2F3-FormFiller%2Fvarious%2F1-get-field-names-and-types
#   https://demos.setasign.com/?p=%2Fdemo%2F3-FormFiller%2Fvarious%2F1.1-get-field-information
function printPDFFieldNames(String $path)
{
    $document = SetaPDF_Core_Document::loadByFilename($path);
    $formFiller = new SetaPDF_FormFiller($document);
    $fields = $formFiller->getFields(); // access the fields instance
    $names = $fields->getNames(); // get all field names

    echo "<h5 class=\"pt-5\">PDF Fields:</h5>";
    echo "<table class=\"table table-striped table-hover\"><tr><th>Field Name</th><th>Field Type</th><th>Read Only</th><th>Required</th></tr>";

    foreach ($names as $name) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($name) . "</td>"; // to get the field type, you need to access/create a field instance
        $field = $fields->get($name); // to get the field type, you need to access/create a field instance
        echo "<td>" . get_class($field) . "</td>";
        echo "<td>" . ($field->isReadOnly() ? 'Yes' : 'No') . "</td>";
        echo "<td>" . ($field->isRequired() ? 'Yes' : 'No') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
}

# Simple function to pretty-print out all the field names from an associative array
function printDatabaseFields(array $data)
{
    echo "<h5 class=\"pt-5\">Database Parameters:</h5>";
    echo "<table class=\"table table-striped table-hover\"><tr><th>DB Key</th><th>Value</th></tr>";
    foreach ($data as $key => $value) {
        echo "<tr>";
        echo "<td>" . $key . "</td>";
        echo "<td>" . $value . "</td>";
        echo "</tr>";
    }
    echo "</table>";
}


# Implode an array, filtering out empty fields
function implodeNotEmpty($separator, $array)
{

    $string = implode($separator, array_filter($array, function ($value) {
        return !empty($value);
    }));

    return $string;
}


# Simple functio so store and return GET params to an associative array
function getParams($GET)
{
    $params = array();
    foreach ($GET as $key => $value) {
        $params[$key] = $value;
    }
    return $params;
}


/**
 * Fetches all entries for a given entry ID from the database.
 *
 * @param $db_conn mysqli The database connection object.
 * @param $entryId string The ID of the entry to fetch.
 *
 * @return array An array containing the fetched data, success status, and error message (if any).
 */
function fetchAllEntries($db_conn, $entryId)
{
    $message = ''; // Initialize error message

    // Build the query to fetch data from the Forms table
    /**
     * Note: here we modify the query to cast PassWeight to float. I'm not sure why this is required but I couldn't get the value
     * to return as anything other than an integer without explicitly casting to decimal. This isn't a good long-term solution.
     **/
    $query = "SELECT *, CAST(Forms.PassWeight AS DECIMAL(10,2)) AS PassWeight FROM `Forms`
    INNER JOIN `Event` ON Forms.EventId = Event.EventId
    INNER JOIN `sites` ON Forms.SiteId = sites.SiteId
    WHERE Forms.FormId='$entryId';";

    // Query Forms table for the entry
    $FormsData = mysqli_query($db_conn, $query);
    if (!$FormsData || mysqli_num_rows($FormsData) != 1) {
        $message = "Error fetching Forms record: " . mysqli_error($db_conn);
        return array('data' => null, 'success' => false, 'msg' => $message); // Short circuit with failure return
    }
    $data = mysqli_fetch_assoc($FormsData);

    // Fetch column comments for the Forms table and Event table
    $formsComments = fetchColumnComments($db_conn, 'Forms', array_keys($data));
    $eventComments = fetchColumnComments($db_conn, 'Event', array_keys($data));

    // Merge the comments from both tables
    $columnComments = array_merge($formsComments, $eventComments);

    // Combine data with comments
    $results = array();
    foreach ($data as $key => $value) {
        $results[$key] = array("value" => $value, "comment" => $columnComments[$key]);
    }

    return array('data' => $results, 'success' => true, 'msg' => $message);
}


/**
 * Fetches all attributes of an event based on its EventId from the database.
 *
 * This function retrieves all columns for a specific event identified by EventId
 * from the 'Event' table in the database and returns them as an associative array.
 *
 * @param mysqli $db_conn The MySQLi database connection object.
 * @param int $eventId The unique identifier of the event to fetch.
 * @return array An associative array containing event attributes on success,
 *               or an error message and query information on failure.
 */
function fetchEventAttributes($db_conn, $eventId)
{
    $message = ''; // Initialize error message

    // Build the query to fetch all columns from the Event table based on the EventId
    $query = "SELECT * FROM `Event` WHERE EventId='" . $eventId . "';";

    // Query the Event table for the entry
    $eventData = mysqli_query($db_conn, $query);
    if (!$eventData || mysqli_num_rows($eventData) != 1) {
        $message = "Error fetching Event record: " . mysqli_error($db_conn);
        return array('data' => null, 'success' => false, 'msg' => $message, 'query' => $query); // Short circuit with failure return
    }
    $data = mysqli_fetch_assoc($eventData);

    // Retrieve the column names of the Event table
    $columnQuery = "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = 'Event';";
    $columnData = mysqli_query($db_conn, $columnQuery);
    if (!$columnData) {
        $message = "Error fetching column names for Event: " . mysqli_error($db_conn);
        return array('data' => null, 'success' => false, 'msg' => $message, 'query' => $query); // Short circuit with failure return
    }
    $columns = array();
    if (mysqli_num_rows($columnData) > 0) {
        while ($row = mysqli_fetch_assoc($columnData)) {
            $columns[] = array_values($row)[0];
        }
    }

    $results = array();
    foreach ($columns as $column) {
        $results[$column] = array("value" => $data[$column]);
    }

    return array('data' => $results, 'success' => true, 'msg' => $message);
}


/**
 * Fetches comments for specific columns in a database table.
 *
 * @param mysqli $db_conn The database connection object.
 * @param string $table The name of the database table.
 * @param array|null $keys An array of column names for which comments should be fetched, or null to fetch comments for all columns.
 * @return array An associative array where column names are keys and comments are values.
 */
function fetchColumnComments($db_conn, $table, $keys = null)
{
    $columns = ($keys === null) ? '*' : implode("','", $keys);

    // Build the query
    $query = "SELECT COLUMN_NAME, COLUMN_COMMENT FROM information_schema.COLUMNS WHERE TABLE_NAME = '$table'";
    if ($keys !== null) {
        $query .= " AND COLUMN_NAME IN ('$columns')";
    }

    // Query information schema for column comments
    $result = mysqli_query($db_conn, $query);
    $comments = array(); // Preallocate
    if (mysqli_num_rows($result) > 0) {
        while ($row = mysqli_fetch_assoc($result)) {
            $column_name = $row['COLUMN_NAME'];
            $column_comment = $row['COLUMN_COMMENT'];
            $comments[$column_name] = $column_comment;
        }
    }

    return $comments;
}


/**
 * Executes a SQL query using the provided database connection.
 *
 * @param mysqli $connection The database connection object.
 * @param string $query The SQL query to execute.
 * @return mysqli_result|false Returns the query result or false if execution fails.
 */
function executeQuery($connection, $query)
{
    $result = mysqli_query($connection, $query);
    if (!$result) {
        return false; // Query execution failed
    }
    return $result;
}

/**
 * Handles query errors by sending a JSON response with an error message.
 *
 * @param mysqli $connection The database connection object.
 * @return void
 */
function handleQueryError($connection)
{
    echo json_encode(array('success' => false, 'msg' => "Error with the query: " . mysqli_error($connection)));
    return;
}


function getAutoGeneratedColumns($db_conn, $tableName)
{
    $autoGeneratedColumns = [];

    // Query to get the list of auto-generated columns
    $autoGeneratedColumnsQuery = "SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '$tableName'
        AND (EXTRA LIKE '%AUTO_INCREMENT%' OR COLUMN_DEFAULT LIKE 'CURRENT_TIMESTAMP%');
    ";


    // Execute the query to fetch auto-generated columns
    $autoGeneratedColumnsResult = mysqli_query($db_conn, $autoGeneratedColumnsQuery);

    if ($autoGeneratedColumnsResult) {
        // Fetch and store auto-generated column names
        while ($row = mysqli_fetch_assoc($autoGeneratedColumnsResult)) {
            $autoGeneratedColumns[] = $row['COLUMN_NAME'];
        }

        // Free the result set
        mysqli_free_result($autoGeneratedColumnsResult);
    }

    return $autoGeneratedColumns;
}



function generate_ical($reservation)
{
    // Prepare calendar event details
    $eventDate = new DateTime($reservation['EventDate'], new DateTimeZone('UTC'));
    $eventDate->setTime(15, 0, 0);
    $endTime = clone $eventDate;
    $endTime->add(new DateInterval('PT8H'));
    $dtstart = $eventDate->format('Ymd\THis\Z');
    $dtend = $endTime->format('Ymd\THis\Z');

    // Generate iCalendar (ICS) data
    $ical_data = "BEGIN:VCALENDAR
        VERSION:2.0
        PRODID:-//Example Calendar//EN
        CALSCALE:GREGORIAN
        METHOD:PUBLISH
        BEGIN:VEVENT
        UID:" . $reservation['EventId'] . "@" . $reservation['SiteHTMLName'] . "
        DTSTART:$dtstart
        DTEND:$dtend
        SUMMARY:Reservation for " . $reservation['child_name_first'] . " " . $reservation['child_name_last'] . " at " . $reservation['SiteName'] . "
        DESCRIPTION:This is your reservation for " . $reservation['child_name_first'] . " " . $reservation['child_name_last'] . " at " . $reservation['SiteName'] . ".
        LOCATION:" . $reservation['SiteName'] . "
        END:VEVENT
        END:VCALENDAR";

    // Trim space at beginning of each line because vscode inserts them into the string.
    $ical_data_clean = preg_replace('/^ +/m', '', $ical_data);

    return $ical_data_clean;
}


/**
 * Sends an email using Swift Mailer.
 *
 * @param array $smtpConfig SMTP server configuration.
 *                          Requires keys 'server', 'port', 'username', 'password'.
 *                          Optionally 'security' for encryption type.
 * @param string $fromEmail Sender's email address.
 * @param string $fromName Sender's name.
 * @param string|array $toEmails Recipient's email address(es). Can be a string or an array of strings.
 * @param string $subject Email subject.
 * @param string $htmlBody HTML content of the email body.
 * @param array $attachments Array of Swift_Attachment objects for attaching files.
 * @return int|bool Number of emails sent or false on failure.
 */
function sendEmail($smtpConfig, $fromEmail, $fromName, $toEmails, $subject, $htmlBody, array $attachments = [])
{

    try {
        // Create the transport
        $transport = new Swift_SmtpTransport(
            $smtpConfig['server'],
            $smtpConfig['port'],
            $smtpConfig['security'] ?? null
        );

        if (isset($smtpConfig['username'], $smtpConfig['password'])) {
            $transport->setUsername($smtpConfig['username']);
            $transport->setPassword($smtpConfig['password']);
        } else {
            throw new Exception('SMTP configuration is missing username or password.');
        }

        // Create the mailer
        $mailer = new Swift_Mailer($transport);

        // Create the message
        $message = new Swift_Message($subject);
        $message->setFrom([$fromEmail => $fromName]);

        // Set recipient email(s) based on debug mode
        require(__DIR__ . '/config.local.php');
        if ($email_debug && isset($debug_catchall_email)) {
            $toEmails = $debug_catchall_email; // Use debug catch-all email
        }

        // Handle both single email address and array of email addresses
        if (is_array($toEmails)) {
            foreach ($toEmails as $email) {
                $message->addTo($email);
            }
        } elseif (is_string($toEmails)) {
            $message->addTo($toEmails);
        } else {
            throw new Exception('Invalid recipient format. Expected string or array of emails.');
        }

        // Set the HTML body
        $message->setBody($htmlBody, 'text/html');

        // Attach the files if provided
        foreach ($attachments as $attachment) {
            if ($attachment instanceof Swift_Attachment) {
                $message->attach($attachment);
            } else {
                throw new Exception('Invalid attachment type. Expected Swift_Attachment.');
            }
        }

        // Send the email
        return $mailer->send($message);
    } catch (Exception $e) {
        error_log('Email sending failed: ' . $e->getMessage()); // Log to PHP log
        return false;
    }
}


/**
 * Format a date string from the provided data using one or more date keys.
 *
 * @param array        $data       The data array containing date information.
 * @param string|array $dateKeys   A single date key or an array of date keys to check in the data.
 * @param string       $format     The date format string (default: 'M j, Y @ g:ia').
 *
 * @return string  The formatted date string or an empty string if no valid date is found.
 */
function formatDate($data, $dateKeys, $inFormat = 'Y-m-d H:i:s', $outFormat = 'M j, Y @ g:ia')
{
    $dateString = '';
    $dateKeys = is_array($dateKeys) ? $dateKeys : [$dateKeys];

    foreach ($dateKeys as $dateKey) {
        if (isset($data[$dateKey])) {
            $dateTime = date_create_from_format($inFormat, $data[$dateKey]);
            $dateString = $dateTime instanceof DateTime ? $dateTime->format($outFormat) : '';
            break; // Break out of the loop once a valid date is found
        }
    }

    return $dateString;
}


/**
 * Calculates the age based on the given birthdate.
 *
 * @param string $birthdate The birthdate in the format 'YYYY-MM-DD'.
 * @return string The age formatted as 'X yr' or 'X mo'.
 */
function calculateAge($birthdate)
{
    // Create a DateTime object for the birthdate
    $birthdate = new DateTime($birthdate);

    // Get the current date
    $currentDate = new DateTime();

    // Calculate the difference in years and months
    $ageYears = $currentDate->diff($birthdate)->y;
    $ageMonths = $currentDate->diff($birthdate)->m;

    // Determine the format based on age
    if ($ageYears < 1) {
        return $ageMonths . ' mo'; // Convert age to months if less than 1 year
    } else {
        $formattedAge = floor($ageYears) . ' yr'; // Display age in years
        $formattedAge .= $ageYears >= 2 ? 's' : ''; // Add 's' for plural if age is 2 or more
        return $formattedAge;
    }
}


/**
 * Generates a pseudo-random number based on a seed, which holds the result constant.
 *
 * @param int|string $seed The seed for the random number generator. Can be a number or a string.
 * @return Closure A function that, when called, generates a pseudo-random 8-bit value.
 */
function seededPRNG($seed)
{
    // Ensure the seed is a positive integer
    $seed = abs(crc32((string)$seed));

    // Return a closure that generates a pseudo-random 8-bit value
    return function () use (&$seed) {
        $seed = floor($seed * 0x2FFFFFF) + 0x6D2B79F5; // Update the internal state with arbitrary constants
        return ($seed >> 24) & 0xFF; // Extract the 8-bit portion of the state as the pseudo-random value
    };
}


/**
 * Generates a hex color code based on a seed value.
 *
 * @param int|string $seed The seed for the color generation. Can be a number or a string.
 * @return string A hex color code in the format "#RRGGBB".
 */
function seededHexColor($seed)
{
    // Helper Function(s)
    $toHex = function ($value) {
        return str_pad(dechex($value), 2, '0', STR_PAD_LEFT);
    };

    // Convert each component to hexadecimal
    $redHex = $toHex(seededPRNG($seed)());
    $greenHex = $toHex(seededPRNG($seed + 1)());
    $blueHex = $toHex(seededPRNG($seed + 2)());

    // Combine the hexadecimal components to form the final hex color code
    return "#{$redHex}{$greenHex}{$blueHex}";
}


/**
 * Breaks a string into chunks at a specified character count,
 * ensuring that the split occurs at the nearest space character
 * before the specified count.
 *
 * @param string $string The input string to be split.
 * @param int $maxLength The maximum length of each chunk.
 * @return array An array containing the separated strings.
 */
function breakStringAtSpace($string, $maxLength)
{
    $chunks = [];

    // Check if the string length is greater than the maximum length
    if (strlen($string) > $maxLength) {
        // Find the last space character within the specified length
        $lastSpaceIndex = strrpos(substr($string, 0, $maxLength), ' ');

        // If a space was found, split the string at that index
        if ($lastSpaceIndex !== false) {
            $chunks[] = substr($string, 0, $lastSpaceIndex);
            $chunks[] = substr($string, $lastSpaceIndex + 1);
        } else {
            // If no space was found, split the string at the specified length
            $chunks[] = substr($string, 0, $maxLength);
            $chunks[] = substr($string, $maxLength);
        }
    } else {
        // If the string length is not greater than the maximum length, return the string as is
        $chunks[] = $string;
    }

    return $chunks;
}


/**
 * Rotates an image if it is in landscape orientation.
 *
 * This function takes imageData as input, which is a binary string representing
 * an image, and the MIME type of the image. It checks if the image is in landscape
 * orientation and if the format is compatible (JPEG or PNG), and if so, rotates
 * it 90 degrees clockwise to make it portrait. The function returns the rotated
 * image data as a binary string. If the image format is not compatible or if the
 * image is not in landscape orientation, it returns the original image data.
 *
 * @param string $imageData The binary string representing the image data.
 * @param string $mimeType The MIME type of the image (e.g., 'image/jpeg', 'image/png').
 * @return string The rotated image data as a binary string, or the original image data if rotation is not needed or if the format is not compatible.
 */
function rotateImagePortrait($imageData, $mimeType)
{
    // Create image resource from binary string
    $source = imagecreatefromstring($imageData);

    // Get image dimensions and determine if it's landscape
    $width = imagesx($source);
    $height = imagesy($source);
    $isLandscape = $width > $height;

    // Check if the image format is compatible (JPEG or PNG)
    $compatibleFormats = ['image/jpeg', 'image/png'];
    $isCompatible = in_array($mimeType, $compatibleFormats);

    // Rotate the image if it's landscape and format is compatible
    if ($isLandscape && $isCompatible) {
        $rotated = imagerotate($source, 90, 0);
        ob_start();
        imagejpeg($rotated);
        $imageData = ob_get_clean();
        imagedestroy($rotated);
    }

    // Free up memory
    imagedestroy($source);

    // Return the rotated image data or original image data
    return $imageData;
}


/**
 * Convert an image from one format to another using the Imagick extension.
 *
 * This function takes binary data of an image, its input format, and the desired
 * output format, and converts the image to the specified format using the Imagick extension.
 *
 * @param string $inputImage Binary data of the input image.
 * @param string $inputFormat The format of the input image (e.g., 'jpeg', 'png', 'gif').
 * @param string $outputFormat The desired format of the output image (e.g., 'jpeg', 'png', 'gif').
 * @return string|false Binary data of the converted image, or false on failure.
 * @throws ImagickException If there's an error during conversion.
 *
 * @example
 * ```php
 * // Convert a JPEG image to PNG format
 * $jpegData = file_get_contents('input.jpg');
 * $pngData = convertImageFormat($jpegData, 'jpeg', 'png');
 * file_put_contents('output.png', $pngData);
 * ```
 *
 * @example
 * ```php
 * // Convert a PNG image to JPEG format
 * $pngData = file_get_contents('input.png');
 * $jpegData = convertImageFormat($pngData, 'png', 'jpeg');
 * file_put_contents('output.jpg', $jpegData);
 * ```
 */
function convertImageFormat($inputImage, $inputFormat, $outputFormat)
{

    // Check if the Imagick extension is loaded
    if (!extension_loaded('imagick')) {
        echo "Image Magick module not loaded in PHP.";
        return false;
    }

    // Create a new Imagick instance
    $imagick = new Imagick();

    // Get the supported formats
    $formats = $imagick->queryFormats();

    if (!in_array(trim(strtoupper($outputFormat)), $formats)) {
        echo "Image Convert Error: Image output format '$inputFormat' not supported.";
        return false;
    }

    try {
        // Read the input image
        $imagick->readImageBlob($inputImage);

        // Set the output format
        $imagick->setImageFormat($outputFormat);

        // Convert the image to the specified format and get the output as binary string
        $outputImage = $imagick->getImageBlob();

        return $outputImage;
    } catch (ImagickException $e) {
        // Handle the error
        echo 'Image Convert Error: ',  $e->getMessage(), " (input format: $inputFormat, output format: $outputFormat)\n";
        return false;
    }
}


/**
 * Registers a function to be called when the script execution ends.
 *
 * This function allows you to register a custom shutdown function
 * that will be called when the script execution ends, whether by
 * normal termination or due to a fatal error.
 *
 * @param callable $callback The callback function to be executed on shutdown.
 *                           It can be any valid PHP callable (e.g., a function name,
 *                           an anonymous function, or an array containing an object
 *                           instance and a method name).
 * @param mixed    $parameter Optional. Additional parameters to be passed to the callback function.
 *                           These parameters will be passed to the callback function in the order
 *                           they are specified here.
 * @param mixed    $_         Optional. Additional parameters to be passed to the callback function.
 *                           These parameters will be passed to the callback function in the order
 *                           they are specified here.
 * @return bool Returns true on success, or false on failure.
 */
// Register a custom error handler to catch fatal errors
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && $error['type'] === E_ERROR) {
        // Check if the error is related to memory exhaustion
        if (strpos($error['message'], 'Allowed memory size') !== false) {
            $memoryLimit = ini_get('memory_limit'); // Get the current PHP memory limit
            echo "An error occurred: Memory limit of $memoryLimit was exceeded."; // Handle the memory exhaustion error
        }
    }
});

/**
 * Recursively decodes HTML entities in the provided data array.
 *
 * This function iterates through each key-value pair in the input array.
 * If the value is an array, the function calls itself recursively to decode
 * any nested arrays. If the value is a string, it decodes HTML entities
 * to their corresponding characters.
 *
 * @param array $data The input data array with potential HTML entities.
 * @return array The data array with HTML entities decoded.
 */
function decodeHtmlEntities($data)
{
    foreach ($data as $key => $value) {
        if (is_array($value)) {
            $data[$key] = decodeHtmlEntities($value);
        } else {
            $data[$key] = html_entity_decode($value, ENT_QUOTES, 'UTF-8');
        }
    }
    return $data;
}

// ==============================
// Care Bridge Helper Functions
// ==============================

/**
 * Basic HTML sanitization with allowlist and attribute scrubbing
 */
function sanitizeHtml($html)
{
    // Allow a safe subset of tags
    $allowed_tags = '<p><br><strong><em><u><ol><ul><li><blockquote><code><pre><a><h1><h2><h3><h4><h5><h6><img><figure><figcaption><hr><span><div>';
    $clean = strip_tags($html, $allowed_tags);

    // Remove event handlers and javascript: URLs
    // Remove on* attributes
    $clean = preg_replace('/\son[a-z]+\s*=\s*"[^"]*"/i', '', $clean);
    $clean = preg_replace("/\son[a-z]+\s*='[^']*'/i", '', $clean);
    // Remove javascript: URLs in href/src
    $clean = preg_replace('/(href|src)\s*=\s*"javascript:[^"]*"/i', '$1="#"', $clean);
    $clean = preg_replace("/(href|src)\s*=\s*'javascript:[^']*'/i", '$1="#"', $clean);

    return $clean;
}

/**
 * Generate a text excerpt from HTML
 */
function generateExcerpt($html, $maxLength = 250)
{
    $text = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES)));
    if (mb_strlen($text) <= $maxLength) {
        return $text;
    }
    $cut = mb_substr($text, 0, $maxLength);
    // Avoid cutting a word in half
    $spacePos = mb_strrpos($cut, ' ');
    if ($spacePos !== false) {
        $cut = mb_substr($cut, 0, $spacePos);
    }
    return $cut . '…';
}

/**
 * CSRF helpers
 */
function ensureSession()
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
}

function generateCsrfToken()
{
    ensureSession();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validateCsrfToken($token)
{
    ensureSession();
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], (string)$token);
}

/**
 * Posts - CRUD helpers
 */
function createPost($db_conn, $data)
{
    $title = $data['title'] ?? null;
    $body_html = sanitizeHtml($data['body_html'] ?? '');
    $excerpt = $data['excerpt'] ?? generateExcerpt($body_html, 250);
    $hero_media_id = !empty($data['hero_media_id']) ? (int)$data['hero_media_id'] : null;
    $gallery_media_ids = !empty($data['gallery_media_ids']) ? json_encode($data['gallery_media_ids']) : null;
    $status = in_array(($data['status'] ?? 'draft'), ['draft','published']) ? $data['status'] : 'draft';
    $published_at = !empty($data['published_at']) ? $data['published_at'] : null;
    $created_by = $data['created_by_user_id'] ?? ($_SESSION['username'] ?? 'admin');

    $stmt = mysqli_prepare($db_conn, "INSERT INTO posts (title, body_html, excerpt, hero_media_id, gallery_media_ids, status, published_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, 'sssissss', $title, $body_html, $excerpt, $hero_media_id, $gallery_media_ids, $status, $published_at, $created_by);
    if (!mysqli_stmt_execute($stmt)) {
        return ['success' => false, 'error' => mysqli_error($db_conn)];
    }
    return ['success' => true, 'id' => mysqli_insert_id($db_conn)];
}

function updatePost($db_conn, $id, $data)
{
    $id = (int)$id;
    $title = $data['title'] ?? null;
    $body_html = isset($data['body_html']) ? sanitizeHtml($data['body_html']) : null;
    $excerpt = $data['excerpt'] ?? null;
    $hero_media_id = array_key_exists('hero_media_id', $data) ? (is_null($data['hero_media_id']) ? null : (int)$data['hero_media_id']) : null;
    $gallery_media_ids = array_key_exists('gallery_media_ids', $data) ? json_encode($data['gallery_media_ids']) : null;
    $status = isset($data['status']) && in_array($data['status'], ['draft','published']) ? $data['status'] : null;
    $published_at = $data['published_at'] ?? null;

    // Build dynamic update
    $fields = [];
    $params = [];
    $types = '';

    if (!is_null($title)) { $fields[] = 'title = ?'; $params[] = $title; $types .= 's'; }
    if (!is_null($body_html)) { $fields[] = 'body_html = ?'; $params[] = $body_html; $types .= 's'; }
    if (!is_null($excerpt)) { $fields[] = 'excerpt = ?'; $params[] = $excerpt; $types .= 's'; }
    if (!is_null($hero_media_id) || array_key_exists('hero_media_id', $data)) { $fields[] = 'hero_media_id = ?'; $params[] = $hero_media_id; $types .= 'i'; }
    if (!is_null($gallery_media_ids) || array_key_exists('gallery_media_ids', $data)) { $fields[] = 'gallery_media_ids = ?'; $params[] = $gallery_media_ids; $types .= 's'; }
    if (!is_null($status)) { $fields[] = 'status = ?'; $params[] = $status; $types .= 's'; }
    if (!is_null($published_at)) { $fields[] = 'published_at = ?'; $params[] = $published_at; $types .= 's'; }

    if (empty($fields)) {
        return ['success' => false, 'error' => 'No fields to update'];
    }

    $sql = 'UPDATE posts SET ' . implode(', ', $fields) . ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    $types .= 'i';
    $params[] = $id;

    $stmt = mysqli_prepare($db_conn, $sql);
    mysqli_stmt_bind_param($stmt, $types, ...$params);
    if (!mysqli_stmt_execute($stmt)) {
        return ['success' => false, 'error' => mysqli_error($db_conn)];
    }
    return ['success' => true];
}

function deletePost($db_conn, $id)
{
    $id = (int)$id;
    $stmt = mysqli_prepare($db_conn, 'DELETE FROM posts WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $id);
    return mysqli_stmt_execute($stmt);
}

function getPost($db_conn, $id)
{
    $id = (int)$id;
    $result = mysqli_query($db_conn, "SELECT * FROM posts WHERE id = {$id} LIMIT 1");
    return $result ? mysqli_fetch_assoc($result) : null;
}

function getPublishedPosts($db_conn, $limit = 10, $offset = 0)
{
    $limit = (int)$limit; $offset = (int)$offset;
    $sql = "SELECT p.*, m.variants_json AS hero_variants
            FROM posts p
            LEFT JOIN media m ON p.hero_media_id = m.id
            WHERE p.status = 'published' ORDER BY COALESCE(p.published_at, p.created_at) DESC
            LIMIT {$limit} OFFSET {$offset}";
    $res = mysqli_query($db_conn, $sql);
    $rows = [];
    if ($res) { while ($r = mysqli_fetch_assoc($res)) { $rows[] = $r; } }
    return $rows;
}

/**
 * Media helpers
 */
function saveMediaRecord($db_conn, $data)
{
    $stmt = mysqli_prepare($db_conn, "INSERT INTO media (filename, original_filename, mime_type, size_bytes, width, height, alt_text, storage_path, variants_json, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param(
        $stmt,
        'sssiiissss',
        $data['filename'],
        $data['original_filename'],
        $data['mime_type'],
        $data['size_bytes'],
        $data['width'],
        $data['height'],
        $data['alt_text'],
        $data['storage_path'],
        $data['variants_json'],
        $data['created_by_user_id']
    );
    if (!mysqli_stmt_execute($stmt)) {
        return ['success' => false, 'error' => mysqli_error($db_conn)];
    }
    return ['success' => true, 'id' => mysqli_insert_id($db_conn)];
}

function getMedia($db_conn, $id)
{
    $id = (int)$id;
    $res = mysqli_query($db_conn, "SELECT * FROM media WHERE id = {$id} LIMIT 1");
    return $res ? mysqli_fetch_assoc($res) : null;
}

function getAllMedia($db_conn, $limit = 50, $offset = 0, $search = null)
{
    $limit = (int)$limit; $offset = (int)$offset;
    $where = '';
    if ($search) {
        $q = mysqli_real_escape_string($db_conn, $search);
        $where = "WHERE original_filename LIKE '%{$q}%' OR alt_text LIKE '%{$q}%'";
    }
    $sql = "SELECT * FROM media {$where} ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}";
    $res = mysqli_query($db_conn, $sql);
    $rows = [];
    if ($res) { while ($r = mysqli_fetch_assoc($res)) { $rows[] = $r; } }
    return $rows;
}

function updateMediaAltText($db_conn, $id, $altText)
{
    $id = (int)$id;
    $stmt = mysqli_prepare($db_conn, 'UPDATE media SET alt_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'si', $altText, $id);
    return mysqli_stmt_execute($stmt);
}

/**
 * Settings helpers
 */
function getSettings($db_conn)
{
    $res = mysqli_query($db_conn, 'SELECT * FROM settings WHERE id = 1');
    return $res ? mysqli_fetch_assoc($res) : null;
}

function updateSettings($db_conn, $data)
{
    $fields = ['site_title','hero_html','hero_media_id','site_bio_html','donation_settings_json','timezone','cta_text','cta_url','donate_text_html','hero_overlay_opacity','hero_overlay_color','show_hero','show_about','show_donation'];
    $sets = [];
    $params = [];
    $types = '';

    foreach ($fields as $key) {
        if (array_key_exists($key, $data)) {
            $sets[] = "$key = ?";
            $params[] = $key === 'hero_html' || $key === 'site_bio_html' || $key === 'donate_text_html' ? sanitizeHtml($data[$key]) : $data[$key];
            // hero_media_id and show_* fields are integers
            if ($key === 'hero_media_id' || $key === 'show_hero' || $key === 'show_about' || $key === 'show_donation') { $types .= 'i'; }
            elseif ($key === 'hero_overlay_opacity') { $types .= 'd'; }
            else { $types .= 's'; }
        }
    }

    if (empty($sets)) { return ['success' => false, 'error' => 'No fields to update']; }

    $sql = 'UPDATE settings SET ' . implode(', ', $sets) . ', updated_at = CURRENT_TIMESTAMP WHERE id = 1';
    $stmt = mysqli_prepare($db_conn, $sql);
    mysqli_stmt_bind_param($stmt, $types, ...$params);
    if (!mysqli_stmt_execute($stmt)) {
        return ['success' => false, 'error' => mysqli_error($db_conn)];
    }
    return ['success' => true];
}

?>
