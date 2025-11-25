# Migração camelCase para snake_case

## Resumo

- **Total de tabelas analisadas:** - **Tabelas renomeadas:** - **Tabelas com colunas renomeadas:** - **Total de colunas renomeadas:** 
## Tabelas Renomeadas

- `apiKeyUsageLogs` → `api_key_usage_logs`
- `apiKeys` → `api_keys`
- `appSettings` → `app_settings`
- `auditLogs` → `audit_logs`
- `contentReports` → `content_reports`
- `deviceTokens` → `device_tokens`
- `errorLogs` → `error_logs`
- `mediaFiles` → `media_files`
- `plannerTasks` → `planner_tasks`
- `programmedReviews` → `programmed_reviews`
- `questionListFolders` → `question_list_folders`
- `questionListItems` → `question_list_items`
- `questionLists` → `question_lists`
- `questionResponses` → `question_responses`
- `rateLimitViolations` → `rate_limit_violations`
- `rateLimits` → `rate_limits`
- `scheduledTasks` → `scheduled_tasks`
- `simulatedExamResults` → `simulated_exam_results`
- `simulatedExams` → `simulated_exams`
- `studySessions` → `study_sessions`
- `subFilters` → `sub_filters`
- `taskExecutionLogs` → `task_execution_logs`
- `userAnswers` → `user_answers`
- `userPlans` → `user_plans`
- `userProfiles` → `user_profiles`
- `userStatistics` → `user_statistics`

## Colunas Renomeadas por Tabela

### Tabela: `achievements`

  - `userId` → `user_id`
  - `achievementType` → `achievement_type`
  - `iconUrl` → `icon_url`
  - `badgeLevel` → `badge_level`
  - `pointsAwarded` → `points_awarded`
  - `unlockedAt` → `unlocked_at`
  - `isVisible` → `is_visible`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `analytics`

  - `userId` → `user_id`
  - `eventType` → `event_type`
  - `eventName` → `event_name`
  - `eventData` → `event_data`
  - `sessionId` → `session_id`
  - `deviceInfo` → `device_info`
  - `userAgent` → `user_agent`
  - `ipAddress` → `ip_address`
  - `createdAt` → `created_at`

### Tabela: `api_key_usage_logs`

  - `apiKeyId` → `api_key_id`
  - `statusCode` → `status_code`
  - `ipAddress` → `ip_address`
  - `userAgent` → `user_agent`

### Tabela: `api_keys`

  - `userId` → `user_id`
  - `expiresAt` → `expires_at`
  - `ipRestrictions` → `ip_restrictions`
  - `createdAt` → `created_at`
  - `lastUsedAt` → `last_used_at`
  - `usageCount` → `usage_count`
  - `revokedBy` → `revoked_by`
  - `isActive` → `is_active`
  - `revokedAt` → `revoked_at`
  - `revokedReason` → `revoked_reason`
  - `updatedAt` → `updated_at`

### Tabela: `app_settings`

  - `settingKey` → `setting_key`
  - `settingValue` → `setting_value`
  - `settingType` → `setting_type`
  - `isPublic` → `is_public`
  - `isEditable` → `is_editable`
  - `validationRules` → `validation_rules`
  - `defaultValue` → `default_value`
  - `lastModifiedBy` → `last_modified_by`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `articles`

  - `authorId` → `author_id`
  - `authorName` → `author_name`
  - `categoryId` → `category_id`
  - `categoryName` → `category_name`
  - `featuredImage` → `featured_image`
  - `viewCount` → `view_count`
  - `likeCount` → `like_count`
  - `commentCount` → `comment_count`
  - `publishedAt` → `published_at`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `audit_logs`

  - `userId` → `user_id`
  - `resourceType` → `resource_type`
  - `resourceId` → `resource_id`
  - `oldValues` → `old_values`
  - `newValues` → `new_values`
  - `ipAddress` → `ip_address`
  - `userAgent` → `user_agent`
  - `sessionId` → `session_id`
  - `errorMessage` → `error_message`
  - `createdAt` → `created_at`

