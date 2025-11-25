// Mapeamento de nomes camelCase para snake_case
// Gerado automaticamente em 2025-08-08T01:40:50.929Z

export const TABLE_MAPPINGS = {
  "apiKeyUsageLogs": "api_key_usage_logs",
  "apiKeys": "api_keys",
  "appSettings": "app_settings",
  "auditLogs": "audit_logs",
  "contentReports": "content_reports",
  "deviceTokens": "device_tokens",
  "errorLogs": "error_logs",
  "mediaFiles": "media_files",
  "plannerTasks": "planner_tasks",
  "programmedReviews": "programmed_reviews",
  "questionListFolders": "question_list_folders",
  "questionListItems": "question_list_items",
  "questionLists": "question_lists",
  "questionResponses": "question_responses",
  "rateLimitViolations": "rate_limit_violations",
  "rateLimits": "rate_limits",
  "scheduledTasks": "scheduled_tasks",
  "simulatedExamResults": "simulated_exam_results",
  "simulatedExams": "simulated_exams",
  "studySessions": "study_sessions",
  "subFilters": "sub_filters",
  "taskExecutionLogs": "task_execution_logs",
  "userAnswers": "user_answers",
  "userPlans": "user_plans",
  "userProfiles": "user_profiles",
  "userStatistics": "user_statistics"
} as const;

