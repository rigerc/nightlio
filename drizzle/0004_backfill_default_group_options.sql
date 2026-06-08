INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'happy', 'Smile', 0 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'happy');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'excited', 'Sparkles', 1 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'excited');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'grateful', 'Heart', 2 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'grateful');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'content', 'Smile', 3 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'content');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'calm', 'Leaf', 4 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'calm');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'hopeful', 'Sun', 5 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'hopeful');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'proud', 'Trophy', 6 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'proud');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'loved', 'Heart', 7 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'loved');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'unsure', 'Meh', 8 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'unsure');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'bored', 'Meh', 9 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'bored');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'lonely', 'CloudRain', 10 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'lonely');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'anxious', 'Wind', 11 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'anxious');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'irritated', 'ZapOff', 12 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'irritated');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'angry', 'Flame', 13 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'angry');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'stressed', 'ZapOff', 14 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'stressed');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'sad', 'Frown', 15 FROM `groups` WHERE `name` = 'Emotions' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'sad');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'well-rested', 'Moon', 0 FROM `groups` WHERE `name` = 'Sleep' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'well-rested');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'refreshed', 'Sun', 1 FROM `groups` WHERE `name` = 'Sleep' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'refreshed');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'napped', 'Cloud', 2 FROM `groups` WHERE `name` = 'Sleep' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'napped');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'relaxed', NULL, 3 FROM `groups` WHERE `name` = 'Sleep' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'relaxed');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'downtime', NULL, 4 FROM `groups` WHERE `name` = 'Sleep' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'downtime');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'tired', 'ZapOff', 5 FROM `groups` WHERE `name` = 'Sleep' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'tired');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'groggy', 'Cloud', 6 FROM `groups` WHERE `name` = 'Sleep' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'groggy');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'exhausted', 'Frown', 7 FROM `groups` WHERE `name` = 'Sleep' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'exhausted');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'restless', 'Wind', 8 FROM `groups` WHERE `name` = 'Sleep' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'restless');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'focused', 'Target', 0 FROM `groups` WHERE `name` = 'Productivity' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'focused');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'motivated', 'Zap', 1 FROM `groups` WHERE `name` = 'Productivity' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'motivated');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'accomplished', 'CircleCheck', 2 FROM `groups` WHERE `name` = 'Productivity' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'accomplished');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'productive', 'Briefcase', 3 FROM `groups` WHERE `name` = 'Productivity' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'productive');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'creative', 'Lightbulb', 4 FROM `groups` WHERE `name` = 'Productivity' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'creative');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'busy', 'Clock', 5 FROM `groups` WHERE `name` = 'Productivity' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'busy');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'distracted', 'Phone', 6 FROM `groups` WHERE `name` = 'Productivity' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'distracted');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'scattered', 'Wind', 7 FROM `groups` WHERE `name` = 'Productivity' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'scattered');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'overwhelmed', 'CloudRain', 8 FROM `groups` WHERE `name` = 'Productivity' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'overwhelmed');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'low-energy', 'ZapOff', 9 FROM `groups` WHERE `name` = 'Productivity' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'low-energy');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'energetic', 'Zap', 0 FROM `groups` WHERE `name` = 'Health' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'energetic');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'active', 'Activity', 1 FROM `groups` WHERE `name` = 'Health' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'active');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'healthy', 'Heart', 2 FROM `groups` WHERE `name` = 'Health' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'healthy');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'sick', 'Pill', 3 FROM `groups` WHERE `name` = 'Health' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'sick');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'sore', 'Dumbbell', 4 FROM `groups` WHERE `name` = 'Health' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'sore');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'sluggish', 'ZapOff', 5 FROM `groups` WHERE `name` = 'Health' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'sluggish');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'connected', 'Users', 0 FROM `groups` WHERE `name` = 'Social' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'connected');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'social', 'MessageCircle', 1 FROM `groups` WHERE `name` = 'Social' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'social');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'supported', 'ThumbsUp', 2 FROM `groups` WHERE `name` = 'Social' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'supported');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'family time', NULL, 3 FROM `groups` WHERE `name` = 'Social' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'family time');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'quality time', NULL, 4 FROM `groups` WHERE `name` = 'Social' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'quality time');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'isolated', 'Cloud', 5 FROM `groups` WHERE `name` = 'Social' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'isolated');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'missing someone', 'Heart', 6 FROM `groups` WHERE `name` = 'Social' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'missing someone');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'loved', 'Heart', 0 FROM `groups` WHERE `name` = 'Romance' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'loved');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'affectionate', 'Heart', 1 FROM `groups` WHERE `name` = 'Romance' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'affectionate');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'romantic', 'Sparkles', 2 FROM `groups` WHERE `name` = 'Romance' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'romantic');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'intimate', 'Heart', 3 FROM `groups` WHERE `name` = 'Romance' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'intimate');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'distant', 'Cloud', 4 FROM `groups` WHERE `name` = 'Romance' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'distant');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'heartbroken', 'Frown', 5 FROM `groups` WHERE `name` = 'Romance' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'heartbroken');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'longing', 'Moon', 6 FROM `groups` WHERE `name` = 'Romance' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'longing');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'worked out', 'Dumbbell', 0 FROM `groups` WHERE `name` = 'Sports' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'worked out');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'ran', 'Footprints', 1 FROM `groups` WHERE `name` = 'Sports' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'ran');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'cycled', 'Bike', 2 FROM `groups` WHERE `name` = 'Sports' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'cycled');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'walked', 'Footprints', 3 FROM `groups` WHERE `name` = 'Sports' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'walked');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'stretched', 'PersonStanding', 4 FROM `groups` WHERE `name` = 'Sports' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'stretched');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'yoga', 'Leaf', 5 FROM `groups` WHERE `name` = 'Sports' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'yoga');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'skipped workout', 'ZapOff', 6 FROM `groups` WHERE `name` = 'Sports' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'skipped workout');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'sedentary', 'Tv', 7 FROM `groups` WHERE `name` = 'Sports' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'sedentary');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'meditated', 'Brain', 0 FROM `groups` WHERE `name` = 'Mental' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'meditated');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'journaled', 'Pencil', 1 FROM `groups` WHERE `name` = 'Mental' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'journaled');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'mindful', 'Leaf', 2 FROM `groups` WHERE `name` = 'Mental' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'mindful');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'therapy', 'MessageCircle', 3 FROM `groups` WHERE `name` = 'Mental' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'therapy');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'racing thoughts', 'Wind', 4 FROM `groups` WHERE `name` = 'Mental' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'racing thoughts');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'burned out', 'Flame', 5 FROM `groups` WHERE `name` = 'Mental' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'burned out');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'cleaned', 'Sparkles', 0 FROM `groups` WHERE `name` = 'Chores' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'cleaned');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'cooked', 'Utensils', 1 FROM `groups` WHERE `name` = 'Chores' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'cooked');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'groceries', 'ShoppingBag', 2 FROM `groups` WHERE `name` = 'Chores' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'groceries');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'laundry', 'Cloud', 3 FROM `groups` WHERE `name` = 'Chores' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'laundry');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'tidied', 'Home', 4 FROM `groups` WHERE `name` = 'Chores' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'tidied');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'behind on chores', 'Clock', 5 FROM `groups` WHERE `name` = 'Chores' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'behind on chores');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'read', 'BookOpen', 0 FROM `groups` WHERE `name` = 'Hobbies' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'read');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'gamed', 'Gamepad2', 1 FROM `groups` WHERE `name` = 'Hobbies' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'gamed');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'creative', 'Lightbulb', 2 FROM `groups` WHERE `name` = 'Hobbies' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'creative');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'music', 'Music', 3 FROM `groups` WHERE `name` = 'Hobbies' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'music');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'art', 'Pencil', 4 FROM `groups` WHERE `name` = 'Hobbies' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'art');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'crafts', 'Sparkles', 5 FROM `groups` WHERE `name` = 'Hobbies' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'crafts');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'outdoor', 'TreePine', 6 FROM `groups` WHERE `name` = 'Hobbies' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'outdoor');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'watched a show/movie', NULL, 7 FROM `groups` WHERE `name` = 'Hobbies' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'watched a show/movie');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'learned something new', 'Lightbulb', 8 FROM `groups` WHERE `name` = 'Hobbies' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'learned something new');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'ate well', 'Apple', 0 FROM `groups` WHERE `name` = 'Food' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'ate well');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'balanced meals', 'Apple', 1 FROM `groups` WHERE `name` = 'Food' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'balanced meals');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'cooked at home', 'Utensils', 2 FROM `groups` WHERE `name` = 'Food' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'cooked at home');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'skipped meals', 'Clock', 3 FROM `groups` WHERE `name` = 'Food' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'skipped meals');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'junk food', 'Pizza', 4 FROM `groups` WHERE `name` = 'Food' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'junk food');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'overate', 'Utensils', 5 FROM `groups` WHERE `name` = 'Food' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'overate');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'alcohol', 'Coffee', 6 FROM `groups` WHERE `name` = 'Food' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'alcohol');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'smoked', 'Wind', 0 FROM `groups` WHERE `name` = 'Bad Habits' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'smoked');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'drank too much', 'Coffee', 1 FROM `groups` WHERE `name` = 'Bad Habits' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'drank too much');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'late night screen time', 'Phone', 2 FROM `groups` WHERE `name` = 'Bad Habits' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'late night screen time');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'skipped meds', 'Pill', 3 FROM `groups` WHERE `name` = 'Bad Habits' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'skipped meds');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'no exercise', 'ZapOff', 4 FROM `groups` WHERE `name` = 'Bad Habits' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'no exercise');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'too much caffeine', 'Coffee', 5 FROM `groups` WHERE `name` = 'Bad Habits' AND NOT EXISTS (SELECT 1 FROM `group_options` WHERE `group_options`.`group_id` = `groups`.`id` AND `group_options`.`name` = 'too much caffeine');
--> statement-breakpoint
