-- Migração para converter camelCase para snake_case
-- Gerado automaticamente em 2025-08-08T02:23:46.824Z

-- ATENÇÃO: Execute este script em ordem e faça backup antes!

-- Renomear coluna userId para user_id na tabela achievements
ALTER TABLE public.achievements RENAME COLUMN userId TO user_id;
-- Renomear coluna achievementType para achievement_type na tabela achievements
ALTER TABLE public.achievements RENAME COLUMN achievementType TO achievement_type;
-- Renomear coluna iconUrl para icon_url na tabela achievements
ALTER TABLE public.achievements RENAME COLUMN iconUrl TO icon_url;
-- Renomear coluna badgeLevel para badge_level na tabela achievements
ALTER TABLE public.achievements RENAME COLUMN badgeLevel TO badge_level;
-- Renomear coluna pointsAwarded para points_awarded na tabela achievements
ALTER TABLE public.achievements RENAME COLUMN pointsAwarded TO points_awarded;
-- Renomear coluna unlockedAt para unlocked_at na tabela achievements
ALTER TABLE public.achievements RENAME COLUMN unlockedAt TO unlocked_at;
-- Renomear coluna isVisible para is_visible na tabela achievements
ALTER TABLE public.achievements RENAME COLUMN isVisible TO is_visible;
-- Renomear coluna createdAt para created_at na tabela achievements
ALTER TABLE public.achievements RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela achievements
ALTER TABLE public.achievements RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna userId para user_id na tabela analytics
ALTER TABLE public.analytics RENAME COLUMN userId TO user_id;
-- Renomear coluna eventType para event_type na tabela analytics
ALTER TABLE public.analytics RENAME COLUMN eventType TO event_type;
-- Renomear coluna eventName para event_name na tabela analytics
ALTER TABLE public.analytics RENAME COLUMN eventName TO event_name;
-- Renomear coluna eventData para event_data na tabela analytics
ALTER TABLE public.analytics RENAME COLUMN eventData TO event_data;
-- Renomear coluna sessionId para session_id na tabela analytics
ALTER TABLE public.analytics RENAME COLUMN sessionId TO session_id;
-- Renomear coluna deviceInfo para device_info na tabela analytics
ALTER TABLE public.analytics RENAME COLUMN deviceInfo TO device_info;
-- Renomear coluna userAgent para user_agent na tabela analytics
ALTER TABLE public.analytics RENAME COLUMN userAgent TO user_agent;
-- Renomear coluna ipAddress para ip_address na tabela analytics
ALTER TABLE public.analytics RENAME COLUMN ipAddress TO ip_address;
-- Renomear coluna createdAt para created_at na tabela analytics
ALTER TABLE public.analytics RENAME COLUMN createdAt TO created_at;

-- Renomear tabela apiKeyUsageLogs para api_key_usage_logs
ALTER TABLE public.apiKeyUsageLogs RENAME TO api_key_usage_logs;

-- Renomear coluna apiKeyId para api_key_id na tabela api_key_usage_logs
ALTER TABLE public.api_key_usage_logs RENAME COLUMN apiKeyId TO api_key_id;
-- Renomear coluna statusCode para status_code na tabela api_key_usage_logs
ALTER TABLE public.api_key_usage_logs RENAME COLUMN statusCode TO status_code;
-- Renomear coluna ipAddress para ip_address na tabela api_key_usage_logs
ALTER TABLE public.api_key_usage_logs RENAME COLUMN ipAddress TO ip_address;
-- Renomear coluna userAgent para user_agent na tabela api_key_usage_logs
ALTER TABLE public.api_key_usage_logs RENAME COLUMN userAgent TO user_agent;

-- Renomear tabela apiKeys para api_keys
ALTER TABLE public.apiKeys RENAME TO api_keys;

-- Renomear coluna userId para user_id na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN userId TO user_id;
-- Renomear coluna expiresAt para expires_at na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN expiresAt TO expires_at;
-- Renomear coluna ipRestrictions para ip_restrictions na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN ipRestrictions TO ip_restrictions;
-- Renomear coluna createdAt para created_at na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN createdAt TO created_at;
-- Renomear coluna lastUsedAt para last_used_at na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN lastUsedAt TO last_used_at;
-- Renomear coluna usageCount para usage_count na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN usageCount TO usage_count;
-- Renomear coluna revokedBy para revoked_by na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN revokedBy TO revoked_by;
-- Renomear coluna isActive para is_active na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN isActive TO is_active;
-- Renomear coluna revokedAt para revoked_at na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN revokedAt TO revoked_at;
-- Renomear coluna revokedReason para revoked_reason na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN revokedReason TO revoked_reason;
-- Renomear coluna updatedAt para updated_at na tabela api_keys
ALTER TABLE public.api_keys RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela appSettings para app_settings
ALTER TABLE public.appSettings RENAME TO app_settings;

-- Renomear coluna settingKey para setting_key na tabela app_settings
ALTER TABLE public.app_settings RENAME COLUMN settingKey TO setting_key;
-- Renomear coluna settingValue para setting_value na tabela app_settings
ALTER TABLE public.app_settings RENAME COLUMN settingValue TO setting_value;
-- Renomear coluna settingType para setting_type na tabela app_settings
ALTER TABLE public.app_settings RENAME COLUMN settingType TO setting_type;
-- Renomear coluna isPublic para is_public na tabela app_settings
ALTER TABLE public.app_settings RENAME COLUMN isPublic TO is_public;
-- Renomear coluna isEditable para is_editable na tabela app_settings
ALTER TABLE public.app_settings RENAME COLUMN isEditable TO is_editable;
-- Renomear coluna validationRules para validation_rules na tabela app_settings
ALTER TABLE public.app_settings RENAME COLUMN validationRules TO validation_rules;
-- Renomear coluna defaultValue para default_value na tabela app_settings
ALTER TABLE public.app_settings RENAME COLUMN defaultValue TO default_value;
-- Renomear coluna lastModifiedBy para last_modified_by na tabela app_settings
ALTER TABLE public.app_settings RENAME COLUMN lastModifiedBy TO last_modified_by;
-- Renomear coluna createdAt para created_at na tabela app_settings
ALTER TABLE public.app_settings RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela app_settings
ALTER TABLE public.app_settings RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna authorId para author_id na tabela articles
ALTER TABLE public.articles RENAME COLUMN authorId TO author_id;
-- Renomear coluna authorName para author_name na tabela articles
ALTER TABLE public.articles RENAME COLUMN authorName TO author_name;
-- Renomear coluna categoryId para category_id na tabela articles
ALTER TABLE public.articles RENAME COLUMN categoryId TO category_id;
-- Renomear coluna categoryName para category_name na tabela articles
ALTER TABLE public.articles RENAME COLUMN categoryName TO category_name;
-- Renomear coluna featuredImage para featured_image na tabela articles
ALTER TABLE public.articles RENAME COLUMN featuredImage TO featured_image;
-- Renomear coluna viewCount para view_count na tabela articles
ALTER TABLE public.articles RENAME COLUMN viewCount TO view_count;
-- Renomear coluna likeCount para like_count na tabela articles
ALTER TABLE public.articles RENAME COLUMN likeCount TO like_count;
-- Renomear coluna commentCount para comment_count na tabela articles
ALTER TABLE public.articles RENAME COLUMN commentCount TO comment_count;
-- Renomear coluna publishedAt para published_at na tabela articles
ALTER TABLE public.articles RENAME COLUMN publishedAt TO published_at;
-- Renomear coluna createdAt para created_at na tabela articles
ALTER TABLE public.articles RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela articles
ALTER TABLE public.articles RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela auditLogs para audit_logs
ALTER TABLE public.auditLogs RENAME TO audit_logs;

-- Renomear coluna userId para user_id na tabela audit_logs
ALTER TABLE public.audit_logs RENAME COLUMN userId TO user_id;
-- Renomear coluna resourceType para resource_type na tabela audit_logs
ALTER TABLE public.audit_logs RENAME COLUMN resourceType TO resource_type;
-- Renomear coluna resourceId para resource_id na tabela audit_logs
ALTER TABLE public.audit_logs RENAME COLUMN resourceId TO resource_id;
-- Renomear coluna oldValues para old_values na tabela audit_logs
ALTER TABLE public.audit_logs RENAME COLUMN oldValues TO old_values;
-- Renomear coluna newValues para new_values na tabela audit_logs
ALTER TABLE public.audit_logs RENAME COLUMN newValues TO new_values;
-- Renomear coluna ipAddress para ip_address na tabela audit_logs
ALTER TABLE public.audit_logs RENAME COLUMN ipAddress TO ip_address;
-- Renomear coluna userAgent para user_agent na tabela audit_logs
ALTER TABLE public.audit_logs RENAME COLUMN userAgent TO user_agent;
-- Renomear coluna sessionId para session_id na tabela audit_logs
ALTER TABLE public.audit_logs RENAME COLUMN sessionId TO session_id;
-- Renomear coluna errorMessage para error_message na tabela audit_logs
ALTER TABLE public.audit_logs RENAME COLUMN errorMessage TO error_message;
-- Renomear coluna createdAt para created_at na tabela audit_logs
ALTER TABLE public.audit_logs RENAME COLUMN createdAt TO created_at;