### Tabela: `backups`

  - `backupType` → `backup_type`
  - `fileName` → `file_name`
  - `filePath` → `file_path`
  - `fileSize` → `file_size`
  - `compressionType` → `compression_type`
  - `startTime` → `start_time`
  - `endTime` → `end_time`
  - `errorMessage` → `error_message`
  - `retentionPolicy` → `retention_policy`
  - `createdBy` → `created_by`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `cache`

  - `expiresAt` → `expires_at`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `categories`

  - `parentId` → `parent_id`
  - `isActive` → `is_active`
  - `displayOrder` → `display_order`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `collections`

  - `ownerId` → `owner_id`
  - `isPublic` → `is_public`
  - `isOfficial` → `is_official`
  - `deckIds` → `deck_ids`
  - `totalDecks` → `total_decks`
  - `totalCards` → `total_cards`
  - `imageUrl` → `image_url`
  - `thumbnailUrl` → `thumbnail_url`
  - `viewCount` → `view_count`
  - `downloadCount` → `download_count`
  - `ratingCount` → `rating_count`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`
  - `deckCount` → `deck_count`
  - `cardCount` → `card_count`
  - `userId` → `user_id`

### Tabela: `comments`

  - `userId` → `user_id`
  - `contentId` → `content_id`
  - `contentType` → `content_type`
  - `parentId` → `parent_id`
  - `isApproved` → `is_approved`
  - `isDeleted` → `is_deleted`
  - `likeCount` → `like_count`
  - `replyCount` → `reply_count`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `content_reports`

  - `reporterId` → `reporter_id`
  - `contentId` → `content_id`
  - `contentType` → `content_type`
  - `reportType` → `report_type`
  - `reviewedBy` → `reviewed_by`
  - `reviewedAt` → `reviewed_at`
  - `actionTaken` → `action_taken`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `decks`

  - `cardIds` → `card_ids`
  - `userId` → `user_id`
  - `isPublic` → `is_public`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`
  - `totalCards` → `total_cards`
  - `fsrsEnabled` → `fsrs_enabled`
  - `hierarchyPath` → `hierarchy_path`
  - `imageUrl` → `image_url`
  - `flashcardCount` → `flashcard_count`

### Tabela: `device_tokens`

  - `userId` → `user_id`
  - `deviceType` → `device_type`
  - `deviceId` → `device_id`
  - `appVersion` → `app_version`
  - `osVersion` → `os_version`
  - `isActive` → `is_active`
  - `lastUsed` → `last_used`
  - `registeredAt` → `registered_at`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `error_logs`

  - `userId` → `user_id`
  - `errorType` → `error_type`
  - `errorCode` → `error_code`
  - `errorMessage` → `error_message`
  - `stackTrace` → `stack_trace`
  - `userAgent` → `user_agent`
  - `ipAddress` → `ip_address`
  - `statusCode` → `status_code`
  - `resolvedBy` → `resolved_by`
  - `resolvedAt` → `resolved_at`
  - `createdAt` → `created_at`

### Tabela: `feedbacks`

  - `userId` → `user_id`
  - `assignedTo` → `assigned_to`
  - `responseAt` → `response_at`
  - `deviceInfo` → `device_info`
  - `appVersion` → `app_version`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `filters`

  - `createdAt` → `created_at`
  - `filterType` → `filter_type`
  - `isGlobal` → `is_global`
  - `updatedAt` → `updated_at`
  - `isActive` → `is_active`

