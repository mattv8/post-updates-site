<?php
/*
    Custom PHP Functions
*/
require_once(__DIR__ . '/framework/conf/config.php');
require_once(__DIR__ . '/framework/lib/functions.php');
require_once(__DIR__ . '/vendor/autoload.php'); // Composer autoload

// Default AI system prompt for title generation
define('DEFAULT_AI_SYSTEM_PROMPT', 'You are a helpful assistant that creates concise, engaging titles for update posts. The title should be short (3-8 words), and capture the essence of the update. Return ONLY the title text, nothing else.');

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
// Post Portal Helper Functions
// ==============================

/**
 * Basic HTML sanitization with allowlist and attribute scrubbing
 * Allows empty HTML content - returns empty string for empty inputs
 * This ensures users can erase default content if desired
 *
 * @param string $html HTML content to sanitize (can be empty)
 * @return string Sanitized HTML (empty string if input is empty)
 */
function sanitizeHtml($html)
{
    // Allow a safe subset of tags (including both <em> and <i> for italic formatting)
    $allowed_tags = '<p><br><strong><b><em><i><u><ol><ul><li><blockquote><code><pre><a><h1><h2><h3><h4><h5><h6><img><figure><figcaption><hr><span><div>';
    $clean = strip_tags($html, $allowed_tags);

    // Remove event handlers and javascript: URLs (quick pass)
    // Remove on* attributes
    $clean = preg_replace('/\son[a-z]+\s*=\s*"[^"]*"/i', '', $clean);
    $clean = preg_replace("/\son[a-z]+\s*='[^']*'/i", '', $clean);
    // Remove javascript: URLs in href/src
    $clean = preg_replace('/(href|src)\s*=\s*"javascript:[^"]*"/i', '$1="#"', $clean);
    $clean = preg_replace("/(href|src)\s*=\s*'javascript:[^']*'/i", '$1="#"', $clean);

    // Deep sanitize anchors and images using DOM to preserve allowed attributes safely
    if (trim($clean) === '') {
        return $clean;
    }

    $prevUseInternalErrors = libxml_use_internal_errors(true);
    $dom = new DOMDocument('1.0', 'UTF-8');
    // Properly load UTF-8 HTML without converting to HTML entities
    // Prepend UTF-8 XML declaration to ensure proper encoding handling
    $wrappedHtml = '<?xml encoding="UTF-8"><div>' . $clean . '</div>';
    $dom->loadHTML($wrappedHtml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);

    // Allowed alignment classes from Quill
    $allowedClasses = ['ql-align-left', 'ql-align-center', 'ql-align-right', 'ql-align-justify'];

    // Process all elements to clean up class attributes
    $xpath = new DOMXPath($dom);
    $elementsWithClass = $xpath->query('//*[@class]');
    foreach ($elementsWithClass as $element) {
        $classes = explode(' ', $element->getAttribute('class'));
        $safeClasses = array_filter($classes, function($cls) use ($allowedClasses) {
            return in_array(trim($cls), $allowedClasses);
        });

        if (empty($safeClasses)) {
            $element->removeAttribute('class');
        } else {
            $element->setAttribute('class', implode(' ', $safeClasses));
        }
    }

    // Allow only safe link protocols and enforce rel for target=_blank
    $allowedSchemes = ['http', 'https', 'mailto', 'tel', 'sms'];
    foreach ($dom->getElementsByTagName('a') as $a) {
        $href = $a->getAttribute('href');
        $hrefTrim = trim($href);

        $isRelative = (strpos($hrefTrim, '/') === 0) || (strpos($hrefTrim, '#') === 0) || ($hrefTrim === '');
        $ok = $isRelative;

        // If there is no scheme but it looks like a domain or email, normalize it
        if (!$isRelative && $hrefTrim && !preg_match('/^[a-z][a-z0-9+.-]*:/i', $hrefTrim)) {
            if (filter_var($hrefTrim, FILTER_VALIDATE_EMAIL)) {
                $hrefTrim = 'mailto:' . $hrefTrim;
            } elseif (preg_match('/^(www\.|[a-z0-9.-]+\.[a-z]{2,})(\/.*)?$/i', $hrefTrim)) {
                // Looks like a bare domain, default to https
                $hrefTrim = 'https://' . $hrefTrim;
            }
        }

        if (!$ok && $hrefTrim) {
            $parts = parse_url($hrefTrim);
            $scheme = isset($parts['scheme']) ? strtolower($parts['scheme']) : '';
            if (in_array($scheme, $allowedSchemes, true)) {
                $ok = true;
            }
        }

        if ($ok) {
            // Persist normalized href if changed
            if ($hrefTrim !== $href) {
                $a->setAttribute('href', $hrefTrim);
            }
        } else {
            // Fallback to harmless link
            $a->setAttribute('href', '#');
        }

        // If opening in a new tab, add safe rel attributes
        if (strtolower($a->getAttribute('target')) === '_blank') {
            $rel = strtolower($a->getAttribute('rel'));
            $rels = array_filter(array_unique(array_merge(
                $rel ? preg_split('/\s+/', $rel) : [],
                ['noopener', 'noreferrer']
            )));
            $a->setAttribute('rel', implode(' ', $rels));
        }

        // Strip any event handler attributes that might remain
        $attrsToRemove = [];
        foreach ($a->attributes as $attr) {
            if (preg_match('/^on/i', $attr->name)) {
                $attrsToRemove[] = $attr->name;
            }
        }
        foreach ($attrsToRemove as $attrName) {
            $a->removeAttribute($attrName);
        }
    }

    // For images: ensure no javascript: in src
    foreach ($dom->getElementsByTagName('img') as $img) {
        $src = $img->getAttribute('src');
        if (preg_match('/^\s*javascript:/i', $src)) {
            $img->setAttribute('src', '');
        }
        // Remove event handlers
        $attrsToRemove = [];
        foreach ($img->attributes as $attr) {
            if (preg_match('/^on/i', $attr->name)) {
                $attrsToRemove[] = $attr->name;
            }
        }
        foreach ($attrsToRemove as $attrName) {
            $img->removeAttribute($attrName);
        }
    }

    // Extract the content from the wrapper div
    $body = $dom->getElementsByTagName('div')->item(0);
    $clean = '';
    if ($body) {
        foreach ($body->childNodes as $child) {
            $clean .= $dom->saveHTML($child);
        }
    } else {
        // Fallback if wrapper not found
        $clean = $dom->saveHTML();
    }

    libxml_clear_errors();
    libxml_use_internal_errors($prevUseInternalErrors);
    return $clean;
}