-- Renomear coluna backupType para backup_type na tabela backups
ALTER TABLE public.backups RENAME COLUMN backupType TO backup_type;
-- Renomear coluna fileName para file_name na tabela backups
ALTER TABLE public.backups RENAME COLUMN fileName TO file_name;
-- Renomear coluna filePath para file_path na tabela backups
ALTER TABLE public.backups RENAME COLUMN filePath TO file_path;
-- Renomear coluna fileSize para file_size na tabela backups
ALTER TABLE public.backups RENAME COLUMN fileSize TO file_size;
-- Renomear coluna compressionType para compression_type na tabela backups
ALTER TABLE public.backups RENAME COLUMN compressionType TO compression_type;
-- Renomear coluna startTime para start_time na tabela backups
ALTER TABLE public.backups RENAME COLUMN startTime TO start_time;
-- Renomear coluna endTime para end_time na tabela backups
ALTER TABLE public.backups RENAME COLUMN endTime TO end_time;
-- Renomear coluna errorMessage para error_message na tabela backups
ALTER TABLE public.backups RENAME COLUMN errorMessage TO error_message;
-- Renomear coluna retentionPolicy para retention_policy na tabela backups
ALTER TABLE public.backups RENAME COLUMN retentionPolicy TO retention_policy;
-- Renomear coluna createdBy para created_by na tabela backups
ALTER TABLE public.backups RENAME COLUMN createdBy TO created_by;
-- Renomear coluna createdAt para created_at na tabela backups
ALTER TABLE public.backups RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela backups
ALTER TABLE public.backups RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna expiresAt para expires_at na tabela cache
ALTER TABLE public.cache RENAME COLUMN expiresAt TO expires_at;
-- Renomear coluna createdAt para created_at na tabela cache
ALTER TABLE public.cache RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela cache
ALTER TABLE public.cache RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna parentId para parent_id na tabela categories
ALTER TABLE public.categories RENAME COLUMN parentId TO parent_id;
-- Renomear coluna isActive para is_active na tabela categories
ALTER TABLE public.categories RENAME COLUMN isActive TO is_active;
-- Renomear coluna displayOrder para display_order na tabela categories
ALTER TABLE public.categories RENAME COLUMN displayOrder TO display_order;
-- Renomear coluna createdAt para created_at na tabela categories
ALTER TABLE public.categories RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela categories
ALTER TABLE public.categories RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna ownerId para owner_id na tabela collections
ALTER TABLE public.collections RENAME COLUMN ownerId TO owner_id;
-- Renomear coluna isPublic para is_public na tabela collections
ALTER TABLE public.collections RENAME COLUMN isPublic TO is_public;
-- Renomear coluna isOfficial para is_official na tabela collections
ALTER TABLE public.collections RENAME COLUMN isOfficial TO is_official;
-- Renomear coluna deckIds para deck_ids na tabela collections
ALTER TABLE public.collections RENAME COLUMN deckIds TO deck_ids;
-- Renomear coluna totalDecks para total_decks na tabela collections
ALTER TABLE public.collections RENAME COLUMN totalDecks TO total_decks;
-- Renomear coluna totalCards para total_cards na tabela collections
ALTER TABLE public.collections RENAME COLUMN totalCards TO total_cards;
-- Renomear coluna imageUrl para image_url na tabela collections
ALTER TABLE public.collections RENAME COLUMN imageUrl TO image_url;
-- Renomear coluna thumbnailUrl para thumbnail_url na tabela collections
ALTER TABLE public.collections RENAME COLUMN thumbnailUrl TO thumbnail_url;
-- Renomear coluna viewCount para view_count na tabela collections
ALTER TABLE public.collections RENAME COLUMN viewCount TO view_count;
-- Renomear coluna downloadCount para download_count na tabela collections
ALTER TABLE public.collections RENAME COLUMN downloadCount TO download_count;
-- Renomear coluna ratingCount para rating_count na tabela collections
ALTER TABLE public.collections RENAME COLUMN ratingCount TO rating_count;
-- Renomear coluna createdAt para created_at na tabela collections
ALTER TABLE public.collections RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela collections
ALTER TABLE public.collections RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna deckCount para deck_count na tabela collections
ALTER TABLE public.collections RENAME COLUMN deckCount TO deck_count;
-- Renomear coluna cardCount para card_count na tabela collections
ALTER TABLE public.collections RENAME COLUMN cardCount TO card_count;
-- Renomear coluna userId para user_id na tabela collections
ALTER TABLE public.collections RENAME COLUMN userId TO user_id;

-- Renomear coluna userId para user_id na tabela comments
ALTER TABLE public.comments RENAME COLUMN userId TO user_id;
-- Renomear coluna contentId para content_id na tabela comments
ALTER TABLE public.comments RENAME COLUMN contentId TO content_id;
-- Renomear coluna contentType para content_type na tabela comments
ALTER TABLE public.comments RENAME COLUMN contentType TO content_type;
-- Renomear coluna parentId para parent_id na tabela comments
ALTER TABLE public.comments RENAME COLUMN parentId TO parent_id;
-- Renomear coluna isApproved para is_approved na tabela comments
ALTER TABLE public.comments RENAME COLUMN isApproved TO is_approved;
-- Renomear coluna isDeleted para is_deleted na tabela comments
ALTER TABLE public.comments RENAME COLUMN isDeleted TO is_deleted;
-- Renomear coluna likeCount para like_count na tabela comments
ALTER TABLE public.comments RENAME COLUMN likeCount TO like_count;
-- Renomear coluna replyCount para reply_count na tabela comments
ALTER TABLE public.comments RENAME COLUMN replyCount TO reply_count;
-- Renomear coluna createdAt para created_at na tabela comments
ALTER TABLE public.comments RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela comments
ALTER TABLE public.comments RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela contentReports para content_reports
ALTER TABLE public.contentReports RENAME TO content_reports;

-- Renomear coluna reporterId para reporter_id na tabela content_reports
ALTER TABLE public.content_reports RENAME COLUMN reporterId TO reporter_id;
-- Renomear coluna contentId para content_id na tabela content_reports
ALTER TABLE public.content_reports RENAME COLUMN contentId TO content_id;
-- Renomear coluna contentType para content_type na tabela content_reports
ALTER TABLE public.content_reports RENAME COLUMN contentType TO content_type;
-- Renomear coluna reportType para report_type na tabela content_reports
ALTER TABLE public.content_reports RENAME COLUMN reportType TO report_type;
-- Renomear coluna reviewedBy para reviewed_by na tabela content_reports
ALTER TABLE public.content_reports RENAME COLUMN reviewedBy TO reviewed_by;
-- Renomear coluna reviewedAt para reviewed_at na tabela content_reports
ALTER TABLE public.content_reports RENAME COLUMN reviewedAt TO reviewed_at;
-- Renomear coluna actionTaken para action_taken na tabela content_reports
ALTER TABLE public.content_reports RENAME COLUMN actionTaken TO action_taken;
-- Renomear coluna createdAt para created_at na tabela content_reports
ALTER TABLE public.content_reports RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela content_reports
ALTER TABLE public.content_reports RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna cardIds para card_ids na tabela decks
ALTER TABLE public.decks RENAME COLUMN cardIds TO card_ids;
-- Renomear coluna userId para user_id na tabela decks
ALTER TABLE public.decks RENAME COLUMN userId TO user_id;
-- Renomear coluna isPublic para is_public na tabela decks
ALTER TABLE public.decks RENAME COLUMN isPublic TO is_public;
-- Renomear coluna createdAt para created_at na tabela decks
ALTER TABLE public.decks RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela decks
ALTER TABLE public.decks RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna totalCards para total_cards na tabela decks
ALTER TABLE public.decks RENAME COLUMN totalCards TO total_cards;
-- Renomear coluna fsrsEnabled para fsrs_enabled na tabela decks
ALTER TABLE public.decks RENAME COLUMN fsrsEnabled TO fsrs_enabled;
-- Renomear coluna hierarchyPath para hierarchy_path na tabela decks
ALTER TABLE public.decks RENAME COLUMN hierarchyPath TO hierarchy_path;
-- Renomear coluna imageUrl para image_url na tabela decks
ALTER TABLE public.decks RENAME COLUMN imageUrl TO image_url;
-- Renomear coluna flashcardCount para flashcard_count na tabela decks
ALTER TABLE public.decks RENAME COLUMN flashcardCount TO flashcard_count;