### Tabela: `flashcard_search_index`

  - `userId` → `user_id`
  - `deckId` → `deck_id`
  - `deckName` → `deck_name`
  - `deckDescription` → `deck_description`
  - `collectionName` → `collection_name`
  - `flashcardCount` → `flashcard_count`
  - `hierarchyPath` → `hierarchy_path`
  - `searchableText` → `searchable_text`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `flashcards`

  - `deckId` → `deck_id`
  - `frontContent` → `front_content`
  - `backContent` → `back_content`
  - `lastReview` → `last_review`
  - `nextReview` → `next_review`
  - `reviewCount` → `review_count`
  - `lapseCount` → `lapse_count`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`
  - `ankiData` → `anki_data`
  - `srsInterval` → `srs_interval`
  - `srsRepetitions` → `srs_repetitions`
  - `srsEaseFactor` → `srs_ease_factor`
  - `srsLapses` → `srs_lapses`
  - `lastReviewedAt` → `last_reviewed_at`
  - `nextReviewAt` → `next_review_at`

### Tabela: `invitations`

  - `inviterId` → `inviter_id`
  - `inviteeEmail` → `invitee_email`
  - `inviteeId` → `invitee_id`
  - `invitationType` → `invitation_type`
  - `inviteCode` → `invite_code`
  - `expiresAt` → `expires_at`
  - `acceptedAt` → `accepted_at`
  - `declinedAt` → `declined_at`
  - `sentAt` → `sent_at`
  - `remindersSent` → `reminders_sent`
  - `lastReminderAt` → `last_reminder_at`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `leaderboards`

  - `userId` → `user_id`
  - `leaderboardType` → `leaderboard_type`
  - `previousRank` → `previous_rank`
  - `isActive` → `is_active`
  - `lastUpdated` → `last_updated`
  - `createdAt` → `created_at`

### Tabela: `likes`

  - `userId` → `user_id`
  - `contentId` → `content_id`
  - `contentType` → `content_type`
  - `likeType` → `like_type`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `media`

  - `fileName` → `file_name`
  - `originalName` → `original_name`
  - `mimeType` → `mime_type`
  - `fileSize` → `file_size`
  - `thumbnailUrl` → `thumbnail_url`
  - `storageProvider` → `storage_provider`
  - `storagePath` → `storage_path`
  - `uploadedBy` → `uploaded_by`
  - `isPublic` → `is_public`
  - `processedAt` → `processed_at`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `media_files`

  - `mimeType` → `mime_type`
  - `userId` → `user_id`
  - `originalFilename` → `original_filename`
  - `isPublic` → `is_public`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `mentorships`

  - `mentorId` → `mentor_id`
  - `studentId` → `student_id`
  - `meetingFrequency` → `meeting_frequency`
  - `customFrequencyDays` → `custom_frequency_days`
  - `totalMeetings` → `total_meetings`
  - `completedMeetings` → `completed_meetings`
  - `createdAt` → `created_at`
  - `nextMeetingDate` → `next_meeting_date`
  - `startDate` → `start_date`
  - `updatedAt` → `updated_at`

### Tabela: `notifications`

  - `userId` → `user_id`
  - `relatedId` → `related_id`
  - `relatedType` → `related_type`
  - `isRead` → `is_read`
  - `readAt` → `read_at`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `payments`

  - `userId` → `user_id`
  - `subscriptionId` → `subscription_id`
  - `paymentMethod` → `payment_method`
  - `paymentProvider` → `payment_provider`
  - `transactionId` → `transaction_id`
  - `paymentDate` → `payment_date`
  - `dueDate` → `due_date`
  - `paidAt` → `paid_at`
  - `failedAt` → `failed_at`
  - `failureReason` → `failure_reason`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `performance_metrics`

  - `operationType` → `operation_type`
  - `userId` → `user_id`
  - `executionTimeMs` → `execution_time_ms`
  - `documentsRead` → `documents_read`
  - `queryFilters` → `query_filters`

### Tabela: `planner_tasks`

  - `userId` → `user_id`
  - `scheduledDate` → `scheduled_date`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`
  - `manualType` → `manual_type`
  - `targetUrl` → `target_url`

