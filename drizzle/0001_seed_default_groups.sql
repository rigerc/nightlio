INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Emotions', '#ec4899', 'Heart', 0, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'happy', 'Smile', 0 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'excited', 'Sparkles', 1 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'grateful', 'Heart', 2 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'content', 'Smile', 3 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'calm', 'Leaf', 4 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'hopeful', 'Sun', 5 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'proud', 'Trophy', 6 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'loved', 'Heart', 7 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'unsure', 'Meh', 8 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'bored', 'Meh', 9 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'lonely', 'CloudRain', 10 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'anxious', 'Wind', 11 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'irritated', 'ZapOff', 12 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'angry', 'Flame', 13 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'stressed', 'ZapOff', 14 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'sad', 'Frown', 15 FROM `groups` WHERE `name` = 'Emotions';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Sleep', '#6366f1', 'Moon', 1, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'well-rested', 'Moon', 0 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'refreshed', 'Sun', 1 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'napped', 'Cloud', 2 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'relaxed', NULL, 3 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'downtime', NULL, 4 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'tired', 'ZapOff', 5 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'groggy', 'Cloud', 6 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'exhausted', 'Frown', 7 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'restless', 'Wind', 8 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Productivity', '#f59e0b', 'Target', 2, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'focused', 'Target', 0 FROM `groups` WHERE `name` = 'Productivity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'motivated', 'Zap', 1 FROM `groups` WHERE `name` = 'Productivity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'accomplished', 'CircleCheck', 2 FROM `groups` WHERE `name` = 'Productivity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'productive', 'Briefcase', 3 FROM `groups` WHERE `name` = 'Productivity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'creative', 'Lightbulb', 4 FROM `groups` WHERE `name` = 'Productivity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'busy', 'Clock', 5 FROM `groups` WHERE `name` = 'Productivity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'distracted', 'Phone', 6 FROM `groups` WHERE `name` = 'Productivity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'scattered', 'Wind', 7 FROM `groups` WHERE `name` = 'Productivity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'overwhelmed', 'CloudRain', 8 FROM `groups` WHERE `name` = 'Productivity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'low-energy', 'ZapOff', 9 FROM `groups` WHERE `name` = 'Productivity';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Health', '#10b981', 'Activity', 3, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'energetic', 'Zap', 0 FROM `groups` WHERE `name` = 'Health';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'active', 'Activity', 1 FROM `groups` WHERE `name` = 'Health';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'healthy', 'Heart', 2 FROM `groups` WHERE `name` = 'Health';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'sick', 'Pill', 3 FROM `groups` WHERE `name` = 'Health';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'sore', 'Dumbbell', 4 FROM `groups` WHERE `name` = 'Health';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'sluggish', 'ZapOff', 5 FROM `groups` WHERE `name` = 'Health';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Social', '#3b82f6', 'Users', 4, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'connected', 'Users', 0 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'social', 'MessageCircle', 1 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'supported', 'ThumbsUp', 2 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'family time', NULL, 3 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'quality time', NULL, 4 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'isolated', 'Cloud', 5 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'missing someone', 'Heart', 6 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Romance', '#f43f5e', 'Heart', 5, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'loved', 'Heart', 0 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'affectionate', 'Heart', 1 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'romantic', 'Sparkles', 2 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'intimate', 'Heart', 3 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'distant', 'Cloud', 4 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'heartbroken', 'Frown', 5 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'longing', 'Moon', 6 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Sports', '#84cc16', 'Dumbbell', 6, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'worked out', 'Dumbbell', 0 FROM `groups` WHERE `name` = 'Sports';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'ran', 'Footprints', 1 FROM `groups` WHERE `name` = 'Sports';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'cycled', 'Bike', 2 FROM `groups` WHERE `name` = 'Sports';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'walked', 'Footprints', 3 FROM `groups` WHERE `name` = 'Sports';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'stretched', 'PersonStanding', 4 FROM `groups` WHERE `name` = 'Sports';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'yoga', 'Leaf', 5 FROM `groups` WHERE `name` = 'Sports';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'skipped workout', 'ZapOff', 6 FROM `groups` WHERE `name` = 'Sports';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'sedentary', 'Tv', 7 FROM `groups` WHERE `name` = 'Sports';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Mental', '#8b5cf6', 'Brain', 7, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'meditated', 'Brain', 0 FROM `groups` WHERE `name` = 'Mental';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'journaled', 'Pencil', 1 FROM `groups` WHERE `name` = 'Mental';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'mindful', 'Leaf', 2 FROM `groups` WHERE `name` = 'Mental';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'therapy', 'MessageCircle', 3 FROM `groups` WHERE `name` = 'Mental';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'racing thoughts', 'Wind', 4 FROM `groups` WHERE `name` = 'Mental';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'burned out', 'Flame', 5 FROM `groups` WHERE `name` = 'Mental';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Chores', '#78716c', 'Home', 8, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'cleaned', 'Sparkles', 0 FROM `groups` WHERE `name` = 'Chores';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'cooked', 'Utensils', 1 FROM `groups` WHERE `name` = 'Chores';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'groceries', 'ShoppingBag', 2 FROM `groups` WHERE `name` = 'Chores';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'laundry', 'Cloud', 3 FROM `groups` WHERE `name` = 'Chores';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'tidied', 'Home', 4 FROM `groups` WHERE `name` = 'Chores';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'behind on chores', 'Clock', 5 FROM `groups` WHERE `name` = 'Chores';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Hobbies', '#06b6d4', 'Sparkles', 9, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'read', 'BookOpen', 0 FROM `groups` WHERE `name` = 'Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'gamed', 'Gamepad2', 1 FROM `groups` WHERE `name` = 'Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'creative', 'Lightbulb', 2 FROM `groups` WHERE `name` = 'Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'music', 'Music', 3 FROM `groups` WHERE `name` = 'Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'art', 'Pencil', 4 FROM `groups` WHERE `name` = 'Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'crafts', 'Sparkles', 5 FROM `groups` WHERE `name` = 'Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'outdoor', 'TreePine', 6 FROM `groups` WHERE `name` = 'Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'watched a show/movie', NULL, 7 FROM `groups` WHERE `name` = 'Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'learned something new', 'Lightbulb', 8 FROM `groups` WHERE `name` = 'Hobbies';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Food', '#f97316', 'Utensils', 10, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'ate well', 'Apple', 0 FROM `groups` WHERE `name` = 'Food';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'balanced meals', 'Apple', 1 FROM `groups` WHERE `name` = 'Food';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'cooked at home', 'Utensils', 2 FROM `groups` WHERE `name` = 'Food';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'skipped meals', 'Clock', 3 FROM `groups` WHERE `name` = 'Food';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'junk food', 'Pizza', 4 FROM `groups` WHERE `name` = 'Food';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'overate', 'Utensils', 5 FROM `groups` WHERE `name` = 'Food';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'alcohol', 'Coffee', 6 FROM `groups` WHERE `name` = 'Food';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Bad Habits', '#64748b', 'ZapOff', 11, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'smoked', 'Wind', 0 FROM `groups` WHERE `name` = 'Bad Habits';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'drank too much', 'Coffee', 1 FROM `groups` WHERE `name` = 'Bad Habits';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'late night screen time', 'Phone', 2 FROM `groups` WHERE `name` = 'Bad Habits';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'skipped meds', 'Pill', 3 FROM `groups` WHERE `name` = 'Bad Habits';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'no exercise', 'ZapOff', 4 FROM `groups` WHERE `name` = 'Bad Habits';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'too much caffeine', 'Coffee', 5 FROM `groups` WHERE `name` = 'Bad Habits';