-- Renomear tabela deviceTokens para device_tokens
ALTER TABLE public.deviceTokens RENAME TO device_tokens;

-- Renomear coluna userId para user_id na tabela device_tokens
ALTER TABLE public.device_tokens RENAME COLUMN userId TO user_id;
-- Renomear coluna deviceType para device_type na tabela device_tokens
ALTER TABLE public.device_tokens RENAME COLUMN deviceType TO device_type;
-- Renomear coluna deviceId para device_id na tabela device_tokens
ALTER TABLE public.device_tokens RENAME COLUMN deviceId TO device_id;
-- Renomear coluna appVersion para app_version na tabela device_tokens
ALTER TABLE public.device_tokens RENAME COLUMN appVersion TO app_version;
-- Renomear coluna osVersion para os_version na tabela device_tokens
ALTER TABLE public.device_tokens RENAME COLUMN osVersion TO os_version;
-- Renomear coluna isActive para is_active na tabela device_tokens
ALTER TABLE public.device_tokens RENAME COLUMN isActive TO is_active;
-- Renomear coluna lastUsed para last_used na tabela device_tokens
ALTER TABLE public.device_tokens RENAME COLUMN lastUsed TO last_used;
-- Renomear coluna registeredAt para registered_at na tabela device_tokens
ALTER TABLE public.device_tokens RENAME COLUMN registeredAt TO registered_at;
-- Renomear coluna createdAt para created_at na tabela device_tokens
ALTER TABLE public.device_tokens RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela device_tokens
ALTER TABLE public.device_tokens RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela errorLogs para error_logs
ALTER TABLE public.errorLogs RENAME TO error_logs;

-- Renomear coluna userId para user_id na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN userId TO user_id;
-- Renomear coluna errorType para error_type na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN errorType TO error_type;
-- Renomear coluna errorCode para error_code na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN errorCode TO error_code;
-- Renomear coluna errorMessage para error_message na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN errorMessage TO error_message;
-- Renomear coluna stackTrace para stack_trace na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN stackTrace TO stack_trace;
-- Renomear coluna userAgent para user_agent na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN userAgent TO user_agent;
-- Renomear coluna ipAddress para ip_address na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN ipAddress TO ip_address;
-- Renomear coluna statusCode para status_code na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN statusCode TO status_code;
-- Renomear coluna resolvedBy para resolved_by na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN resolvedBy TO resolved_by;
-- Renomear coluna resolvedAt para resolved_at na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN resolvedAt TO resolved_at;
-- Renomear coluna createdAt para created_at na tabela error_logs
ALTER TABLE public.error_logs RENAME COLUMN createdAt TO created_at;

-- Renomear coluna userId para user_id na tabela feedbacks
ALTER TABLE public.feedbacks RENAME COLUMN userId TO user_id;
-- Renomear coluna assignedTo para assigned_to na tabela feedbacks
ALTER TABLE public.feedbacks RENAME COLUMN assignedTo TO assigned_to;
-- Renomear coluna responseAt para response_at na tabela feedbacks
ALTER TABLE public.feedbacks RENAME COLUMN responseAt TO response_at;
-- Renomear coluna deviceInfo para device_info na tabela feedbacks
ALTER TABLE public.feedbacks RENAME COLUMN deviceInfo TO device_info;
-- Renomear coluna appVersion para app_version na tabela feedbacks
ALTER TABLE public.feedbacks RENAME COLUMN appVersion TO app_version;
-- Renomear coluna createdAt para created_at na tabela feedbacks
ALTER TABLE public.feedbacks RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela feedbacks
ALTER TABLE public.feedbacks RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna createdAt para created_at na tabela filters
ALTER TABLE public.filters RENAME COLUMN createdAt TO created_at;
-- Renomear coluna filterType para filter_type na tabela filters
ALTER TABLE public.filters RENAME COLUMN filterType TO filter_type;
-- Renomear coluna isGlobal para is_global na tabela filters
ALTER TABLE public.filters RENAME COLUMN isGlobal TO is_global;
-- Renomear coluna updatedAt para updated_at na tabela filters
ALTER TABLE public.filters RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna isActive para is_active na tabela filters
ALTER TABLE public.filters RENAME COLUMN isActive TO is_active;

-- Renomear coluna userId para user_id na tabela flashcard_search_index
ALTER TABLE public.flashcard_search_index RENAME COLUMN userId TO user_id;
-- Renomear coluna deckId para deck_id na tabela flashcard_search_index
ALTER TABLE public.flashcard_search_index RENAME COLUMN deckId TO deck_id;
-- Renomear coluna deckName para deck_name na tabela flashcard_search_index
ALTER TABLE public.flashcard_search_index RENAME COLUMN deckName TO deck_name;
-- Renomear coluna deckDescription para deck_description na tabela flashcard_search_index
ALTER TABLE public.flashcard_search_index RENAME COLUMN deckDescription TO deck_description;
-- Renomear coluna collectionName para collection_name na tabela flashcard_search_index
ALTER TABLE public.flashcard_search_index RENAME COLUMN collectionName TO collection_name;
-- Renomear coluna flashcardCount para flashcard_count na tabela flashcard_search_index
ALTER TABLE public.flashcard_search_index RENAME COLUMN flashcardCount TO flashcard_count;
-- Renomear coluna hierarchyPath para hierarchy_path na tabela flashcard_search_index
ALTER TABLE public.flashcard_search_index RENAME COLUMN hierarchyPath TO hierarchy_path;
-- Renomear coluna searchableText para searchable_text na tabela flashcard_search_index
ALTER TABLE public.flashcard_search_index RENAME COLUMN searchableText TO searchable_text;
-- Renomear coluna createdAt para created_at na tabela flashcard_search_index
ALTER TABLE public.flashcard_search_index RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela flashcard_search_index
ALTER TABLE public.flashcard_search_index RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna deckId para deck_id na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN deckId TO deck_id;
-- Renomear coluna frontContent para front_content na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN frontContent TO front_content;
-- Renomear coluna backContent para back_content na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN backContent TO back_content;
-- Renomear coluna lastReview para last_review na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN lastReview TO last_review;
-- Renomear coluna nextReview para next_review na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN nextReview TO next_review;
-- Renomear coluna reviewCount para review_count na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN reviewCount TO review_count;
-- Renomear coluna lapseCount para lapse_count na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN lapseCount TO lapse_count;
-- Renomear coluna createdAt para created_at na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna ankiData para anki_data na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN ankiData TO anki_data;
-- Renomear coluna srsInterval para srs_interval na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN srsInterval TO srs_interval;
-- Renomear coluna srsRepetitions para srs_repetitions na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN srsRepetitions TO srs_repetitions;
-- Renomear coluna srsEaseFactor para srs_ease_factor na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN srsEaseFactor TO srs_ease_factor;
-- Renomear coluna srsLapses para srs_lapses na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN srsLapses TO srs_lapses;
-- Renomear coluna lastReviewedAt para last_reviewed_at na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN lastReviewedAt TO last_reviewed_at;
-- Renomear coluna nextReviewAt para next_review_at na tabela flashcards
ALTER TABLE public.flashcards RENAME COLUMN nextReviewAt TO next_review_at;

-- Renomear coluna inviterId para inviter_id na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN inviterId TO inviter_id;
-- Renomear coluna inviteeEmail para invitee_email na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN inviteeEmail TO invitee_email;
-- Renomear coluna inviteeId para invitee_id na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN inviteeId TO invitee_id;
-- Renomear coluna invitationType para invitation_type na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN invitationType TO invitation_type;
-- Renomear coluna inviteCode para invite_code na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN inviteCode TO invite_code;
-- Renomear coluna expiresAt para expires_at na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN expiresAt TO expires_at;
-- Renomear coluna acceptedAt para accepted_at na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN acceptedAt TO accepted_at;
-- Renomear coluna declinedAt para declined_at na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN declinedAt TO declined_at;
-- Renomear coluna sentAt para sent_at na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN sentAt TO sent_at;
-- Renomear coluna remindersSent para reminders_sent na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN remindersSent TO reminders_sent;
-- Renomear coluna lastReminderAt para last_reminder_at na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN lastReminderAt TO last_reminder_at;
-- Renomear coluna createdAt para created_at na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela invitations
ALTER TABLE public.invitations RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna userId para user_id na tabela leaderboards
ALTER TABLE public.leaderboards RENAME COLUMN userId TO user_id;
-- Renomear coluna leaderboardType para leaderboard_type na tabela leaderboards
ALTER TABLE public.leaderboards RENAME COLUMN leaderboardType TO leaderboard_type;
-- Renomear coluna previousRank para previous_rank na tabela leaderboards
ALTER TABLE public.leaderboards RENAME COLUMN previousRank TO previous_rank;
-- Renomear coluna isActive para is_active na tabela leaderboards
ALTER TABLE public.leaderboards RENAME COLUMN isActive TO is_active;
-- Renomear coluna lastUpdated para last_updated na tabela leaderboards
ALTER TABLE public.leaderboards RENAME COLUMN lastUpdated TO last_updated;
-- Renomear coluna createdAt para created_at na tabela leaderboards
ALTER TABLE public.leaderboards RENAME COLUMN createdAt TO created_at;