### Tabela: `plans`

  - `intervalCount` → `interval_count`
  - `trialDays` → `trial_days`
  - `isActive` → `is_active`
  - `isPublic` → `is_public`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`
  - `durationDays` → `duration_days`
  - `displayOrder` → `display_order`
  - `isPopular` → `is_popular`
  - `stripePriceId` → `stripe_price_id`
  - `stripeProductId` → `stripe_product_id`
  - `maxQuestions` → `max_questions`
  - `maxFlashcards` → `max_flashcards`
  - `maxSimulatedExams` → `max_simulated_exams`
  - `hasMentorship` → `has_mentorship`
  - `hasAdvancedAnalytics` → `has_advanced_analytics`
  - `hasErrorNotebook` → `has_error_notebook`

### Tabela: `programmed_reviews`

  - `userId` → `user_id`
  - `contentId` → `content_id`
  - `contentType` → `content_type`
  - `deckId` → `deck_id`
  - `originalAnswerCorrect` → `original_answer_correct`
  - `lastReviewedAt` → `last_reviewed_at`
  - `nextReviewAt` → `next_review_at`
  - `intervalDays` → `interval_days`
  - `easeFactor` → `ease_factor`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `question_list_folders`

  - `userId` → `user_id`
  - `createdAt` → `created_at`
  - `listCount` → `list_count`
  - `updatedAt` → `updated_at`

### Tabela: `question_list_items`

  - `questionListId` → `question_list_id`
  - `questionId` → `question_id`
  - `personalNotes` → `personal_notes`
  - `isCompleted` → `is_completed`
  - `addedAt` → `added_at`
  - `lastAttemptedAt` → `last_attempted_at`
  - `correctAttempts` → `correct_attempts`
  - `incorrectAttempts` → `incorrect_attempts`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `question_lists`

  - `userId` → `user_id`
  - `isPublic` → `is_public`
  - `viewCount` → `view_count`
  - `favoriteCount` → `favorite_count`
  - `lastStudyDate` → `last_study_date`
  - `completionPercentage` → `completion_percentage`
  - `createdAt` → `created_at`
  - `questionCount` → `question_count`
  - `lastAddedAt` → `last_added_at`
  - `updatedAt` → `updated_at`
  - `folderId` → `folder_id`

### Tabela: `question_responses`

  - `userId` → `user_id`
  - `questionId` → `question_id`
  - `questionListId` → `question_list_id`
  - `selectedAlternativeId` → `selected_alternative_id`
  - `isCorrectOnFirstAttempt` → `is_correct_on_first_attempt`
  - `responseTimeSeconds` → `response_time_seconds`
  - `reviewQuality` → `review_quality`
  - `easeFactor` → `ease_factor`
  - `failStreak` → `fail_streak`
  - `isLearning` → `is_learning`
  - `isLeech` → `is_leech`
  - `lastReviewQuality` → `last_review_quality`
  - `lastReviewedAt` → `last_reviewed_at`
  - `nextReviewDate` → `next_review_date`
  - `answeredAt` → `answered_at`
  - `createdAt` → `created_at`
  - `programmedReviewId` → `programmed_review_id`
  - `updatedAt` → `updated_at`
  - `selectedOptionId` → `selected_option_id`

### Tabela: `questions`

  - `deckId` → `deck_id`
  - `userId` → `user_id`
  - `questionType` → `question_type`
  - `correctAnswer` → `correct_answer`
  - `isPublic` → `is_public`
  - `viewCount` → `view_count`
  - `likeCount` → `like_count`
  - `answerCount` → `answer_count`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `rate_limit_violations`

  - `ipAddress` → `ip_address`
  - `userId` → `user_id`
  - `apiKeyId` → `api_key_id`

### Tabela: `rate_limits`

  - `resetAt` → `reset_at`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `reviews`

  - `userId` → `user_id`
  - `flashcardId` → `flashcard_id`
  - `deckId` → `deck_id`
  - `responseTime` → `response_time`
  - `reviewType` → `review_type`
  - `previousInterval` → `previous_interval`
  - `newInterval` → `new_interval`
  - `easeFactor` → `ease_factor`
  - `reviewDate` → `review_date`
  - `nextReviewDate` → `next_review_date`
  - `algorithmData` → `algorithm_data`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `scheduled_tasks`

  - `isActive` → `is_active`
  - `createdBy` → `created_by`
  - `nextRunAt` → `next_run_at`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`
  - `lastRunAt` → `last_run_at`

### Tabela: `sessions`

  - `userId` → `user_id`
  - `sessionToken` → `session_token`
  - `refreshToken` → `refresh_token`
  - `deviceId` → `device_id`
  - `deviceType` → `device_type`
  - `userAgent` → `user_agent`
  - `ipAddress` → `ip_address`
  - `isActive` → `is_active`
  - `lastActivity` → `last_activity`
  - `expiresAt` → `expires_at`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `simulated_exam_results`

  - `userId` → `user_id`
  - `simulatedExamId` → `simulated_exam_id`
  - `userName` → `user_name`
  - `simulatedExamTitle` → `simulated_exam_title`
  - `startedAt` → `started_at`
  - `timeTakenSeconds` → `time_taken_seconds`
  - `totalQuestions` → `total_questions`
  - `correctCount` → `correct_count`
  - `incorrectCount` → `incorrect_count`
  - `createdAt` → `created_at`
  - `completedAt` → `completed_at`
  - `updatedAt` → `updated_at`
  - `startTime` → `start_time`
  - `totalTimeSpentSeconds` → `total_time_spent_seconds`
  - `answeredQuestions` → `answered_questions`
  - `correctAnswers` → `correct_answers`
  - `incorrectAnswers` → `incorrect_answers`
  - `skippedAnswers` → `skipped_answers`
  - `endTime` → `end_time`

