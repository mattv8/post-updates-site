<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$page_title|default:'Unsubscribe'}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .card {
            background-color: #fff;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h2 {
            color: #0066cc;
            margin-top: 0;
        }
        .error {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
        }
        .info {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
            padding: 15px;
            border-radius: 5px;
        }
        .success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #dc3545;
            color: #fff;
            text-decoration: none;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        }
        .btn:hover {
            background-color: #c82333;
        }
        .message {
            margin: 20px 0;
        }
        .message p {
            margin: 10px 0;
        }
        #success-message {
            display: none;
            margin-top: 20px;
        }
        #error-message {
            display: none;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="card">
        {if $status == 'error'}
            <div class="error">
                <h2>{$error_title|default:'Error'}</h2>
                <p>{$error_message}</p>
            </div>
        {elseif $status == 'info'}
            <div class="info">
                <h2>{$info_title|default:'Already Unsubscribed'}</h2>
                <p>{$info_message}</p>
            </div>
        {elseif $status == 'confirm'}
            <h2>Unsubscribe from Mailing List</h2>
            <div class="message">
                <p>You are about to unsubscribe the email address: <strong>{$masked_email}</strong></p>
                <p>You will no longer receive email notifications when new updates are posted.</p>
            </div>
            <form id="unsubscribe-form" method="POST" action="/api/unsubscribe.php">
                <input type="hidden" name="token" value="{$token}">
                <input type="hidden" name="csrf_token" value="{$csrf_token}">
                <button type="submit" class="btn">Confirm Unsubscribe</button>
            </form>
            <div id="success-message" class="success"></div>
            <div id="error-message" class="error"></div>
        {/if}
    </div>

    {if $status == 'confirm'}
    <script>
        document.getElementById("unsubscribe-form").addEventListener("submit", function(e) {
            e.preventDefault();

            const formData = new FormData(this);

            fetch("/api/unsubscribe.php", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById("success-message").textContent = data.message || "You have been successfully unsubscribed.";
                    document.getElementById("success-message").style.display = "block";
                    document.getElementById("unsubscribe-form").style.display = "none";
                } else {
                    document.getElementById("error-message").textContent = data.error || "An error occurred. Please try again.";
                    document.getElementById("error-message").style.display = "block";
                }
            })
            .catch(error => {
                document.getElementById("error-message").textContent = "Network error. Please try again.";
                document.getElementById("error-message").style.display = "block";
            });
        });
    </script>
    {/if}
</body>
</html>