export const COLUMN_MAPPINGS = {
  "achievements": {
    "user_id": "user_id",
    "achievement_type": "achievement_type",
    "icon_url": "icon_url",
    "badge_level": "badge_level",
    "points_awarded": "points_awarded",
    "unlocked_at": "unlocked_at",
    "is_visible": "is_visible",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "analytics": {
    "user_id": "user_id",
    "event_type": "event_type",
    "event_name": "event_name",
    "event_data": "event_data",
    "session_id": "session_id",
    "device_info": "device_info",
    "user_agent": "user_agent",
    "ip_address": "ip_address",
    "created_at": "created_at"
  },
  "api_key_usage_logs": {
    "apiKeyId": "api_key_id",
    "statusCode": "status_code",
    "ip_address": "ip_address",
    "user_agent": "user_agent"
  },
  "api_keys": {
    "user_id": "user_id",
    "expires_at": "expires_at",
    "ipRestrictions": "ip_restrictions",
    "created_at": "created_at",
    "lastUsedAt": "last_used_at",
    "usageCount": "usage_count",
    "revokedBy": "revoked_by",
    "is_active": "is_active",
    "revoked_at": "revoked_at",
    "revokedReason": "revoked_reason",
    "updated_at": "updated_at"
  },
  "app_settings": {
    "settingKey": "setting_key",
    "settingValue": "setting_value",
    "settingType": "setting_type",
    "is_public": "is_public",
    "isEditable": "is_editable",
    "validationRules": "validation_rules",
    "defaultValue": "default_value",
    "lastModifiedBy": "last_modified_by",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "articles": {
    "authorId": "author_id",
    "authorName": "author_name",
    "categoryId": "category_id",
    "categoryName": "category_name",
    "featuredImage": "featured_image",
    "view_count": "view_count",
    "likeCount": "like_count",
    "commentCount": "comment_count",
    "publishedAt": "published_at",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "audit_logs": {
    "user_id": "user_id",
    "resourceType": "resource_type",
    "resourceId": "resource_id",
    "oldValues": "old_values",
    "newValues": "new_values",
    "ip_address": "ip_address",
    "user_agent": "user_agent",
    "session_id": "session_id",
    "errorMessage": "error_message",
    "created_at": "created_at"
  },
  "backups": {
    "backupType": "backup_type",
    "fileName": "file_name",
    "filePath": "file_path",
    "fileSize": "file_size",
    "compressionType": "compression_type",
    "start_time": "start_time",
    "end_time": "end_time",
    "errorMessage": "error_message",
    "retentionPolicy": "retention_policy",
    "createdBy": "created_by",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "cache": {
    "expires_at": "expires_at",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "categories": {
    "parent_id": "parent_id",
    "is_active": "is_active",
    "display_order": "display_order",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "collections": {
    "owner_id": "owner_id",
    "is_public": "is_public",
    "is_official": "is_official",
    "deck_ids": "deck_ids",
    "total_decks": "total_decks",
    "total_cards": "total_cards",
    "image_url": "image_url",
    "thumbnail_url": "thumbnail_url",
    "view_count": "view_count",
    "download_count": "download_count",
    "rating_count": "rating_count",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "deck_count": "deck_count",
    "card_count": "card_count",
    "user_id": "user_id"
  },
  "comments": {
    "user_id": "user_id",
    "contentId": "content_id",
    "contentType": "content_type",
    "parent_id": "parent_id",
    "isApproved": "is_approved",
    "isDeleted": "is_deleted",
    "likeCount": "like_count",
    "replyCount": "reply_count",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "content_reports": {
    "reporterId": "reporter_id",
    "contentId": "content_id",
    "contentType": "content_type",
    "reportType": "report_type",
    "reviewed_by": "reviewed_by",
    "reviewed_at": "reviewed_at",
    "actionTaken": "action_taken",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "decks": {
    "card_ids": "card_ids",
    "user_id": "user_id",
    "is_public": "is_public",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "total_cards": "total_cards",
    "fsrs_enabled": "fsrs_enabled",
    "hierarchy_path": "hierarchy_path",
    "image_url": "image_url",
    "flashcard_count": "flashcard_count"
  },
  "device_tokens": {
    "user_id": "user_id",
    "deviceType": "device_type",
    "deviceId": "device_id",
    "appVersion": "app_version",
    "osVersion": "os_version",
    "is_active": "is_active",
    "lastUsed": "last_used",
    "registeredAt": "registered_at",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "error_logs": {
    "user_id": "user_id",
    "errorType": "error_type",
    "errorCode": "error_code",
    "errorMessage": "error_message",
    "stackTrace": "stack_trace",
    "user_agent": "user_agent",
    "ip_address": "ip_address",
    "statusCode": "status_code",
    "resolvedBy": "resolved_by",
    "resolvedAt": "resolved_at",
    "created_at": "created_at"
  },
  "feedbacks": {
    "user_id": "user_id",
    "assignedTo": "assigned_to",
    "responseAt": "response_at",
    "device_info": "device_info",
    "appVersion": "app_version",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "filters": {
    "created_at": "created_at",
    "filterType": "filter_type",
    "isGlobal": "is_global",
    "updated_at": "updated_at",
    "is_active": "is_active"
  },
  "flashcard_review_history": {},
  "flashcard_search_index": {
    "user_id": "user_id",
    "deck_id": "deck_id",
    "deck_name": "deck_name",
    "deck_description": "deck_description",
    "collection_name": "collection_name",
    "flashcard_count": "flashcard_count",
    "hierarchy_path": "hierarchy_path",
    "searchable_text": "searchable_text",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "flashcards": {
    "deck_id": "deck_id",
    "front_content": "front_content",
    "back_content": "back_content",
    "last_review": "last_review",
    "next_review": "next_review",
    "review_count": "review_count",
    "lapse_count": "lapse_count",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "anki_data": "anki_data",
    "srs_interval": "srs_interval",
    "srs_repetitions": "srs_repetitions",
    "srs_ease_factor": "srs_ease_factor",
    "srs_lapses": "srs_lapses",
    "last_reviewed_at": "last_reviewed_at",
    "next_review_at": "next_review_at"
  },
  "invitations": {
    "inviterId": "inviter_id",
    "inviteeEmail": "invitee_email",
    "inviteeId": "invitee_id",
    "invitationType": "invitation_type",
    "inviteCode": "invite_code",
    "expires_at": "expires_at",
    "acceptedAt": "accepted_at",
    "declinedAt": "declined_at",
    "sentAt": "sent_at",
    "remindersSent": "reminders_sent",
    "lastReminderAt": "last_reminder_at",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "leaderboards": {
    "user_id": "user_id",
    "leaderboardType": "leaderboard_type",
    "previousRank": "previous_rank",
    "is_active": "is_active",
    "lastUpdated": "last_updated",
    "created_at": "created_at"
  },
  "likes": {
    "user_id": "user_id",
    "contentId": "content_id",
    "contentType": "content_type",
    "likeType": "like_type",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "media": {
    "fileName": "file_name",
    "originalName": "original_name",
    "mimeType": "mime_type",
    "fileSize": "file_size",
    "thumbnail_url": "thumbnail_url",
    "storageProvider": "storage_provider",
    "storagePath": "storage_path",
    "uploadedBy": "uploaded_by",
    "is_public": "is_public",
    "processedAt": "processed_at",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "media_files": {
    "mimeType": "mime_type",
    "user_id": "user_id",
    "originalFilename": "original_filename",
    "is_public": "is_public",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "mentorships": {
    "mentorId": "mentor_id",
    "studentId": "student_id",
    "meetingFrequency": "meeting_frequency",
    "customFrequencyDays": "custom_frequency_days",
    "totalMeetings": "total_meetings",
    "completedMeetings": "completed_meetings",
    "created_at": "created_at",
    "nextMeetingDate": "next_meeting_date",
    "start_date": "start_date",
    "updated_at": "updated_at"
  },
  "notifications": {
    "user_id": "user_id",
    "relatedId": "related_id",
    "relatedType": "related_type",
    "isRead": "is_read",
    "readAt": "read_at",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "payments": {
    "user_id": "user_id",
    "subscriptionId": "subscription_id",
    "payment_method": "payment_method",
    "paymentProvider": "payment_provider",
    "transactionId": "transaction_id",
    "paymentDate": "payment_date",
    "dueDate": "due_date",
    "paidAt": "paid_at",
    "failedAt": "failed_at",
    "failureReason": "failure_reason",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "performance_metrics": {
    "operationType": "operation_type",
    "user_id": "user_id",
    "executionTimeMs": "execution_time_ms",
    "documentsRead": "documents_read",
    "queryFilters": "query_filters"
  },
  "planner_tasks": {
    "user_id": "user_id",
    "scheduledDate": "scheduled_date",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "manualType": "manual_type",
    "targetUrl": "target_url"
  },
  "plans": {
    "intervalCount": "interval_count",
    "trialDays": "trial_days",
    "is_active": "is_active",
    "is_public": "is_public",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "durationDays": "duration_days",
    "display_order": "display_order",
    "isPopular": "is_popular",
    "stripePriceId": "stripe_price_id",
    "stripeProductId": "stripe_product_id",
    "maxQuestions": "max_questions",
    "maxFlashcards": "max_flashcards",
    "maxSimulatedExams": "max_simulated_exams",
    "hasMentorship": "has_mentorship",
    "hasAdvancedAnalytics": "has_advanced_analytics",
    "hasErrorNotebook": "has_error_notebook"
  },
  "programmed_reviews": {
    "user_id": "user_id",
    "contentId": "content_id",
    "contentType": "content_type",
    "deck_id": "deck_id",
    "originalAnswerCorrect": "original_answer_correct",
    "last_reviewed_at": "last_reviewed_at",
    "next_review_at": "next_review_at",
    "interval_days": "interval_days",
    "ease_factor": "ease_factor",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "question_list_folders": {
    "user_id": "user_id",
    "created_at": "created_at",
    "list_count": "list_count",
    "updated_at": "updated_at"
  },
  "question_list_items": {
    "question_list_id": "question_list_id",
    "question_id": "question_id",
    "personalNotes": "personal_notes",
    "isCompleted": "is_completed",
    "addedAt": "added_at",
    "lastAttemptedAt": "last_attempted_at",
    "correctAttempts": "correct_attempts",
    "incorrectAttempts": "incorrect_attempts",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "question_lists": {
    "user_id": "user_id",
    "is_public": "is_public",
    "view_count": "view_count",
    "favoriteCount": "favorite_count",
    "lastStudyDate": "last_study_date",
    "completionPercentage": "completion_percentage",
    "created_at": "created_at",
    "questionCount": "question_count",
    "lastAddedAt": "last_added_at",
    "updated_at": "updated_at",
    "folderId": "folder_id"
  },
  "question_responses": {
    "user_id": "user_id",
    "question_id": "question_id",
    "question_list_id": "question_list_id",
    "selected_alternative_id": "selected_alternative_id",
    "is_correct_on_first_attempt": "is_correct_on_first_attempt",
    "response_time_seconds": "response_time_seconds",
    "review_quality": "review_quality",
    "ease_factor": "ease_factor",
    "failStreak": "fail_streak",
    "isLearning": "is_learning",
    "isLeech": "is_leech",
    "last_review_quality": "last_review_quality",
    "last_reviewed_at": "last_reviewed_at",
    "next_review_date": "next_review_date",
    "answered_at": "answered_at",
    "created_at": "created_at",
    "programmed_review_id": "programmed_review_id",
    "updated_at": "updated_at",
    "selectedOptionId": "selected_option_id"
  },
  "questions": {
    "deck_id": "deck_id",
    "user_id": "user_id",
    "questionType": "question_type",
    "correctAnswer": "correct_answer",
    "is_public": "is_public",
    "view_count": "view_count",
    "likeCount": "like_count",
    "answerCount": "answer_count",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "rate_limit_violations": {
    "ip_address": "ip_address",
    "user_id": "user_id",
    "apiKeyId": "api_key_id"
  },
  "rate_limits": {
    "resetAt": "reset_at",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "reviews": {
    "user_id": "user_id",
    "flashcardId": "flashcard_id",
    "deck_id": "deck_id",
    "response_time": "response_time",
    "review_type": "review_type",
    "previous_interval": "previous_interval",
    "new_interval": "new_interval",
    "ease_factor": "ease_factor",
    "review_date": "review_date",
    "next_review_date": "next_review_date",
    "algorithm_data": "algorithm_data",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "scheduled_tasks": {
    "is_active": "is_active",
    "createdBy": "created_by",
    "nextRunAt": "next_run_at",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "lastRunAt": "last_run_at"
  },
  "sessions": {
    "user_id": "user_id",
    "sessionToken": "session_token",
    "refreshToken": "refresh_token",
    "deviceId": "device_id",
    "deviceType": "device_type",
    "user_agent": "user_agent",
    "ip_address": "ip_address",
    "is_active": "is_active",
    "lastActivity": "last_activity",
    "expires_at": "expires_at",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "simulated_exam_results": {
    "user_id": "user_id",
    "simulatedExamId": "simulated_exam_id",
    "userName": "user_name",
    "simulatedExamTitle": "simulated_exam_title",
    "startedAt": "started_at",
    "timeTakenSeconds": "time_taken_seconds",
    "totalQuestions": "total_questions",
    "correctCount": "correct_count",
    "incorrectCount": "incorrect_count",
    "created_at": "created_at",
    "completedAt": "completed_at",
    "updated_at": "updated_at",
    "start_time": "start_time",
    "totalTimeSpentSeconds": "total_time_spent_seconds",
    "answeredQuestions": "answered_questions",
    "correct_answers": "correct_answers",
    "incorrect_answers": "incorrect_answers",
    "skippedAnswers": "skipped_answers",
    "end_time": "end_time"
  },
  "simulated_exams": {
    "questionIds": "question_ids",
    "totalQuestions": "total_questions",
    "totalPoints": "total_points",
    "filterIds": "filter_ids",
    "subFilterIds": "sub_filter_ids",
    "is_public": "is_public",
    "createdBy": "created_by",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "user_id": "user_id",
    "creatorName": "creator_name",
    "questionCount": "question_count",
    "timeLimitMinutes": "time_limit_minutes",
    "totalAttempts": "total_attempts",
    "averageScore": "average_score",
    "lastPublishedAt": "last_published_at"
  },
  "study_sessions": {
    "user_id": "user_id",
    "deck_id": "deck_id",
    "session_type": "session_type",
    "start_time": "start_time",
    "end_time": "end_time",
    "cards_studied": "cards_studied",
    "correct_answers": "correct_answers",
    "incorrect_answers": "incorrect_answers",
    "average_response_time": "average_response_time",
    "session_data": "session_data",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "sub_filters": {
    "created_at": "created_at",
    "is_active": "is_active",
    "filter_id": "filter_id",
    "updated_at": "updated_at",
    "parent_id": "parent_id"
  },
  "subscriptions": {
    "user_id": "user_id",
    "plan_id": "plan_id",
    "planName": "plan_name",
    "currentPeriodStart": "current_period_start",
    "currentPeriodEnd": "current_period_end",
    "trialStart": "trial_start",
    "trialEnd": "trial_end",
    "canceledAt": "canceled_at",
    "cancelAtPeriodEnd": "cancel_at_period_end",
    "subscriptionProvider": "subscription_provider",
    "providerSubscriptionId": "provider_subscription_id",
    "providerCustomerId": "provider_customer_id",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "tags": {
    "isSystem": "is_system",
    "is_active": "is_active",
    "usageCount": "usage_count",
    "parent_id": "parent_id",
    "createdBy": "created_by",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "task_execution_logs": {
    "taskId": "task_id",
    "taskName": "task_name",
    "startedAt": "started_at",
    "completedAt": "completed_at"
  },
  "templates": {
    "is_public": "is_public",
    "is_official": "is_official",
    "createdBy": "created_by",
    "usageCount": "usage_count",
    "rating_count": "rating_count",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "test": {},
  "user_answers": {
    "user_id": "user_id",
    "question_id": "question_id",
    "flashcardId": "flashcard_id",
    "deck_id": "deck_id",
    "is_correct": "is_correct",
    "response_time": "response_time",
    "attemptNumber": "attempt_number",
    "session_id": "session_id",
    "answered_at": "answered_at",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "user_plans": {
    "user_id": "user_id",
    "plan_id": "plan_id",
    "startedAt": "started_at",
    "endsAt": "ends_at",
    "paymentId": "payment_id",
    "payment_method": "payment_method",
    "autoRenew": "auto_renew",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "cancellationReason": "cancellation_reason",
    "cancelled_at": "cancelled_at",
    "start_date": "start_date",
    "endDate": "end_date",
    "lastPaymentId": "last_payment_id",
    "nextBillingDate": "next_billing_date",
    "trialEndsAt": "trial_ends_at",
    "cancelReason": "cancel_reason",
    "lastNotificationDate": "last_notification_date"
  },
  "user_profiles": {
    "user_id": "user_id",
    "firstName": "first_name",
    "lastName": "last_name",
    "dateOfBirth": "date_of_birth",
    "phoneNumber": "phone_number",
    "experienceLevel": "experience_level",
    "socialLinks": "social_links",
    "profileVisibility": "profile_visibility",
    "emailNotifications": "email_notifications",
    "pushNotifications": "push_notifications",
    "studyReminders": "study_reminders",
    "weeklyReports": "weekly_reports",
    "created_at": "created_at",
    "updated_at": "updated_at"
  },
  "user_statistics": {
    "user_id": "user_id",
    "totalQuestionsAnswered": "total_questions_answered",
    "correct_answers": "correct_answers",
    "overallAccuracy": "overall_accuracy",
    "studyTimeAnalysis": "study_time_analysis",
    "learningMetrics": "learning_metrics",
    "streakData": "streak_data",
    "examMetrics": "exam_metrics",
    "filterStatistics": "filter_statistics",
    "peerComparison": "peer_comparison",
    "currentSession": "current_session",
    "lastCalculated": "last_calculated",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "incorrect_answers": "incorrect_answers",
    "totalTime": "total_time",
    "averageTime": "average_time",
    "accuracyPerFilter": "accuracy_per_filter",
    "studyTimePerDay": "study_time_per_day",
    "strongestFilters": "strongest_filters",
    "weakestFilters": "weakest_filters",
    "improvementAreas": "improvement_areas",
    "simulatedExamsTaken": "simulated_exams_taken",
    "lastActivityDate": "last_activity_date",
    "streakDays": "streak_days",
    "totalQuestions": "total_questions",
    "questionsPerDay": "questions_per_day",
    "accuracyPerDay": "accuracy_per_day",
    "lastStudyDate": "last_study_date",
    "lastActivityAt": "last_activity_at",
    "accuracyPerDifficulty": "accuracy_per_difficulty"
  },
  "user_flashcard_interactions": {},
  "user_topic_performances": {
    "user_id": "user_id",
    "subFilterId": "sub_filter_id",
    "created_at": "created_at",
    "totalTimeSpentSeconds": "total_time_spent_seconds",
    "lastAnsweredAt": "last_answered_at",
    "totalQuestionsAnswered": "total_questions_answered",
    "correct_answers": "correct_answers",
    "updated_at": "updated_at"
  },
  "users": {
    "display_name": "display_name",
    "photo_u_r_l": "photo_u_r_l",
    "username_slug": "username_slug",
    "created_at": "created_at",
    "last_login": "last_login",
    "mastered_flashcards": "mastered_flashcards",
    "total_decks": "total_decks",
    "total_flashcards": "total_flashcards",
    "active_flashcards": "active_flashcards",
    "updated_at": "updated_at"
  }
} as const;

// Tipo para nomes de tabelas antigos
export type OldTableNames = keyof typeof TABLE_MAPPINGS;

// Tipo para nomes de tabelas novos
export type NewTableNames = typeof TABLE_MAPPINGS[OldTableNames];

// Função helper para converter nomes de tabelas
export function getNewTableName(oldName: string): string {
  return TABLE_MAPPINGS[oldName as OldTableNames] || oldName;
}

// Função helper para converter nomes de colunas
export function getNewColumnName(tableName: string, oldColumnName: string): string {
  const tableColumns = COLUMN_MAPPINGS[tableName as keyof typeof COLUMN_MAPPINGS];
  if (tableColumns && tableColumns[oldColumnName as keyof typeof tableColumns]) {
    return tableColumns[oldColumnName as keyof typeof tableColumns];
  }
  return oldColumnName;
}

// Lista de todas as tabelas que foram renomeadas
export const RENAMED_TABLES = Object.keys(TABLE_MAPPINGS);

// Lista de todas as tabelas com colunas renomeadas
export const TABLES_WITH_RENAMED_COLUMNS = Object.keys(COLUMN_MAPPINGS).filter(
  tableName => Object.keys(COLUMN_MAPPINGS[tableName as keyof typeof COLUMN_MAPPINGS]).length > 0
);
