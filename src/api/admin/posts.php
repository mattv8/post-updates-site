<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';

ApiHandler::handle(function (): void {
    ['container' => $container, 'db' => $db] = bootstrapApi(requireAuth: true, requireAdmin: true);
    $postService = $container->getPostService();
    $postRepository = $container->getPostRepository();

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Resend notification email
            if (isset($_GET['action']) && $_GET['action'] === 'resend-email' && isset($_GET['id'])) {
                requireCsrfToken();
                $id = (int) $_GET['id'];

                $currentPost = $postService->getPost($id);
                if (!$currentPost) {
                    ErrorResponse::notFound('Post not found');
                }

                if (($currentPost['status'] ?? '') !== 'published') {
                    ErrorResponse::badRequest('Post must be published to send notifications');
                }

                $emailResult = sendNewPostNotification($db, $id);
                $response = ['success' => true];

                if ($emailResult['success']) {
                    error_log('Post notification resent: ' . ($emailResult['message'] ?? 'Success'));
                    $response['email'] = [
                        'sent' => true,
                        'count' => $emailResult['sent'] ?? 0,
                        'message' => $emailResult['message'] ?? 'Notifications sent',
                    ];
                } else {
                    error_log('Post notification resend failed: ' . ($emailResult['error'] ?? 'Unknown error'));
                    $response['email'] = [
                        'sent' => false,
                        'error' => $emailResult['error'] ?? 'Unknown error',
                    ];
                }

                ErrorResponse::success($response);
            }

            // Publish action
            if (isset($_GET['action']) && $_GET['action'] === 'publish' && isset($_GET['id'])) {
                requireCsrfToken();
                $id = (int) $_GET['id'];

                $skipEmail = false;
                if (isset($_GET['skip_email'])) {
                    $val = strtolower((string) $_GET['skip_email']);
                    $skipEmail = in_array($val, ['1', 'true', 'yes'], true);
                }

                $currentPost = $postService->getPost($id);
                $isFirstPublish = ($currentPost && is_null($currentPost['published_at']));

                $res = publishDraft($db, $id);

                if ($res['success']) {
                    $response = ['success' => true];

                    if ($isFirstPublish && !$skipEmail) {
                        $emailResult = sendNewPostNotification($db, $id);
                        if ($emailResult['success']) {
                            error_log('Post notification sent: ' . ($emailResult['message'] ?? 'Success'));
                            $response['email'] = [
                                'sent' => true,
                                'count' => $emailResult['sent'] ?? 0,
                                'message' => $emailResult['message'] ?? 'Notifications sent',
                            ];
                        } else {
                            error_log('Post notification failed: ' . ($emailResult['error'] ?? 'Unknown error'));
                            $response['email'] = [
                                'sent' => false,
                                'error' => $emailResult['error'] ?? 'Unknown error',
                            ];
                        }
                    } else {
                        $response['email'] = [
                            'sent' => false,
                            'skipped' => true,
                            'reason' => $isFirstPublish ? 'User opted out' : 'Not first-time publish',
                        ];
                    }

                    ErrorResponse::success($response);
                }

                ErrorResponse::badRequest($res['error'] ?? 'Failed to publish draft');
            }

            // Single post by id for editing
            if (isset($_GET['id']) && $_GET['id']) {
                $id = (int) $_GET['id'];
                $post = $postService->getPostWithAuthor($id);

                if ($post) {
                    $post['title_editing'] = $post['title_draft'] ?? $post['title'];
                    $post['body_html_editing'] = $post['body_html_draft'] ?? $post['body_html'];
                    $post['hero_media_id_editing'] = $post['hero_media_id_draft'] ?? $post['hero_media_id'];
                    $post['hero_image_height_editing'] = $post['hero_image_height_draft'] ?? $post['hero_image_height'];
                    $post['hero_crop_overlay_editing'] = $post['hero_crop_overlay_draft'] ?? $post['hero_crop_overlay'];
                    $post['hero_title_overlay_editing'] = $post['hero_title_overlay_draft'] ?? $post['hero_title_overlay'];
                    $post['hero_overlay_opacity_editing'] = $post['hero_overlay_opacity_draft'] ?? $post['hero_overlay_opacity'];
                    $post['gallery_media_ids_editing'] = $post['gallery_media_ids_draft'] ?? $post['gallery_media_ids'];

                    ErrorResponse::success(['data' => $post]);
                }

                ErrorResponse::notFound('Post not found');
            }

            // Paginated list
            $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? min(100, max(1, (int) $_GET['limit'])) : 20;
            $offset = ($page - 1) * $limit;

            $list = $postService->getPostsWithAuthor($limit, $offset);

            ErrorResponse::success([
                'data' => $list['data'],
                'meta' => [
                    'total' => $list['total'],
                    'page' => $page,
                    'limit' => $limit,
                ],
            ]);
            break;
        case 'POST':
            requireCsrfToken();
            $payload = $_POST;
            if (empty($payload)) {
                $payload = readJsonInput();
            }

            $payload['created_by_user_id'] = $_SESSION['username'];
            $res = createPost($db, $payload);
            if ($res['success']) {
                $postId = $res['id'];

                if (($payload['status'] ?? '') === 'published') {
                    parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
                    $skipEmail = false;
                    if (isset($query['skip_email'])) {
                        $val = strtolower((string) $query['skip_email']);
                        $skipEmail = in_array($val, ['1', 'true', 'yes'], true);
                    } elseif (isset($payload['skip_email'])) {
                        $val = strtolower((string) $payload['skip_email']);
                        $skipEmail = in_array($val, ['1', 'true', 'yes'], true);
                    }

                    if (!$skipEmail) {
                        $emailResult = sendNewPostNotification($db, $postId);
                        if ($emailResult['success']) {
                            error_log('Post notification sent: ' . $emailResult['message']);
                        } else {
                            error_log('Post notification failed: ' . ($emailResult['error'] ?? 'Unknown error'));
                        }
                    } else {
                        error_log('Post created and published without sending emails (user opted out)');
                    }
                }

                ErrorResponse::success(['id' => $postId]);
            }

            ErrorResponse::badRequest($res['error'] ?? 'Failed to create post');
            break;
        case 'PUT':
            requireCsrfToken();
            parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
            $id = isset($query['id']) ? (int) $query['id'] : 0;
            if (!$id) {
                ErrorResponse::badRequest('Missing id');
            }

            $payload = readJsonInput();
            $sendNotification = false;

            $skipEmail = false;
            if (isset($query['skip_email'])) {
                $val = strtolower((string) $query['skip_email']);
                $skipEmail = in_array($val, ['1', 'true', 'yes'], true);
            } elseif (isset($payload['skip_email'])) {
                $val = strtolower((string) $payload['skip_email']);
                $skipEmail = in_array($val, ['1', 'true', 'yes'], true);
            }

            if (($payload['status'] ?? '') === 'published') {
                $currentPost = $postService->getPost($id);
                if ($currentPost && is_null($currentPost['published_at'])) {
                    $sendNotification = true;
                }
            }

            $res = updatePost($db, $id, $payload);

            if ($res['success']) {
                if ($sendNotification && !$skipEmail) {
                    $emailResult = sendNewPostNotification($db, $id);
                    if ($emailResult['success']) {
                        error_log('Post notification sent: ' . $emailResult['message']);
                    } else {
                        error_log('Post notification failed: ' . ($emailResult['error'] ?? 'Unknown error'));
                    }
                } elseif ($sendNotification && $skipEmail) {
                    error_log('Post published without sending emails (user opted out)');
                }
                ErrorResponse::success();
            }

            ErrorResponse::badRequest($res['error'] ?? 'Failed to update post');
            break;
        case 'DELETE':
            requireCsrfToken();
            parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
            $id = isset($query['id']) ? (int) $query['id'] : 0;
            if (!$id) {
                ErrorResponse::badRequest('Missing id');
            }

            $ok = deletePost($db, $id);
            ErrorResponse::success(['success' => (bool) $ok]);
            break;
        default:
            ErrorResponse::json(405, 'Method not allowed');
    }
});