### Tabela: `simulated_exams`

  - `questionIds` → `question_ids`
  - `totalQuestions` → `total_questions`
  - `totalPoints` → `total_points`
  - `filterIds` → `filter_ids`
  - `subFilterIds` → `sub_filter_ids`
  - `isPublic` → `is_public`
  - `createdBy` → `created_by`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`
  - `userId` → `user_id`
  - `creatorName` → `creator_name`
  - `questionCount` → `question_count`
  - `timeLimitMinutes` → `time_limit_minutes`
  - `totalAttempts` → `total_attempts`
  - `averageScore` → `average_score`
  - `lastPublishedAt` → `last_published_at`

### Tabela: `study_sessions`

  - `userId` → `user_id`
  - `deckId` → `deck_id`
  - `sessionType` → `session_type`
  - `startTime` → `start_time`
  - `endTime` → `end_time`
  - `cardsStudied` → `cards_studied`
  - `correctAnswers` → `correct_answers`
  - `incorrectAnswers` → `incorrect_answers`
  - `averageResponseTime` → `average_response_time`
  - `sessionData` → `session_data`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `sub_filters`

  - `createdAt` → `created_at`
  - `isActive` → `is_active`
  - `filterId` → `filter_id`
  - `updatedAt` → `updated_at`
  - `parentId` → `parent_id`

### Tabela: `subscriptions`

  - `userId` → `user_id`
  - `planId` → `plan_id`
  - `planName` → `plan_name`
  - `currentPeriodStart` → `current_period_start`
  - `currentPeriodEnd` → `current_period_end`
  - `trialStart` → `trial_start`
  - `trialEnd` → `trial_end`
  - `canceledAt` → `canceled_at`
  - `cancelAtPeriodEnd` → `cancel_at_period_end`
  - `subscriptionProvider` → `subscription_provider`
  - `providerSubscriptionId` → `provider_subscription_id`
  - `providerCustomerId` → `provider_customer_id`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `tags`

  - `isSystem` → `is_system`
  - `isActive` → `is_active`
  - `usageCount` → `usage_count`
  - `parentId` → `parent_id`
  - `createdBy` → `created_by`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `task_execution_logs`

  - `taskId` → `task_id`
  - `taskName` → `task_name`
  - `startedAt` → `started_at`
  - `completedAt` → `completed_at`

### Tabela: `templates`

  - `isPublic` → `is_public`
  - `isOfficial` → `is_official`
  - `createdBy` → `created_by`
  - `usageCount` → `usage_count`
  - `ratingCount` → `rating_count`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `user_answers`

  - `userId` → `user_id`
  - `questionId` → `question_id`
  - `flashcardId` → `flashcard_id`
  - `deckId` → `deck_id`
  - `isCorrect` → `is_correct`
  - `responseTime` → `response_time`
  - `attemptNumber` → `attempt_number`
  - `sessionId` → `session_id`
  - `answeredAt` → `answered_at`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `user_plans`

  - `userId` → `user_id`
  - `planId` → `plan_id`
  - `startedAt` → `started_at`
  - `endsAt` → `ends_at`
  - `paymentId` → `payment_id`
  - `paymentMethod` → `payment_method`
  - `autoRenew` → `auto_renew`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`
  - `cancellationReason` → `cancellation_reason`
  - `cancelledAt` → `cancelled_at`
  - `startDate` → `start_date`
  - `endDate` → `end_date`
  - `lastPaymentId` → `last_payment_id`
  - `nextBillingDate` → `next_billing_date`
  - `trialEndsAt` → `trial_ends_at`
  - `cancelReason` → `cancel_reason`
  - `lastNotificationDate` → `last_notification_date`