/**
 * Generate a text excerpt from HTML
 */
function generateExcerpt($html, $maxLength = 250)
{
    $text = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES, 'UTF-8')));
    if (mb_strlen($text, 'UTF-8') <= $maxLength) {
        return $text;
    }
    $cut = mb_substr($text, 0, $maxLength, 'UTF-8');
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
    $hero_image_height = !empty($data['hero_image_height']) ? (int)$data['hero_image_height'] : 100;
    $hero_crop_overlay = isset($data['hero_crop_overlay']) ? (int)(bool)$data['hero_crop_overlay'] : 0;
    $hero_title_overlay = isset($data['hero_title_overlay']) ? (int)(bool)$data['hero_title_overlay'] : 1;
    $hero_overlay_opacity = isset($data['hero_overlay_opacity']) ? (float)$data['hero_overlay_opacity'] : 0.70;
    $gallery_media_ids = !empty($data['gallery_media_ids']) ? json_encode($data['gallery_media_ids']) : null;
    $status = in_array(($data['status'] ?? 'draft'), ['draft','published']) ? $data['status'] : 'draft';
    $published_at = !empty($data['published_at']) ? $data['published_at'] : null;
    $created_by = $data['created_by_user_id'] ?? ($_SESSION['username'] ?? 'admin');

    // Auto-set published_at when status is 'published' and no published_at is provided
    if ($status === 'published' && is_null($published_at)) {
        $published_at = date('Y-m-d H:i:s');
    }

    $stmt = mysqli_prepare($db_conn, "INSERT INTO posts (title, body_html, excerpt, hero_media_id, hero_image_height, hero_crop_overlay, hero_title_overlay, hero_overlay_opacity, gallery_media_ids, status, published_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, 'sssiiiidssss', $title, $body_html, $excerpt, $hero_media_id, $hero_image_height, $hero_crop_overlay, $hero_title_overlay, $hero_overlay_opacity, $gallery_media_ids, $status, $published_at, $created_by);
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
    $hero_image_height = array_key_exists('hero_image_height', $data) ? (is_null($data['hero_image_height']) ? null : (int)$data['hero_image_height']) : null;
    $hero_crop_overlay = array_key_exists('hero_crop_overlay', $data) ? (int)(bool)$data['hero_crop_overlay'] : null;
    $hero_title_overlay = array_key_exists('hero_title_overlay', $data) ? (int)(bool)$data['hero_title_overlay'] : null;
    $hero_overlay_opacity = array_key_exists('hero_overlay_opacity', $data) ? (float)$data['hero_overlay_opacity'] : null;
    $gallery_media_ids = array_key_exists('gallery_media_ids', $data) ? json_encode($data['gallery_media_ids']) : null;
    $status = isset($data['status']) && in_array($data['status'], ['draft','published']) ? $data['status'] : null;
    $published_at = $data['published_at'] ?? null;

    // Auto-set published_at when status changes to 'published'
    // Check current status and published_at from database
    if ($status === 'published') {
        $current = mysqli_fetch_assoc(mysqli_query($db_conn, "SELECT status, published_at FROM posts WHERE id = {$id}"));
        if ($current && is_null($current['published_at'])) {
            $published_at = date('Y-m-d H:i:s');
        }
    }

    // Build dynamic update
    $fields = [];
    $params = [];
    $types = '';

    if (!is_null($title)) { $fields[] = 'title = ?'; $params[] = $title; $types .= 's'; }
    if (!is_null($body_html)) { $fields[] = 'body_html = ?'; $params[] = $body_html; $types .= 's'; }
    if (!is_null($excerpt)) { $fields[] = 'excerpt = ?'; $params[] = $excerpt; $types .= 's'; }
    if (!is_null($hero_media_id) || array_key_exists('hero_media_id', $data)) { $fields[] = 'hero_media_id = ?'; $params[] = $hero_media_id; $types .= 'i'; }
    if (!is_null($hero_image_height) || array_key_exists('hero_image_height', $data)) { $fields[] = 'hero_image_height = ?'; $params[] = $hero_image_height; $types .= 'i'; }
    if (!is_null($hero_crop_overlay) || array_key_exists('hero_crop_overlay', $data)) { $fields[] = 'hero_crop_overlay = ?'; $params[] = $hero_crop_overlay; $types .= 'i'; }
    if (!is_null($hero_title_overlay) || array_key_exists('hero_title_overlay', $data)) { $fields[] = 'hero_title_overlay = ?'; $params[] = $hero_title_overlay; $types .= 'i'; }
    if (!is_null($hero_overlay_opacity) || array_key_exists('hero_overlay_opacity', $data)) { $fields[] = 'hero_overlay_opacity = ?'; $params[] = $hero_overlay_opacity; $types .= 'd'; }
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
    // Soft delete - set deleted_at timestamp instead of actually deleting
    $stmt = mysqli_prepare($db_conn, 'UPDATE posts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
    mysqli_stmt_bind_param($stmt, 'i', $id);
    return mysqli_stmt_execute($stmt);
}

function publishDraft($db_conn, $id)
{
    // Copy all draft fields to published fields for posts
    $id = (int)$id;
    $sql = "UPDATE posts SET
        title = COALESCE(title_draft, title),
        body_html = COALESCE(body_html_draft, body_html),
        hero_media_id = COALESCE(hero_media_id_draft, hero_media_id),
        hero_image_height = COALESCE(hero_image_height_draft, hero_image_height),
        hero_crop_overlay = COALESCE(hero_crop_overlay_draft, hero_crop_overlay),
        hero_title_overlay = COALESCE(hero_title_overlay_draft, hero_title_overlay),
        hero_overlay_opacity = COALESCE(hero_overlay_opacity_draft, hero_overlay_opacity),
        gallery_media_ids = COALESCE(gallery_media_ids_draft, gallery_media_ids),
        status = 'published',
        published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NULL";

    $stmt = mysqli_prepare($db_conn, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $id);
    if (!mysqli_stmt_execute($stmt)) {
        return ['success' => false, 'error' => mysqli_error($db_conn)];
    }

    // Refresh excerpt based on the now-published body_html to avoid stale excerpts
    // This ensures email notifications and list views use up-to-date summaries
    $res = mysqli_query($db_conn, "SELECT body_html FROM posts WHERE id = {$id} LIMIT 1");
    if ($res) {
        $row = mysqli_fetch_assoc($res);
        if ($row && isset($row['body_html'])) {
            $newExcerpt = generateExcerpt($row['body_html'], 250);
            $stmt2 = mysqli_prepare($db_conn, 'UPDATE posts SET excerpt = ? WHERE id = ?');
            if ($stmt2) {
                mysqli_stmt_bind_param($stmt2, 'si', $newExcerpt, $id);
                // If this update fails, don't fail the publish action; log and continue
                if (!mysqli_stmt_execute($stmt2)) {
                    error_log('Failed to refresh excerpt on publish for post ' . $id . ': ' . mysqli_error($db_conn));
                }
            }
        }
    }

    return ['success' => true];
}

/**
 * Publish draft settings to production
 * Uses COALESCE to preserve empty string values from draft
 * Empty strings are NOT NULL, so they will be honored if explicitly set
 * This allows users to erase content from about/donate sections if desired
 *
 * @param mysqli $db_conn Database connection
 * @return array Result with success status
 */
function publishSettingsDraft($db_conn)
{
    // Copy all draft fields to published fields for settings
    $sql = "UPDATE settings SET
        hero_html = COALESCE(hero_html_draft, hero_html),
        site_bio_html = COALESCE(site_bio_html_draft, site_bio_html),
        donate_text_html = COALESCE(donate_text_html_draft, donate_text_html),
        donation_instructions_html = COALESCE(donation_instructions_html_draft, donation_instructions_html),
        footer_column1_html = COALESCE(footer_column1_html_draft, footer_column1_html),
        footer_column2_html = COALESCE(footer_column2_html_draft, footer_column2_html),
        mailing_list_html = COALESCE(mailing_list_html_draft, mailing_list_html),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1";

    $stmt = mysqli_prepare($db_conn, $sql);
    if (!mysqli_stmt_execute($stmt)) {
        return ['success' => false, 'error' => mysqli_error($db_conn)];
    }
    return ['success' => true];
}

/**
 * Decode HTML entities in post data for proper UTF-8 display
 * This ensures that content stored with HTML entities is properly decoded
 * before being displayed to prevent character encoding issues
 *
 * @param array|null $post Post data array
 * @return array|null Post data with decoded HTML entities
 */
function decodePostHtmlEntities($post) {
    if (!$post) {
        return null;
    }

    // Fields that may contain HTML entities that need decoding
    $fieldsToDecodec = ['title', 'body_html', 'excerpt'];

    foreach ($fieldsToDecodec as $field) {
        if (isset($post[$field]) && $post[$field] !== null) {
            $post[$field] = html_entity_decode($post[$field], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
    }

    return $post;
}

function getPost($db_conn, $id)
{
    $id = (int)$id;
    $sql = "SELECT p.*,
                   u.first AS author_first, u.last AS author_last, u.username AS author_username
            FROM posts p
            LEFT JOIN users u ON p.created_by_user_id = u.username
            WHERE p.id = {$id} AND p.deleted_at IS NULL LIMIT 1";
    $result = mysqli_query($db_conn, $sql);
    $post = $result ? mysqli_fetch_assoc($result) : null;
    return decodePostHtmlEntities($post);
}

function getPublishedPosts($db_conn, $limit = 10, $offset = 0)
{
    $limit = (int)$limit; $offset = (int)$offset;
    $sql = "SELECT p.*, m.variants_json AS hero_variants,
                   u.first AS author_first, u.last AS author_last, u.username AS author_username
            FROM posts p
            LEFT JOIN media m ON p.hero_media_id = m.id
            LEFT JOIN users u ON p.created_by_user_id = u.username
            WHERE p.status = 'published' AND p.deleted_at IS NULL
            ORDER BY COALESCE(p.published_at, p.created_at) DESC
            LIMIT {$limit} OFFSET {$offset}";
    $res = mysqli_query($db_conn, $sql);
    $rows = [];
    if ($res) {
        while ($r = mysqli_fetch_assoc($res)) {
            $rows[] = decodePostHtmlEntities($r);
        }
    }
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
    $settings = $res ? mysqli_fetch_assoc($res) : null;

    // Decrypt SMTP password if it exists
    if ($settings && !empty($settings['smtp_password'])) {
        $settings['smtp_password'] = decryptSmtpPassword($settings['smtp_password']);
    }

    return $settings;
}

/**
 * Get logo URL (with retina support via srcset)
 * Returns array with logo_url and logo_srcset_png
 */
function getLogoUrls($db_conn, $logo_media_id = null)
{
    global $logo;

    if (!$logo_media_id) {
        // Return default logo from config
        $default_logo = $logo ?? '/images/default-logo.svg';
        return [
            'logo_url' => $default_logo,
            'logo_srcset_png' => '',
            'logo_srcset_webp' => ''
        ];
    }

    $media = getMedia($db_conn, (int)$logo_media_id);
    if (!$media || empty($media['variants_json'])) {
        // Return default logo from config
        $default_logo = $logo ?? '/images/default-logo.svg';
        return [
            'logo_url' => $default_logo,
            'logo_srcset_png' => '',
            'logo_srcset_webp' => ''
        ];
    }

    require_once(__DIR__ . '/lib/MediaProcessor.php');
    $variants = json_decode($media['variants_json'], true);

    // Find the 200w PNG variant for default
    $logo200 = null;
    foreach ($variants as $v) {
        if ($v['width'] == 200 && $v['format'] == 'png') {
            $logo200 = $v;
            break;
        }
    }

    $default_logo = $logo ?? '/images/default-logo.svg';
    $logo_url = $logo200 ? ('/' . $logo200['path']) : $default_logo;
    $logo_srcset_png = MediaProcessor::generateSrcset($variants, 'png');
    $logo_srcset_webp = MediaProcessor::generateSrcset($variants, 'webp');

    return [
        'logo_url' => $logo_url,
        'logo_srcset_png' => $logo_srcset_png,
        'logo_srcset_webp' => $logo_srcset_webp
    ];
}

/**
 * Get favicon URLs for various sizes
 * Returns array with favicon URLs for different sizes
 */
function getFaviconUrls($db_conn, $favicon_media_id = null)
{
    if (!$favicon_media_id) {
        // Return default favicon
        return [
            'favicon_ico' => '/images/favicon.svg',
            'favicon_svg' => '/images/favicon.svg',
            'favicon_32' => '/images/favicon.svg',
            'favicon_16' => '/images/favicon.svg',
            'favicon_192' => '/images/favicon.svg',
            'favicon_512' => '/images/favicon.svg'
        ];
    }

    $media = getMedia($db_conn, (int)$favicon_media_id);
    if (!$media || empty($media['variants_json'])) {
        return [
            'favicon_ico' => '/images/favicon.svg',
            'favicon_svg' => '/images/favicon.svg',
            'favicon_32' => '/images/favicon.svg',
            'favicon_16' => '/images/favicon.svg',
            'favicon_192' => '/images/favicon.svg',
            'favicon_512' => '/images/favicon.svg'
        ];
    }

    $variants = json_decode($media['variants_json'], true);

    // Initialize with defaults
    $result = [
        'favicon_ico' => null,
        'favicon_svg' => null,
        'favicon_16' => null,
        'favicon_32' => null,
        'favicon_192' => null,
        'favicon_512' => null
    ];

    // Find .ico file
    foreach ($variants as $v) {
        if (isset($v['format']) && $v['format'] == 'ico') {
            $result['favicon_ico'] = '/' . $v['path'];
            break;
        }
    }

    // Find PNG sizes
    $sizes = [16, 32, 192, 512];
    foreach ($sizes as $size) {
        foreach ($variants as $v) {
            if (isset($v['format']) && $v['format'] == 'png' && isset($v['size']) && $v['size'] == $size) {
                $result['favicon_' . $size] = '/' . $v['path'];
                break;
            }
        }
    }

    // Use 32x32 PNG as .ico fallback if .ico wasn't generated
    if (!$result['favicon_ico'] && $result['favicon_32']) {
        $result['favicon_ico'] = $result['favicon_32'];
    }

    return $result;
}

/**
 * Encrypt SMTP password using AES-256-CBC
 */
function encryptSmtpPassword($password)
{
    if (empty($password)) {
        return '';
    }

    // Use a key derived from the database credentials (consistent across requests)
    $key = hash('sha256', getenv('MYSQL_PASSWORD') . getenv('MYSQL_DATABASE'), true);
    $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
    $encrypted = openssl_encrypt($password, 'aes-256-cbc', $key, 0, $iv);

    // Store IV with encrypted data (base64 encoded)
    return base64_encode($iv . $encrypted);
}

/**
 * Decrypt SMTP password
 */
function decryptSmtpPassword($encryptedPassword)
{
    if (empty($encryptedPassword)) {
        return '';
    }

    try {
        // Use the same key as encryption
        $key = hash('sha256', getenv('MYSQL_PASSWORD') . getenv('MYSQL_DATABASE'), true);
        $data = base64_decode($encryptedPassword, true);

        if ($data === false) {
            error_log("decryptSmtpPassword: Failed to base64 decode - invalid encrypted data");
            return '';
        }

        // Extract IV and encrypted data
        $ivLength = openssl_cipher_iv_length('aes-256-cbc');
        $iv = substr($data, 0, $ivLength);
        $encrypted = substr($data, $ivLength);

        if (strlen($iv) !== $ivLength) {
            error_log("decryptSmtpPassword: Invalid IV length - corrupted encrypted data");
            return '';
        }

        $decrypted = openssl_decrypt($encrypted, 'aes-256-cbc', $key, 0, $iv);

        if ($decrypted === false) {
            error_log("decryptSmtpPassword: Decryption failed - possible key mismatch or corrupted data");
            return '';
        }

        return $decrypted;
    } catch (Exception $e) {
        error_log("decryptSmtpPassword: Exception - " . $e->getMessage());
        return '';
    }
}function updateSettings($db_conn, $data)
{
    $fields = ['site_title','hero_html','hero_media_id','site_bio_html','donation_settings_json','timezone','cta_text','cta_url','donate_text_html','donation_method','donation_link','donation_qr_media_id','donation_instructions_html','hero_overlay_opacity','hero_overlay_color','show_hero','show_about','show_donation','show_mailing_list','notify_subscribers_on_post','email_include_post_body','show_donate_button','ai_system_prompt','hero_height','show_footer','footer_layout','footer_media_id','footer_height','footer_overlay_opacity','footer_overlay_color','footer_column1_html','footer_column2_html','mailing_list_html','smtp_rate_limit','smtp_rate_period','smtp_batch_delay','smtp_host','smtp_port','smtp_secure','smtp_auth','smtp_username','smtp_password','smtp_from_email','smtp_from_name','show_logo'];
    $sets = [];
    $params = [];
    $types = '';

    foreach ($fields as $key) {
        if (array_key_exists($key, $data)) {
            $sets[] = "$key = ?";
            // Encrypt SMTP password before saving
            if ($key === 'smtp_password') {
                $params[] = encryptSmtpPassword($data[$key]);
            }
            // Sanitize HTML fields
            elseif ($key === 'hero_html' || $key === 'site_bio_html' || $key === 'donate_text_html' || $key === 'donation_instructions_html' || $key === 'footer_column1_html' || $key === 'footer_column2_html' || $key === 'mailing_list_html') {
                $params[] = sanitizeHtml($data[$key]);
            } else {
                $params[] = $data[$key];
            }
            // Set parameter types
            if ($key === 'hero_media_id' || $key === 'show_hero' || $key === 'show_about' || $key === 'show_donation' || $key === 'show_mailing_list' || $key === 'notify_subscribers_on_post' || $key === 'email_include_post_body' || $key === 'show_donate_button' || $key === 'donation_qr_media_id' || $key === 'hero_height' || $key === 'show_footer' || $key === 'footer_media_id' || $key === 'footer_height' || $key === 'smtp_rate_limit' || $key === 'smtp_rate_period' || $key === 'smtp_port' || $key === 'smtp_auth' || $key === 'show_logo') { $types .= 'i'; }
            elseif ($key === 'hero_overlay_opacity' || $key === 'footer_overlay_opacity' || $key === 'smtp_batch_delay') { $types .= 'd'; }
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

/**
 * Newsletter helpers
 */
function getActiveSubscriberCount($db_conn)
{
    $result = mysqli_query($db_conn, 'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE is_active = 1');
    if ($result) {
        $row = mysqli_fetch_assoc($result);
        return (int)$row['count'];
    }
    return 0;
}

function getTotalSubscriberCount($db_conn)
{
    $result = mysqli_query($db_conn, 'SELECT COUNT(*) as count FROM newsletter_subscribers');
    if ($result) {
        $row = mysqli_fetch_assoc($result);
        return (int)$row['count'];
    }
    return 0;
}

/**
 * Generate a secure unsubscribe token for an email address
 * Uses HMAC to prevent tampering
 *
 * @param string $email The email address to generate a token for
 * @return string URL-safe base64 encoded token
 */
function generateUnsubscribeToken($email)
{
    require(__DIR__ . '/config.local.php');

    // Use a secret key from config or generate one
    // For production, this should be in your config.local.php
    $secret = defined('UNSUBSCRIBE_SECRET') ? UNSUBSCRIBE_SECRET : $db_password;

    // Create payload with email (no timestamp/expiration)
    $payload = json_encode(['email' => $email]);

    // Generate HMAC signature
    $signature = hash_hmac('sha256', $payload, $secret);

    // Combine payload and signature
    $token = base64_encode($payload . '|' . $signature);

    // Make URL-safe
    return strtr($token, '+/', '-_');
}

/**
 * Validate and decode an unsubscribe token
 *
 * @param string $token The token to validate
 * @return string|false Email address if valid, false otherwise
 */
function validateUnsubscribeToken($token)
{
    require(__DIR__ . '/config.local.php');

    try {
        // Make URL-safe base64 back to normal
        $token = strtr($token, '-_', '+/');

        // Decode
        $decoded = base64_decode($token, true);
        if ($decoded === false) {
            return false;
        }

        // Split payload and signature
        $parts = explode('|', $decoded);
        if (count($parts) !== 2) {
            return false;
        }

        list($payload, $signature) = $parts;

        // Verify signature
        $secret = defined('UNSUBSCRIBE_SECRET') ? UNSUBSCRIBE_SECRET : $db_password;
        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            return false;
        }

        // Decode payload
        $data = json_decode($payload, true);
        if (!$data || !isset($data['email'])) {
            return false;
        }

        return $data['email'];

    } catch (Exception $e) {
        error_log('Unsubscribe token validation error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Send email notification to all active subscribers about a new post
 *
 * @param mysqli $db_conn Database connection
 * @param int $postId ID of the newly published post
 * @return array Result with success status and details
 */
function sendNewPostNotification($db_conn, $postId)
{
    // Get settings - notifications enabled and SMTP configuration
    $settings = getSettings($db_conn);
    if (!$settings || !$settings['notify_subscribers_on_post']) {
        return ['success' => false, 'error' => 'Notifications disabled in settings'];
    }

    // Load SMTP settings from database only
    $smtp_host = $settings['smtp_host'] ?? null;
    $smtp_port = isset($settings['smtp_port']) ? (int)$settings['smtp_port'] : 587;
    $smtp_secure = $settings['smtp_secure'] ?? 'none';
    // Convert 'none' to empty string for PHPMailer
    if ($smtp_secure === 'none') {
        $smtp_secure = '';
    }
    $smtp_auth = isset($settings['smtp_auth']) ? (bool)$settings['smtp_auth'] : true;
    $smtp_username = $settings['smtp_username'] ?? '';
    $smtp_password = $settings['smtp_password'] ?? '';
    $smtp_from_email = $settings['smtp_from_email'] ?? null;
    $smtp_from_name = $settings['smtp_from_name'] ?? 'Post Portal';

    // Debug: Log SMTP configuration (without exposing password)
    error_log("SMTP Config - Host: {$smtp_host}, Port: {$smtp_port}, Secure: {$smtp_secure}, Auth: " . ($smtp_auth ? 'true' : 'false') . ", Username: {$smtp_username}, Password Length: " . strlen($smtp_password));

    // Validate required SMTP settings
    if (!$smtp_host || !$smtp_from_email) {
        return ['success' => false, 'error' => 'SMTP configuration incomplete. Please configure SMTP settings in Admin > Newsletter > Email Settings.'];
    }

    // Get post details
    $post = getPost($db_conn, $postId);
    if (!$post) {
        return ['success' => false, 'error' => 'Post not found'];
    }

    // Get all active subscribers
    $result = mysqli_query($db_conn, 'SELECT email FROM newsletter_subscribers WHERE is_active = 1');
    if (!$result) {
        return ['success' => false, 'error' => 'Failed to fetch subscribers'];
    }

    $subscribers = [];
    while ($row = mysqli_fetch_assoc($result)) {
        // Only add non-empty email addresses
        if (!empty($row['email'])) {
            $subscribers[] = $row['email'];
        }
    }

    // Early return if no subscribers - avoid initializing SMTP connection
    if (empty($subscribers)) {
        error_log('No active subscribers found - skipping email notification');
        return ['success' => true, 'sent' => 0, 'message' => 'No active subscribers'];
    }

    // Build email content - post data already decoded by getPost()
    $siteTitle = $settings['site_title'] ?: 'Post Portal';
    $postTitle = $post['title'] ?: 'New Post';
    $subject = $postTitle;

    // Get author name
    $authorName = '';
    if (!empty($post['author_first']) || !empty($post['author_last'])) {
        $authorName = trim(($post['author_first'] ?? '') . ' ' . ($post['author_last'] ?? ''));
    }
    if (empty($authorName)) {
        $authorName = 'Someone';
    }

    // Get the base URL for the site (for linking to post)
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $baseUrl = "{$protocol}://{$host}";

    // Link directly to post detail overlay: /?page=home&post_id=X
    $postUrl = "{$baseUrl}/?page=home&post_id={$postId}";

    // Build HTML email body using Smarty templates
    // Initialize Smarty if not already available
    global $smarty;
    if (!isset($smarty) || !$smarty) {
        require_once(__DIR__ . '/framework/vendor/smarty4/libs/Smarty.class.php');
        $smarty = new Smarty();
        $smarty->setTemplateDir(__DIR__ . '/templates');
        $smarty->setCompileDir(__DIR__ . '/cache');
        $smarty->setCacheDir(__DIR__ . '/cache');
        // Disable auto-escaping since we're handling HTML content
        $smarty->escape_html = false;
    }

    $includePostBody = (bool)$settings['email_include_post_body'];

    // Prepare common template variables (non-personalized)
    $smarty->assign('site_title', $siteTitle);
    $smarty->assign('post_url', $postUrl);
    $smarty->assign('base_url', $baseUrl);

    // Prepare template variables based on email type
    if ($includePostBody) {
        // Get body HTML - already decoded by getPost()
        $bodyHtml = $post['body_html'];

        // Convert relative URLs to absolute URLs
        $bodyHtml = preg_replace('/(src|href)=["\']\//', '$1="' . $baseUrl . '/', $bodyHtml);

        // Get hero image data if available
        $heroImageUrl = '';
        if (!empty($post['hero_media_id'])) {
            $heroMedia = getMedia($db_conn, (int)$post['hero_media_id']);
            if ($heroMedia && !empty($heroMedia['variants_json'])) {
                // Use 800w variant for email (optimal for email clients)
                $variants = json_decode($heroMedia['variants_json'], true);

                if (is_array($variants)) {
                    foreach ($variants as $v) {
                        if (isset($v['width']) && $v['width'] === 800 && isset($v['format']) && $v['format'] === 'jpg' && !empty($v['path'])) {
                            $heroImageUrl = $baseUrl . '/' . ltrim($v['path'], '/');
                            break;
                        }
                    }
                }
            }
        }

        // Assign variables for full email template
        $smarty->assign('post_title', $postTitle);
        $smarty->assign('hero_image_url', $heroImageUrl);
        $smarty->assign('hero_image_height', $post['hero_image_height'] ?? 100);
        $smarty->assign('hero_title_overlay', $post['hero_title_overlay'] ?? 1);
        $smarty->assign('hero_overlay_opacity', $post['hero_overlay_opacity'] ?? 0.70);
        $smarty->assign('body_html', $bodyHtml);
    } else {
        // Always derive excerpt from the latest body_html to avoid stale saved excerpts
        $excerpt = generateExcerpt($post['body_html'], 150);

        // Assign variables for excerpt email template
        $smarty->assign('author_name', $authorName);
        $smarty->assign('excerpt', $excerpt);
    }

    // Send emails individually to each subscriber with personalized unsubscribe link
    $sentCount = 0;
    $errors = [];

    try {
        require_once(__DIR__ . '/vendor/autoload.php');

        // Create PHPMailer instance once and reuse
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);

        // Enable debug output for error logging (in production, errors are logged not displayed)
        $debugMode = getenv('DEBUG') === 'true' || getenv('DEBUG') === '1';
        $mail->SMTPDebug = $debugMode ? 3 : 0; // Verbose debugging in dev mode only
        $mail->Debugoutput = function($str, $level) use ($debugMode) {
            if ($debugMode) {
                // Only write to app log file (not error_log to avoid duplication)
                $logFile = '/var/www/html/logs/smtp.log';
                @file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . trim($str) . "\n", FILE_APPEND);
            }
        };

        // Server settings
        $mail->isSMTP();
        $mail->Host = $smtp_host;
        $mail->Port = $smtp_port;

        // Set connection timeout to prevent gateway timeouts on unreachable servers
        $mail->Timeout = 10; // Connection timeout in seconds
        $mail->SMTPKeepAlive = true; // Keep connection alive for multiple sends

        if ($smtp_auth) {
            $mail->SMTPAuth = true;
            $mail->Username = $smtp_username;
            $mail->Password = $smtp_password;
        } else {
            $mail->SMTPAuth = false;
        }

        if ($smtp_secure) {
            $mail->SMTPSecure = $smtp_secure;
        }

        // Additional SMTP options for better compatibility
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ];

        // Test connection before attempting to send emails
        try {
            if (!$mail->smtpConnect()) {
                $errorMsg = 'Failed to connect to SMTP server ' . $smtp_host . ':' . $smtp_port . '. Please verify the server is reachable and settings are correct.';
                error_log('SMTP connection failed: ' . $errorMsg);
                return [
                    'success' => false,
                    'error' => 'Cannot connect to SMTP server. Please check your email settings.'
                ];
            }
        } catch (Exception $e) {
            $errorMsg = 'SMTP connection exception: ' . $e->getMessage();
            error_log($errorMsg);
            return [
                'success' => false,
                'error' => 'Cannot connect to SMTP server: ' . $e->getMessage()
            ];
        }

        // Sender - use configured from name and email
        $mail->setFrom($smtp_from_email, $smtp_from_name);

        // Content settings
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';
        $mail->Subject = $subject;

        // Rate limiting variables - use database settings if available, otherwise config defaults
        $smtp_rate_limit = isset($settings['smtp_rate_limit']) ? (int)$settings['smtp_rate_limit'] : (isset($smtp_rate_limit) ? $smtp_rate_limit : 20);
        $smtp_rate_period = isset($settings['smtp_rate_period']) ? (int)$settings['smtp_rate_period'] : (isset($smtp_rate_period) ? $smtp_rate_period : 60);
        $smtp_batch_delay = isset($settings['smtp_batch_delay']) ? (float)$settings['smtp_batch_delay'] : (isset($smtp_batch_delay) ? $smtp_batch_delay : 0.5);

        $rateLimitEnabled = $smtp_rate_limit > 0;
        $batchDelay = $smtp_batch_delay;
        $emailsSentInCurrentPeriod = 0;
        $periodStartTime = microtime(true);

        // Send to each subscriber individually with personalized unsubscribe link
        foreach ($subscribers as $email) {
            try {
                // Check rate limit - if we've hit the limit for this period, wait
                if ($rateLimitEnabled && $emailsSentInCurrentPeriod >= $smtp_rate_limit) {
                    $elapsedTime = microtime(true) - $periodStartTime;
                    $remainingTime = $smtp_rate_period - $elapsedTime;

                    if ($remainingTime > 0) {
                        error_log("Rate limit reached ({$smtp_rate_limit} emails per {$smtp_rate_period}s). Pausing for {$remainingTime}s...");
                        sleep(ceil($remainingTime));
                    }

                    // Reset counter and timer for new period
                    $emailsSentInCurrentPeriod = 0;
                    $periodStartTime = microtime(true);
                }

                // Generate personalized unsubscribe token for this email
                $unsubscribeToken = generateUnsubscribeToken($email);
                $unsubscribeUrl = "{$baseUrl}/api/unsubscribe.php?token={$unsubscribeToken}";

                // Assign the personalized unsubscribe URL to template
                $smarty->assign('unsubscribe_url', $unsubscribeUrl);

                // Render the email body with personalized unsubscribe link
                if ($includePostBody) {
                    $emailBody = $smarty->fetch('email_notification_full.tpl');
                } else {
                    $emailBody = $smarty->fetch('email_notification_excerpt.tpl');
                }

                // Clear previous recipients
                $mail->clearAddresses();

                // Add this subscriber
                $mail->addAddress($email);

                // Set body
                $mail->Body = $emailBody;
                $mail->AltBody = strip_tags($emailBody); // Plain text fallback

                // Send the email
                $mail->send();
                $sentCount++;
                $emailsSentInCurrentPeriod++;

                // Add delay between emails if configured
                if ($batchDelay > 0 && $sentCount < count($subscribers)) {
                    usleep((int)($batchDelay * 1000000)); // Convert to microseconds
                }

            } catch (Exception $e) {
                error_log("Failed to send notification to {$email}: " . $e->getMessage());
                $errors[] = $email;
            }
        }

        if ($sentCount > 0) {
            return [
                'success' => true,
                'sent' => $sentCount,
                'failed' => count($errors),
                'message' => "Notifications sent to {$sentCount} subscriber(s)" . (count($errors) > 0 ? " ({count($errors)} failed)" : '')
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to send emails to any subscribers'
            ];
        }

    } catch (Exception $e) {
        error_log('Failed to send post notification: ' . $e->getMessage());
        return [
            'success' => false,
            'error' => 'Failed to send email: ' . $e->getMessage()
        ];
    }
}

?>