-- Renomear coluna userId para user_id na tabela likes
ALTER TABLE public.likes RENAME COLUMN userId TO user_id;
-- Renomear coluna contentId para content_id na tabela likes
ALTER TABLE public.likes RENAME COLUMN contentId TO content_id;
-- Renomear coluna contentType para content_type na tabela likes
ALTER TABLE public.likes RENAME COLUMN contentType TO content_type;
-- Renomear coluna likeType para like_type na tabela likes
ALTER TABLE public.likes RENAME COLUMN likeType TO like_type;
-- Renomear coluna createdAt para created_at na tabela likes
ALTER TABLE public.likes RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela likes
ALTER TABLE public.likes RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna fileName para file_name na tabela media
ALTER TABLE public.media RENAME COLUMN fileName TO file_name;
-- Renomear coluna originalName para original_name na tabela media
ALTER TABLE public.media RENAME COLUMN originalName TO original_name;
-- Renomear coluna mimeType para mime_type na tabela media
ALTER TABLE public.media RENAME COLUMN mimeType TO mime_type;
-- Renomear coluna fileSize para file_size na tabela media
ALTER TABLE public.media RENAME COLUMN fileSize TO file_size;
-- Renomear coluna thumbnailUrl para thumbnail_url na tabela media
ALTER TABLE public.media RENAME COLUMN thumbnailUrl TO thumbnail_url;
-- Renomear coluna storageProvider para storage_provider na tabela media
ALTER TABLE public.media RENAME COLUMN storageProvider TO storage_provider;
-- Renomear coluna storagePath para storage_path na tabela media
ALTER TABLE public.media RENAME COLUMN storagePath TO storage_path;
-- Renomear coluna uploadedBy para uploaded_by na tabela media
ALTER TABLE public.media RENAME COLUMN uploadedBy TO uploaded_by;
-- Renomear coluna isPublic para is_public na tabela media
ALTER TABLE public.media RENAME COLUMN isPublic TO is_public;
-- Renomear coluna processedAt para processed_at na tabela media
ALTER TABLE public.media RENAME COLUMN processedAt TO processed_at;
-- Renomear coluna createdAt para created_at na tabela media
ALTER TABLE public.media RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela media
ALTER TABLE public.media RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela mediaFiles para media_files
ALTER TABLE public.mediaFiles RENAME TO media_files;

-- Renomear coluna mimeType para mime_type na tabela media_files
ALTER TABLE public.media_files RENAME COLUMN mimeType TO mime_type;
-- Renomear coluna userId para user_id na tabela media_files
ALTER TABLE public.media_files RENAME COLUMN userId TO user_id;
-- Renomear coluna originalFilename para original_filename na tabela media_files
ALTER TABLE public.media_files RENAME COLUMN originalFilename TO original_filename;
-- Renomear coluna isPublic para is_public na tabela media_files
ALTER TABLE public.media_files RENAME COLUMN isPublic TO is_public;
-- Renomear coluna createdAt para created_at na tabela media_files
ALTER TABLE public.media_files RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela media_files
ALTER TABLE public.media_files RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna mentorId para mentor_id na tabela mentorships
ALTER TABLE public.mentorships RENAME COLUMN mentorId TO mentor_id;
-- Renomear coluna studentId para student_id na tabela mentorships
ALTER TABLE public.mentorships RENAME COLUMN studentId TO student_id;
-- Renomear coluna meetingFrequency para meeting_frequency na tabela mentorships
ALTER TABLE public.mentorships RENAME COLUMN meetingFrequency TO meeting_frequency;
-- Renomear coluna customFrequencyDays para custom_frequency_days na tabela mentorships
ALTER TABLE public.mentorships RENAME COLUMN customFrequencyDays TO custom_frequency_days;
-- Renomear coluna totalMeetings para total_meetings na tabela mentorships
ALTER TABLE public.mentorships RENAME COLUMN totalMeetings TO total_meetings;
-- Renomear coluna completedMeetings para completed_meetings na tabela mentorships
ALTER TABLE public.mentorships RENAME COLUMN completedMeetings TO completed_meetings;
-- Renomear coluna createdAt para created_at na tabela mentorships
ALTER TABLE public.mentorships RENAME COLUMN createdAt TO created_at;
-- Renomear coluna nextMeetingDate para next_meeting_date na tabela mentorships
ALTER TABLE public.mentorships RENAME COLUMN nextMeetingDate TO next_meeting_date;
-- Renomear coluna startDate para start_date na tabela mentorships
ALTER TABLE public.mentorships RENAME COLUMN startDate TO start_date;
-- Renomear coluna updatedAt para updated_at na tabela mentorships
ALTER TABLE public.mentorships RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna userId para user_id na tabela notifications
ALTER TABLE public.notifications RENAME COLUMN userId TO user_id;
-- Renomear coluna relatedId para related_id na tabela notifications
ALTER TABLE public.notifications RENAME COLUMN relatedId TO related_id;
-- Renomear coluna relatedType para related_type na tabela notifications
ALTER TABLE public.notifications RENAME COLUMN relatedType TO related_type;
-- Renomear coluna isRead para is_read na tabela notifications
ALTER TABLE public.notifications RENAME COLUMN isRead TO is_read;
-- Renomear coluna readAt para read_at na tabela notifications
ALTER TABLE public.notifications RENAME COLUMN readAt TO read_at;
-- Renomear coluna createdAt para created_at na tabela notifications
ALTER TABLE public.notifications RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela notifications
ALTER TABLE public.notifications RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna userId para user_id na tabela payments
ALTER TABLE public.payments RENAME COLUMN userId TO user_id;
-- Renomear coluna subscriptionId para subscription_id na tabela payments
ALTER TABLE public.payments RENAME COLUMN subscriptionId TO subscription_id;
-- Renomear coluna paymentMethod para payment_method na tabela payments
ALTER TABLE public.payments RENAME COLUMN paymentMethod TO payment_method;
-- Renomear coluna paymentProvider para payment_provider na tabela payments
ALTER TABLE public.payments RENAME COLUMN paymentProvider TO payment_provider;
-- Renomear coluna transactionId para transaction_id na tabela payments
ALTER TABLE public.payments RENAME COLUMN transactionId TO transaction_id;
-- Renomear coluna paymentDate para payment_date na tabela payments
ALTER TABLE public.payments RENAME COLUMN paymentDate TO payment_date;
-- Renomear coluna dueDate para due_date na tabela payments
ALTER TABLE public.payments RENAME COLUMN dueDate TO due_date;
-- Renomear coluna paidAt para paid_at na tabela payments
ALTER TABLE public.payments RENAME COLUMN paidAt TO paid_at;
-- Renomear coluna failedAt para failed_at na tabela payments
ALTER TABLE public.payments RENAME COLUMN failedAt TO failed_at;
-- Renomear coluna failureReason para failure_reason na tabela payments
ALTER TABLE public.payments RENAME COLUMN failureReason TO failure_reason;
-- Renomear coluna createdAt para created_at na tabela payments
ALTER TABLE public.payments RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela payments
ALTER TABLE public.payments RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna operationType para operation_type na tabela performance_metrics
ALTER TABLE public.performance_metrics RENAME COLUMN operationType TO operation_type;
-- Renomear coluna userId para user_id na tabela performance_metrics
ALTER TABLE public.performance_metrics RENAME COLUMN userId TO user_id;
-- Renomear coluna executionTimeMs para execution_time_ms na tabela performance_metrics
ALTER TABLE public.performance_metrics RENAME COLUMN executionTimeMs TO execution_time_ms;
-- Renomear coluna documentsRead para documents_read na tabela performance_metrics
ALTER TABLE public.performance_metrics RENAME COLUMN documentsRead TO documents_read;
-- Renomear coluna queryFilters para query_filters na tabela performance_metrics
ALTER TABLE public.performance_metrics RENAME COLUMN queryFilters TO query_filters;

-- Renomear tabela plannerTasks para planner_tasks
ALTER TABLE public.plannerTasks RENAME TO planner_tasks;

