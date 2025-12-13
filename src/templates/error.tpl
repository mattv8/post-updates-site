<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$page_title|default:'Error'}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
        .error-container {
            text-align: center;
            padding: 2rem;
        }
        .error-code {
            font-size: 6rem;
            font-weight: bold;
            color: #dc3545;
        }
        .error-message {
            font-size: 1.5rem;
            color: #6c757d;
            margin-bottom: 1.5rem;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-code">{$error_code|default:'500'}</div>
        <h1 class="mb-3">{$error_title|default:'Something went wrong'}</h1>
        <p class="error-message">{$error_message|default:'We encountered an unexpected error. Please try again later.'}</p>
        <a href="/" class="btn btn-primary">Go Home</a>
    </div>
</body>
</html>