### Tabela: `user_profiles`

  - `userId` → `user_id`
  - `firstName` → `first_name`
  - `lastName` → `last_name`
  - `dateOfBirth` → `date_of_birth`
  - `phoneNumber` → `phone_number`
  - `experienceLevel` → `experience_level`
  - `socialLinks` → `social_links`
  - `profileVisibility` → `profile_visibility`
  - `emailNotifications` → `email_notifications`
  - `pushNotifications` → `push_notifications`
  - `studyReminders` → `study_reminders`
  - `weeklyReports` → `weekly_reports`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`

### Tabela: `user_statistics`

  - `userId` → `user_id`
  - `totalQuestionsAnswered` → `total_questions_answered`
  - `correctAnswers` → `correct_answers`
  - `overallAccuracy` → `overall_accuracy`
  - `studyTimeAnalysis` → `study_time_analysis`
  - `learningMetrics` → `learning_metrics`
  - `streakData` → `streak_data`
  - `examMetrics` → `exam_metrics`
  - `filterStatistics` → `filter_statistics`
  - `peerComparison` → `peer_comparison`
  - `currentSession` → `current_session`
  - `lastCalculated` → `last_calculated`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`
  - `incorrectAnswers` → `incorrect_answers`
  - `totalTime` → `total_time`
  - `averageTime` → `average_time`
  - `accuracyPerFilter` → `accuracy_per_filter`
  - `studyTimePerDay` → `study_time_per_day`
  - `strongestFilters` → `strongest_filters`
  - `weakestFilters` → `weakest_filters`
  - `improvementAreas` → `improvement_areas`
  - `simulatedExamsTaken` → `simulated_exams_taken`
  - `lastActivityDate` → `last_activity_date`
  - `streakDays` → `streak_days`
  - `totalQuestions` → `total_questions`
  - `questionsPerDay` → `questions_per_day`
  - `accuracyPerDay` → `accuracy_per_day`
  - `lastStudyDate` → `last_study_date`
  - `lastActivityAt` → `last_activity_at`
  - `accuracyPerDifficulty` → `accuracy_per_difficulty`

### Tabela: `user_topic_performances`

  - `userId` → `user_id`
  - `subFilterId` → `sub_filter_id`
  - `createdAt` → `created_at`
  - `totalTimeSpentSeconds` → `total_time_spent_seconds`
  - `lastAnsweredAt` → `last_answered_at`
  - `totalQuestionsAnswered` → `total_questions_answered`
  - `correctAnswers` → `correct_answers`
  - `updatedAt` → `updated_at`

### Tabela: `users`

  - `displayName` → `display_name`
  - `photoURL` → `photo_u_r_l`
  - `usernameSlug` → `username_slug`
  - `createdAt` → `created_at`
  - `lastLogin` → `last_login`
  - `masteredFlashcards` → `mastered_flashcards`
  - `totalDecks` → `total_decks`
  - `totalFlashcards` → `total_flashcards`
  - `activeFlashcards` → `active_flashcards`
  - `updatedAt` → `updated_at`

## Arquivos Gerados

1. **migration-camel-to-snake.sql** - Script SQL para executar a migração
2. **camel-to-snake-mapping.json** - Mapeamento em formato JSON
3. **camel-to-snake-mappings.ts** - Tipos TypeScript e funções helper
4. **execute-migration.js** - Script para executar a migração de forma segura

## Como Usar

### 1. Executar a Migração no Banco

```bash
# Configure as variáveis de ambiente
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_SERVICE_KEY=your-service-key

# Execute a migração
node scripts/execute-migration.js
```

### 2. Atualizar o Código

Use os mapeamentos gerados para atualizar suas queries e modelos:

```typescript
import { getNewTableName, getNewColumnName } from './scripts/camel-to-snake-mappings';

// Exemplo de uso
const oldTableName = 'userStatistics';
const newTableName = getNewTableName(oldTableName); // 'user_statistics'

const oldColumnName = 'user_id';
const newColumnName = getNewColumnName('user_statistics', oldColumnName); // 'user_id'
```

### 3. Verificar e Testar

- Execute todos os testes
- Verifique se todas as queries foram atualizadas
- Teste a aplicação completamente
- Atualize a documentação

## ⚠️ Importante

- **Faça backup** do banco antes de executar a migração
- **Teste em ambiente de desenvolvimento** primeiro
- **Atualize todo o código** que referencia as tabelas/colunas antigas
- **Execute os testes** para garantir compatibilidade