-- Renomear coluna userId para user_id na tabela planner_tasks
ALTER TABLE public.planner_tasks RENAME COLUMN userId TO user_id;
-- Renomear coluna scheduledDate para scheduled_date na tabela planner_tasks
ALTER TABLE public.planner_tasks RENAME COLUMN scheduledDate TO scheduled_date;
-- Renomear coluna createdAt para created_at na tabela planner_tasks
ALTER TABLE public.planner_tasks RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela planner_tasks
ALTER TABLE public.planner_tasks RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna manualType para manual_type na tabela planner_tasks
ALTER TABLE public.planner_tasks RENAME COLUMN manualType TO manual_type;
-- Renomear coluna targetUrl para target_url na tabela planner_tasks
ALTER TABLE public.planner_tasks RENAME COLUMN targetUrl TO target_url;

-- Renomear coluna intervalCount para interval_count na tabela plans
ALTER TABLE public.plans RENAME COLUMN intervalCount TO interval_count;
-- Renomear coluna trialDays para trial_days na tabela plans
ALTER TABLE public.plans RENAME COLUMN trialDays TO trial_days;
-- Renomear coluna isActive para is_active na tabela plans
ALTER TABLE public.plans RENAME COLUMN isActive TO is_active;
-- Renomear coluna isPublic para is_public na tabela plans
ALTER TABLE public.plans RENAME COLUMN isPublic TO is_public;
-- Renomear coluna createdAt para created_at na tabela plans
ALTER TABLE public.plans RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela plans
ALTER TABLE public.plans RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna durationDays para duration_days na tabela plans
ALTER TABLE public.plans RENAME COLUMN durationDays TO duration_days;
-- Renomear coluna displayOrder para display_order na tabela plans
ALTER TABLE public.plans RENAME COLUMN displayOrder TO display_order;
-- Renomear coluna isPopular para is_popular na tabela plans
ALTER TABLE public.plans RENAME COLUMN isPopular TO is_popular;
-- Renomear coluna stripePriceId para stripe_price_id na tabela plans
ALTER TABLE public.plans RENAME COLUMN stripePriceId TO stripe_price_id;
-- Renomear coluna stripeProductId para stripe_product_id na tabela plans
ALTER TABLE public.plans RENAME COLUMN stripeProductId TO stripe_product_id;
-- Renomear coluna maxQuestions para max_questions na tabela plans
ALTER TABLE public.plans RENAME COLUMN maxQuestions TO max_questions;
-- Renomear coluna maxFlashcards para max_flashcards na tabela plans
ALTER TABLE public.plans RENAME COLUMN maxFlashcards TO max_flashcards;
-- Renomear coluna maxSimulatedExams para max_simulated_exams na tabela plans
ALTER TABLE public.plans RENAME COLUMN maxSimulatedExams TO max_simulated_exams;
-- Renomear coluna hasMentorship para has_mentorship na tabela plans
ALTER TABLE public.plans RENAME COLUMN hasMentorship TO has_mentorship;
-- Renomear coluna hasAdvancedAnalytics para has_advanced_analytics na tabela plans
ALTER TABLE public.plans RENAME COLUMN hasAdvancedAnalytics TO has_advanced_analytics;
-- Renomear coluna hasErrorNotebook para has_error_notebook na tabela plans
ALTER TABLE public.plans RENAME COLUMN hasErrorNotebook TO has_error_notebook;

-- Renomear tabela programmedReviews para programmed_reviews
ALTER TABLE public.programmedReviews RENAME TO programmed_reviews;

-- Renomear coluna userId para user_id na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN userId TO user_id;
-- Renomear coluna contentId para content_id na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN contentId TO content_id;
-- Renomear coluna contentType para content_type na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN contentType TO content_type;
-- Renomear coluna deckId para deck_id na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN deckId TO deck_id;
-- Renomear coluna originalAnswerCorrect para original_answer_correct na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN originalAnswerCorrect TO original_answer_correct;
-- Renomear coluna lastReviewedAt para last_reviewed_at na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN lastReviewedAt TO last_reviewed_at;
-- Renomear coluna nextReviewAt para next_review_at na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN nextReviewAt TO next_review_at;
-- Renomear coluna intervalDays para interval_days na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN intervalDays TO interval_days;
-- Renomear coluna easeFactor para ease_factor na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN easeFactor TO ease_factor;
-- Renomear coluna createdAt para created_at na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela programmed_reviews
ALTER TABLE public.programmed_reviews RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela questionListFolders para question_list_folders
ALTER TABLE public.questionListFolders RENAME TO question_list_folders;

-- Renomear coluna userId para user_id na tabela question_list_folders
ALTER TABLE public.question_list_folders RENAME COLUMN userId TO user_id;
-- Renomear coluna createdAt para created_at na tabela question_list_folders
ALTER TABLE public.question_list_folders RENAME COLUMN createdAt TO created_at;
-- Renomear coluna listCount para list_count na tabela question_list_folders
ALTER TABLE public.question_list_folders RENAME COLUMN listCount TO list_count;
-- Renomear coluna updatedAt para updated_at na tabela question_list_folders
ALTER TABLE public.question_list_folders RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela questionListItems para question_list_items
ALTER TABLE public.questionListItems RENAME TO question_list_items;

-- Renomear coluna questionListId para question_list_id na tabela question_list_items
ALTER TABLE public.question_list_items RENAME COLUMN questionListId TO question_list_id;
-- Renomear coluna questionId para question_id na tabela question_list_items
ALTER TABLE public.question_list_items RENAME COLUMN questionId TO question_id;
-- Renomear coluna personalNotes para personal_notes na tabela question_list_items
ALTER TABLE public.question_list_items RENAME COLUMN personalNotes TO personal_notes;
-- Renomear coluna isCompleted para is_completed na tabela question_list_items
ALTER TABLE public.question_list_items RENAME COLUMN isCompleted TO is_completed;
-- Renomear coluna addedAt para added_at na tabela question_list_items
ALTER TABLE public.question_list_items RENAME COLUMN addedAt TO added_at;
-- Renomear coluna lastAttemptedAt para last_attempted_at na tabela question_list_items
ALTER TABLE public.question_list_items RENAME COLUMN lastAttemptedAt TO last_attempted_at;
-- Renomear coluna correctAttempts para correct_attempts na tabela question_list_items
ALTER TABLE public.question_list_items RENAME COLUMN correctAttempts TO correct_attempts;
-- Renomear coluna incorrectAttempts para incorrect_attempts na tabela question_list_items
ALTER TABLE public.question_list_items RENAME COLUMN incorrectAttempts TO incorrect_attempts;
-- Renomear coluna createdAt para created_at na tabela question_list_items
ALTER TABLE public.question_list_items RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela question_list_items
ALTER TABLE public.question_list_items RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela questionLists para question_lists
ALTER TABLE public.questionLists RENAME TO question_lists;

-- Renomear coluna userId para user_id na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN userId TO user_id;
-- Renomear coluna isPublic para is_public na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN isPublic TO is_public;
-- Renomear coluna viewCount para view_count na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN viewCount TO view_count;
-- Renomear coluna favoriteCount para favorite_count na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN favoriteCount TO favorite_count;
-- Renomear coluna lastStudyDate para last_study_date na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN lastStudyDate TO last_study_date;
-- Renomear coluna completionPercentage para completion_percentage na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN completionPercentage TO completion_percentage;
-- Renomear coluna createdAt para created_at na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN createdAt TO created_at;
-- Renomear coluna questionCount para question_count na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN questionCount TO question_count;
-- Renomear coluna lastAddedAt para last_added_at na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN lastAddedAt TO last_added_at;
-- Renomear coluna updatedAt para updated_at na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna folderId para folder_id na tabela question_lists
ALTER TABLE public.question_lists RENAME COLUMN folderId TO folder_id;

-- Renomear tabela questionResponses para question_responses
ALTER TABLE public.questionResponses RENAME TO question_responses;

-- Renomear coluna userId para user_id na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN userId TO user_id;
-- Renomear coluna questionId para question_id na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN questionId TO question_id;
-- Renomear coluna questionListId para question_list_id na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN questionListId TO question_list_id;
-- Renomear coluna selectedAlternativeId para selected_alternative_id na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN selectedAlternativeId TO selected_alternative_id;
-- Renomear coluna isCorrectOnFirstAttempt para is_correct_on_first_attempt na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN isCorrectOnFirstAttempt TO is_correct_on_first_attempt;
-- Renomear coluna responseTimeSeconds para response_time_seconds na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN responseTimeSeconds TO response_time_seconds;
-- Renomear coluna reviewQuality para review_quality na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN reviewQuality TO review_quality;
-- Renomear coluna easeFactor para ease_factor na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN easeFactor TO ease_factor;
-- Renomear coluna failStreak para fail_streak na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN failStreak TO fail_streak;
-- Renomear coluna isLearning para is_learning na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN isLearning TO is_learning;
-- Renomear coluna isLeech para is_leech na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN isLeech TO is_leech;
-- Renomear coluna lastReviewQuality para last_review_quality na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN lastReviewQuality TO last_review_quality;
-- Renomear coluna lastReviewedAt para last_reviewed_at na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN lastReviewedAt TO last_reviewed_at;
-- Renomear coluna nextReviewDate para next_review_date na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN nextReviewDate TO next_review_date;
-- Renomear coluna answeredAt para answered_at na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN answeredAt TO answered_at;
-- Renomear coluna createdAt para created_at na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN createdAt TO created_at;
-- Renomear coluna programmedReviewId para programmed_review_id na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN programmedReviewId TO programmed_review_id;
-- Renomear coluna updatedAt para updated_at na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna selectedOptionId para selected_option_id na tabela question_responses
ALTER TABLE public.question_responses RENAME COLUMN selectedOptionId TO selected_option_id;

-- Renomear coluna deckId para deck_id na tabela questions
ALTER TABLE public.questions RENAME COLUMN deckId TO deck_id;
-- Renomear coluna userId para user_id na tabela questions
ALTER TABLE public.questions RENAME COLUMN userId TO user_id;
-- Renomear coluna questionType para question_type na tabela questions
ALTER TABLE public.questions RENAME COLUMN questionType TO question_type;
-- Renomear coluna correctAnswer para correct_answer na tabela questions
ALTER TABLE public.questions RENAME COLUMN correctAnswer TO correct_answer;
-- Renomear coluna isPublic para is_public na tabela questions
ALTER TABLE public.questions RENAME COLUMN isPublic TO is_public;
-- Renomear coluna viewCount para view_count na tabela questions
ALTER TABLE public.questions RENAME COLUMN viewCount TO view_count;
-- Renomear coluna likeCount para like_count na tabela questions
ALTER TABLE public.questions RENAME COLUMN likeCount TO like_count;
-- Renomear coluna answerCount para answer_count na tabela questions
ALTER TABLE public.questions RENAME COLUMN answerCount TO answer_count;
-- Renomear coluna createdAt para created_at na tabela questions
ALTER TABLE public.questions RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela questions
ALTER TABLE public.questions RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela rateLimitViolations para rate_limit_violations
ALTER TABLE public.rateLimitViolations RENAME TO rate_limit_violations;

-- Renomear coluna ipAddress para ip_address na tabela rate_limit_violations
ALTER TABLE public.rate_limit_violations RENAME COLUMN ipAddress TO ip_address;
-- Renomear coluna userId para user_id na tabela rate_limit_violations
ALTER TABLE public.rate_limit_violations RENAME COLUMN userId TO user_id;
-- Renomear coluna apiKeyId para api_key_id na tabela rate_limit_violations
ALTER TABLE public.rate_limit_violations RENAME COLUMN apiKeyId TO api_key_id;

-- Renomear tabela rateLimits para rate_limits
ALTER TABLE public.rateLimits RENAME TO rate_limits;

-- Renomear coluna resetAt para reset_at na tabela rate_limits
ALTER TABLE public.rate_limits RENAME COLUMN resetAt TO reset_at;
-- Renomear coluna createdAt para created_at na tabela rate_limits
ALTER TABLE public.rate_limits RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela rate_limits
ALTER TABLE public.rate_limits RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna userId para user_id na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN userId TO user_id;
-- Renomear coluna flashcardId para flashcard_id na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN flashcardId TO flashcard_id;
-- Renomear coluna deckId para deck_id na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN deckId TO deck_id;
-- Renomear coluna responseTime para response_time na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN responseTime TO response_time;
-- Renomear coluna reviewType para review_type na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN reviewType TO review_type;
-- Renomear coluna previousInterval para previous_interval na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN previousInterval TO previous_interval;
-- Renomear coluna newInterval para new_interval na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN newInterval TO new_interval;
-- Renomear coluna easeFactor para ease_factor na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN easeFactor TO ease_factor;
-- Renomear coluna reviewDate para review_date na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN reviewDate TO review_date;
-- Renomear coluna nextReviewDate para next_review_date na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN nextReviewDate TO next_review_date;
-- Renomear coluna algorithmData para algorithm_data na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN algorithmData TO algorithm_data;
-- Renomear coluna createdAt para created_at na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela reviews
ALTER TABLE public.reviews RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela scheduledTasks para scheduled_tasks
ALTER TABLE public.scheduledTasks RENAME TO scheduled_tasks;

-- Renomear coluna isActive para is_active na tabela scheduled_tasks
ALTER TABLE public.scheduled_tasks RENAME COLUMN isActive TO is_active;
-- Renomear coluna createdBy para created_by na tabela scheduled_tasks
ALTER TABLE public.scheduled_tasks RENAME COLUMN createdBy TO created_by;
-- Renomear coluna nextRunAt para next_run_at na tabela scheduled_tasks
ALTER TABLE public.scheduled_tasks RENAME COLUMN nextRunAt TO next_run_at;
-- Renomear coluna createdAt para created_at na tabela scheduled_tasks
ALTER TABLE public.scheduled_tasks RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela scheduled_tasks
ALTER TABLE public.scheduled_tasks RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna lastRunAt para last_run_at na tabela scheduled_tasks
ALTER TABLE public.scheduled_tasks RENAME COLUMN lastRunAt TO last_run_at;

-- Renomear coluna userId para user_id na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN userId TO user_id;
-- Renomear coluna sessionToken para session_token na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN sessionToken TO session_token;
-- Renomear coluna refreshToken para refresh_token na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN refreshToken TO refresh_token;
-- Renomear coluna deviceId para device_id na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN deviceId TO device_id;
-- Renomear coluna deviceType para device_type na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN deviceType TO device_type;
-- Renomear coluna userAgent para user_agent na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN userAgent TO user_agent;
-- Renomear coluna ipAddress para ip_address na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN ipAddress TO ip_address;
-- Renomear coluna isActive para is_active na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN isActive TO is_active;
-- Renomear coluna lastActivity para last_activity na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN lastActivity TO last_activity;
-- Renomear coluna expiresAt para expires_at na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN expiresAt TO expires_at;
-- Renomear coluna createdAt para created_at na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela sessions
ALTER TABLE public.sessions RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela simulatedExamResults para simulated_exam_results
ALTER TABLE public.simulatedExamResults RENAME TO simulated_exam_results;

-- Renomear coluna userId para user_id na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN userId TO user_id;
-- Renomear coluna simulatedExamId para simulated_exam_id na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN simulatedExamId TO simulated_exam_id;
-- Renomear coluna userName para user_name na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN userName TO user_name;
-- Renomear coluna simulatedExamTitle para simulated_exam_title na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN simulatedExamTitle TO simulated_exam_title;
-- Renomear coluna startedAt para started_at na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN startedAt TO started_at;
-- Renomear coluna timeTakenSeconds para time_taken_seconds na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN timeTakenSeconds TO time_taken_seconds;
-- Renomear coluna totalQuestions para total_questions na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN totalQuestions TO total_questions;
-- Renomear coluna correctCount para correct_count na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN correctCount TO correct_count;
-- Renomear coluna incorrectCount para incorrect_count na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN incorrectCount TO incorrect_count;
-- Renomear coluna createdAt para created_at na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN createdAt TO created_at;
-- Renomear coluna completedAt para completed_at na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN completedAt TO completed_at;
-- Renomear coluna updatedAt para updated_at na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna startTime para start_time na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN startTime TO start_time;
-- Renomear coluna totalTimeSpentSeconds para total_time_spent_seconds na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN totalTimeSpentSeconds TO total_time_spent_seconds;
-- Renomear coluna answeredQuestions para answered_questions na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN answeredQuestions TO answered_questions;
-- Renomear coluna correctAnswers para correct_answers na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN correctAnswers TO correct_answers;
-- Renomear coluna incorrectAnswers para incorrect_answers na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN incorrectAnswers TO incorrect_answers;
-- Renomear coluna skippedAnswers para skipped_answers na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN skippedAnswers TO skipped_answers;
-- Renomear coluna endTime para end_time na tabela simulated_exam_results
ALTER TABLE public.simulated_exam_results RENAME COLUMN endTime TO end_time;

-- Renomear tabela simulatedExams para simulated_exams
ALTER TABLE public.simulatedExams RENAME TO simulated_exams;

-- Renomear coluna questionIds para question_ids na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN questionIds TO question_ids;
-- Renomear coluna totalQuestions para total_questions na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN totalQuestions TO total_questions;
-- Renomear coluna totalPoints para total_points na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN totalPoints TO total_points;
-- Renomear coluna filterIds para filter_ids na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN filterIds TO filter_ids;
-- Renomear coluna subFilterIds para sub_filter_ids na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN subFilterIds TO sub_filter_ids;
-- Renomear coluna isPublic para is_public na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN isPublic TO is_public;
-- Renomear coluna createdBy para created_by na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN createdBy TO created_by;
-- Renomear coluna createdAt para created_at na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna userId para user_id na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN userId TO user_id;
-- Renomear coluna creatorName para creator_name na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN creatorName TO creator_name;
-- Renomear coluna questionCount para question_count na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN questionCount TO question_count;
-- Renomear coluna timeLimitMinutes para time_limit_minutes na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN timeLimitMinutes TO time_limit_minutes;
-- Renomear coluna totalAttempts para total_attempts na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN totalAttempts TO total_attempts;
-- Renomear coluna averageScore para average_score na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN averageScore TO average_score;
-- Renomear coluna lastPublishedAt para last_published_at na tabela simulated_exams
ALTER TABLE public.simulated_exams RENAME COLUMN lastPublishedAt TO last_published_at;

-- Renomear tabela studySessions para study_sessions
ALTER TABLE public.studySessions RENAME TO study_sessions;

-- Renomear coluna userId para user_id na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN userId TO user_id;
-- Renomear coluna deckId para deck_id na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN deckId TO deck_id;
-- Renomear coluna sessionType para session_type na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN sessionType TO session_type;
-- Renomear coluna startTime para start_time na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN startTime TO start_time;
-- Renomear coluna endTime para end_time na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN endTime TO end_time;
-- Renomear coluna cardsStudied para cards_studied na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN cardsStudied TO cards_studied;
-- Renomear coluna correctAnswers para correct_answers na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN correctAnswers TO correct_answers;
-- Renomear coluna incorrectAnswers para incorrect_answers na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN incorrectAnswers TO incorrect_answers;
-- Renomear coluna averageResponseTime para average_response_time na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN averageResponseTime TO average_response_time;
-- Renomear coluna sessionData para session_data na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN sessionData TO session_data;
-- Renomear coluna createdAt para created_at na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela study_sessions
ALTER TABLE public.study_sessions RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela subFilters para sub_filters
ALTER TABLE public.subFilters RENAME TO sub_filters;

-- Renomear coluna createdAt para created_at na tabela sub_filters
ALTER TABLE public.sub_filters RENAME COLUMN createdAt TO created_at;
-- Renomear coluna isActive para is_active na tabela sub_filters
ALTER TABLE public.sub_filters RENAME COLUMN isActive TO is_active;
-- Renomear coluna filterId para filter_id na tabela sub_filters
ALTER TABLE public.sub_filters RENAME COLUMN filterId TO filter_id;
-- Renomear coluna updatedAt para updated_at na tabela sub_filters
ALTER TABLE public.sub_filters RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna parentId para parent_id na tabela sub_filters
ALTER TABLE public.sub_filters RENAME COLUMN parentId TO parent_id;

-- Renomear coluna userId para user_id na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN userId TO user_id;
-- Renomear coluna planId para plan_id na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN planId TO plan_id;
-- Renomear coluna planName para plan_name na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN planName TO plan_name;
-- Renomear coluna currentPeriodStart para current_period_start na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN currentPeriodStart TO current_period_start;
-- Renomear coluna currentPeriodEnd para current_period_end na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN currentPeriodEnd TO current_period_end;
-- Renomear coluna trialStart para trial_start na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN trialStart TO trial_start;
-- Renomear coluna trialEnd para trial_end na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN trialEnd TO trial_end;
-- Renomear coluna canceledAt para canceled_at na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN canceledAt TO canceled_at;
-- Renomear coluna cancelAtPeriodEnd para cancel_at_period_end na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN cancelAtPeriodEnd TO cancel_at_period_end;
-- Renomear coluna subscriptionProvider para subscription_provider na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN subscriptionProvider TO subscription_provider;
-- Renomear coluna providerSubscriptionId para provider_subscription_id na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN providerSubscriptionId TO provider_subscription_id;
-- Renomear coluna providerCustomerId para provider_customer_id na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN providerCustomerId TO provider_customer_id;
-- Renomear coluna createdAt para created_at na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna isSystem para is_system na tabela tags
ALTER TABLE public.tags RENAME COLUMN isSystem TO is_system;
-- Renomear coluna isActive para is_active na tabela tags
ALTER TABLE public.tags RENAME COLUMN isActive TO is_active;
-- Renomear coluna usageCount para usage_count na tabela tags
ALTER TABLE public.tags RENAME COLUMN usageCount TO usage_count;
-- Renomear coluna parentId para parent_id na tabela tags
ALTER TABLE public.tags RENAME COLUMN parentId TO parent_id;
-- Renomear coluna createdBy para created_by na tabela tags
ALTER TABLE public.tags RENAME COLUMN createdBy TO created_by;
-- Renomear coluna createdAt para created_at na tabela tags
ALTER TABLE public.tags RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela tags
ALTER TABLE public.tags RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela taskExecutionLogs para task_execution_logs
ALTER TABLE public.taskExecutionLogs RENAME TO task_execution_logs;

-- Renomear coluna taskId para task_id na tabela task_execution_logs
ALTER TABLE public.task_execution_logs RENAME COLUMN taskId TO task_id;
-- Renomear coluna taskName para task_name na tabela task_execution_logs
ALTER TABLE public.task_execution_logs RENAME COLUMN taskName TO task_name;
-- Renomear coluna startedAt para started_at na tabela task_execution_logs
ALTER TABLE public.task_execution_logs RENAME COLUMN startedAt TO started_at;
-- Renomear coluna completedAt para completed_at na tabela task_execution_logs
ALTER TABLE public.task_execution_logs RENAME COLUMN completedAt TO completed_at;

-- Renomear coluna isPublic para is_public na tabela templates
ALTER TABLE public.templates RENAME COLUMN isPublic TO is_public;
-- Renomear coluna isOfficial para is_official na tabela templates
ALTER TABLE public.templates RENAME COLUMN isOfficial TO is_official;
-- Renomear coluna createdBy para created_by na tabela templates
ALTER TABLE public.templates RENAME COLUMN createdBy TO created_by;
-- Renomear coluna usageCount para usage_count na tabela templates
ALTER TABLE public.templates RENAME COLUMN usageCount TO usage_count;
-- Renomear coluna ratingCount para rating_count na tabela templates
ALTER TABLE public.templates RENAME COLUMN ratingCount TO rating_count;
-- Renomear coluna createdAt para created_at na tabela templates
ALTER TABLE public.templates RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela templates
ALTER TABLE public.templates RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela userAnswers para user_answers
ALTER TABLE public.userAnswers RENAME TO user_answers;

-- Renomear coluna userId para user_id na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN userId TO user_id;
-- Renomear coluna questionId para question_id na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN questionId TO question_id;
-- Renomear coluna flashcardId para flashcard_id na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN flashcardId TO flashcard_id;
-- Renomear coluna deckId para deck_id na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN deckId TO deck_id;
-- Renomear coluna isCorrect para is_correct na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN isCorrect TO is_correct;
-- Renomear coluna responseTime para response_time na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN responseTime TO response_time;
-- Renomear coluna attemptNumber para attempt_number na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN attemptNumber TO attempt_number;
-- Renomear coluna sessionId para session_id na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN sessionId TO session_id;
-- Renomear coluna answeredAt para answered_at na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN answeredAt TO answered_at;
-- Renomear coluna createdAt para created_at na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela user_answers
ALTER TABLE public.user_answers RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela userPlans para user_plans
ALTER TABLE public.userPlans RENAME TO user_plans;

-- Renomear coluna userId para user_id na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN userId TO user_id;
-- Renomear coluna planId para plan_id na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN planId TO plan_id;
-- Renomear coluna startDate para start_date na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN startDate TO start_date;
-- Renomear coluna endDate para end_date na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN endDate TO end_date;
-- Renomear coluna lastPaymentId para last_payment_id na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN lastPaymentId TO last_payment_id;
-- Renomear coluna paymentMethod para payment_method na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN paymentMethod TO payment_method;
-- Renomear coluna autoRenew para auto_renew na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN autoRenew TO auto_renew;
-- Renomear coluna createdAt para created_at na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna cancellationReason para cancellation_reason na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN cancellationReason TO cancellation_reason;
-- Renomear coluna cancelledAt para cancelled_at na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN cancelledAt TO cancelled_at;
-- Renomear coluna nextBillingDate para next_billing_date na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN nextBillingDate TO next_billing_date;
-- Renomear coluna trialEndsAt para trial_ends_at na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN trialEndsAt TO trial_ends_at;

-- Renomear tabela userProfiles para user_profiles
ALTER TABLE public.userProfiles RENAME TO user_profiles;

-- Renomear coluna userId para user_id na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN userId TO user_id;
-- Renomear coluna firstName para first_name na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN firstName TO first_name;
-- Renomear coluna lastName para last_name na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN lastName TO last_name;
-- Renomear coluna dateOfBirth para date_of_birth na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN dateOfBirth TO date_of_birth;
-- Renomear coluna phoneNumber para phone_number na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN phoneNumber TO phone_number;
-- Renomear coluna experienceLevel para experience_level na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN experienceLevel TO experience_level;
-- Renomear coluna socialLinks para social_links na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN socialLinks TO social_links;
-- Renomear coluna profileVisibility para profile_visibility na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN profileVisibility TO profile_visibility;
-- Renomear coluna emailNotifications para email_notifications na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN emailNotifications TO email_notifications;
-- Renomear coluna pushNotifications para push_notifications na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN pushNotifications TO push_notifications;
-- Renomear coluna studyReminders para study_reminders na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN studyReminders TO study_reminders;
-- Renomear coluna weeklyReports para weekly_reports na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN weeklyReports TO weekly_reports;
-- Renomear coluna createdAt para created_at na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela user_profiles
ALTER TABLE public.user_profiles RENAME COLUMN updatedAt TO updated_at;

-- Renomear tabela userStatistics para user_statistics
ALTER TABLE public.userStatistics RENAME TO user_statistics;

-- Renomear coluna userId para user_id na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN userId TO user_id;
-- Renomear coluna totalQuestionsAnswered para total_questions_answered na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN totalQuestionsAnswered TO total_questions_answered;
-- Renomear coluna correctAnswers para correct_answers na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN correctAnswers TO correct_answers;
-- Renomear coluna overallAccuracy para overall_accuracy na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN overallAccuracy TO overall_accuracy;
-- Renomear coluna studyTimeAnalysis para study_time_analysis na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN studyTimeAnalysis TO study_time_analysis;
-- Renomear coluna learningMetrics para learning_metrics na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN learningMetrics TO learning_metrics;
-- Renomear coluna streakData para streak_data na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN streakData TO streak_data;
-- Renomear coluna examMetrics para exam_metrics na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN examMetrics TO exam_metrics;
-- Renomear coluna filterStatistics para filter_statistics na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN filterStatistics TO filter_statistics;
-- Renomear coluna peerComparison para peer_comparison na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN peerComparison TO peer_comparison;
-- Renomear coluna currentSession para current_session na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN currentSession TO current_session;
-- Renomear coluna lastCalculated para last_calculated na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN lastCalculated TO last_calculated;
-- Renomear coluna createdAt para created_at na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna incorrectAnswers para incorrect_answers na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN incorrectAnswers TO incorrect_answers;
-- Renomear coluna totalTime para total_time na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN totalTime TO total_time;
-- Renomear coluna averageTime para average_time na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN averageTime TO average_time;
-- Renomear coluna accuracyPerFilter para accuracy_per_filter na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN accuracyPerFilter TO accuracy_per_filter;
-- Renomear coluna studyTimePerDay para study_time_per_day na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN studyTimePerDay TO study_time_per_day;
-- Renomear coluna strongestFilters para strongest_filters na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN strongestFilters TO strongest_filters;
-- Renomear coluna weakestFilters para weakest_filters na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN weakestFilters TO weakest_filters;
-- Renomear coluna improvementAreas para improvement_areas na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN improvementAreas TO improvement_areas;
-- Renomear coluna simulatedExamsTaken para simulated_exams_taken na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN simulatedExamsTaken TO simulated_exams_taken;
-- Renomear coluna lastActivityDate para last_activity_date na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN lastActivityDate TO last_activity_date;
-- Renomear coluna streakDays para streak_days na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN streakDays TO streak_days;
-- Renomear coluna totalQuestions para total_questions na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN totalQuestions TO total_questions;
-- Renomear coluna questionsPerDay para questions_per_day na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN questionsPerDay TO questions_per_day;
-- Renomear coluna accuracyPerDay para accuracy_per_day na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN accuracyPerDay TO accuracy_per_day;
-- Renomear coluna lastStudyDate para last_study_date na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN lastStudyDate TO last_study_date;
-- Renomear coluna lastActivityAt para last_activity_at na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN lastActivityAt TO last_activity_at;
-- Renomear coluna accuracyPerDifficulty para accuracy_per_difficulty na tabela user_statistics
ALTER TABLE public.user_statistics RENAME COLUMN accuracyPerDifficulty TO accuracy_per_difficulty;

-- Renomear coluna userId para user_id na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN userId TO user_id;
-- Renomear coluna planId para plan_id na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN planId TO plan_id;
-- Renomear coluna startedAt para started_at na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN startedAt TO started_at;
-- Renomear coluna endsAt para ends_at na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN endsAt TO ends_at;
-- Renomear coluna paymentId para payment_id na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN paymentId TO payment_id;
-- Renomear coluna paymentMethod para payment_method na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN paymentMethod TO payment_method;
-- Renomear coluna autoRenew para auto_renew na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN autoRenew TO auto_renew;
-- Renomear coluna createdAt para created_at na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN createdAt TO created_at;
-- Renomear coluna updatedAt para updated_at na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN updatedAt TO updated_at;
-- Renomear coluna cancellationReason para cancellation_reason na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN cancellationReason TO cancellation_reason;
-- Renomear coluna cancelledAt para cancelled_at na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN cancelledAt TO cancelled_at;
-- Renomear coluna startDate para start_date na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN startDate TO start_date;
-- Renomear coluna endDate para end_date na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN endDate TO end_date;
-- Renomear coluna lastPaymentId para last_payment_id na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN lastPaymentId TO last_payment_id;
-- Renomear coluna nextBillingDate para next_billing_date na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN nextBillingDate TO next_billing_date;
-- Renomear coluna trialEndsAt para trial_ends_at na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN trialEndsAt TO trial_ends_at;
-- Renomear coluna cancelReason para cancel_reason na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN cancelReason TO cancel_reason;
-- Renomear coluna lastNotificationDate para last_notification_date na tabela user_plans
ALTER TABLE public.user_plans RENAME COLUMN lastNotificationDate TO last_notification_date;

-- Renomear coluna userId para user_id na tabela user_topic_performances
ALTER TABLE public.user_topic_performances RENAME COLUMN userId TO user_id;
-- Renomear coluna subFilterId para sub_filter_id na tabela user_topic_performances
ALTER TABLE public.user_topic_performances RENAME COLUMN subFilterId TO sub_filter_id;
-- Renomear coluna createdAt para created_at na tabela user_topic_performances
ALTER TABLE public.user_topic_performances RENAME COLUMN createdAt TO created_at;
-- Renomear coluna totalTimeSpentSeconds para total_time_spent_seconds na tabela user_topic_performances
ALTER TABLE public.user_topic_performances RENAME COLUMN totalTimeSpentSeconds TO total_time_spent_seconds;
-- Renomear coluna lastAnsweredAt para last_answered_at na tabela user_topic_performances
ALTER TABLE public.user_topic_performances RENAME COLUMN lastAnsweredAt TO last_answered_at;
-- Renomear coluna totalQuestionsAnswered para total_questions_answered na tabela user_topic_performances
ALTER TABLE public.user_topic_performances RENAME COLUMN totalQuestionsAnswered TO total_questions_answered;
-- Renomear coluna correctAnswers para correct_answers na tabela user_topic_performances
ALTER TABLE public.user_topic_performances RENAME COLUMN correctAnswers TO correct_answers;
-- Renomear coluna updatedAt para updated_at na tabela user_topic_performances
ALTER TABLE public.user_topic_performances RENAME COLUMN updatedAt TO updated_at;

-- Renomear coluna displayName para display_name na tabela users
ALTER TABLE public.users RENAME COLUMN displayName TO display_name;
-- Renomear coluna photoURL para photo_u_r_l na tabela users
ALTER TABLE public.users RENAME COLUMN photoURL TO photo_u_r_l;
-- Renomear coluna usernameSlug para username_slug na tabela users
ALTER TABLE public.users RENAME COLUMN usernameSlug TO username_slug;
-- Renomear coluna createdAt para created_at na tabela users
ALTER TABLE public.users RENAME COLUMN createdAt TO created_at;
-- Renomear coluna lastLogin para last_login na tabela users
ALTER TABLE public.users RENAME COLUMN lastLogin TO last_login;
-- Renomear coluna masteredFlashcards para mastered_flashcards na tabela users
ALTER TABLE public.users RENAME COLUMN masteredFlashcards TO mastered_flashcards;
-- Renomear coluna totalDecks para total_decks na tabela users
ALTER TABLE public.users RENAME COLUMN totalDecks TO total_decks;
-- Renomear coluna totalFlashcards para total_flashcards na tabela users
ALTER TABLE public.users RENAME COLUMN totalFlashcards TO total_flashcards;
-- Renomear coluna activeFlashcards para active_flashcards na tabela users
ALTER TABLE public.users RENAME COLUMN activeFlashcards TO active_flashcards;
-- Renomear coluna updatedAt para updated_at na tabela users
ALTER TABLE public.users RENAME COLUMN updatedAt TO updated_at;