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
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Slept well', 'Moon', 0 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Poor sleep', 'CloudRain', 1 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Nap', 'Cloud', 2 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Overslept', 'AlarmClock', 3 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Interrupted sleep', 'Wind', 4 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Early wake-up', 'Sunrise', 5 FROM `groups` WHERE `name` = 'Sleep';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Physical Activity', '#84cc16', 'Dumbbell', 2, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Walking', 'Footprints', 0 FROM `groups` WHERE `name` = 'Physical Activity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Running', 'PersonStanding', 1 FROM `groups` WHERE `name` = 'Physical Activity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Cycling', 'Bike', 2 FROM `groups` WHERE `name` = 'Physical Activity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Gym', 'Dumbbell', 3 FROM `groups` WHERE `name` = 'Physical Activity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Team sport', 'Trophy', 4 FROM `groups` WHERE `name` = 'Physical Activity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Yoga', 'Leaf', 5 FROM `groups` WHERE `name` = 'Physical Activity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Stretching', 'MoveHorizontal', 6 FROM `groups` WHERE `name` = 'Physical Activity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Outdoor activity', 'TreePine', 7 FROM `groups` WHERE `name` = 'Physical Activity';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Physical labor', 'Hammer', 8 FROM `groups` WHERE `name` = 'Physical Activity';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Social', '#3b82f6', 'Users', 3, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Time with partner', 'Heart', 0 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Family time', 'Home', 1 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Friends', 'Users', 2 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Group activity', 'UserPlus', 3 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Meaningful conversation', 'MessageCircle', 4 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Casual socializing', 'Coffee', 5 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Networking', 'Network', 6 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Social conflict', 'Zap', 7 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Social rejection', 'UserMinus', 8 FROM `groups` WHERE `name` = 'Social';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Romance', '#f43f5e', 'Heart', 4, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Quality time with partner', 'Heart', 0 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Date night', 'Sparkles', 1 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Physical affection', 'Handshake', 2 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Meaningful conversation', 'MessageCircle', 3 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Conflict/argument', 'Zap', 4 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Feeling connected', 'Link', 5 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Feeling distant', 'Cloud', 6 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Long-distance moment', 'Phone', 7 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Acts of service', 'Gift', 8 FROM `groups` WHERE `name` = 'Romance';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Work & Study', '#f59e0b', 'Briefcase', 5, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Deep work', 'Target', 0 FROM `groups` WHERE `name` = 'Work & Study';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Meetings', 'Users', 1 FROM `groups` WHERE `name` = 'Work & Study';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Administrative tasks', 'ClipboardList', 2 FROM `groups` WHERE `name` = 'Work & Study';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Learning', 'GraduationCap', 3 FROM `groups` WHERE `name` = 'Work & Study';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Exam/study session', 'BookOpen', 4 FROM `groups` WHERE `name` = 'Work & Study';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Deadline pressure', 'Clock', 5 FROM `groups` WHERE `name` = 'Work & Study';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Overtime', 'Timer', 6 FROM `groups` WHERE `name` = 'Work & Study';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Job searching', 'Briefcase', 7 FROM `groups` WHERE `name` = 'Work & Study';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Food & Drink', '#f97316', 'Utensils', 6, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Home-cooked meal', 'Utensils', 0 FROM `groups` WHERE `name` = 'Food & Drink';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Restaurant', 'UtensilsCrossed', 1 FROM `groups` WHERE `name` = 'Food & Drink';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Healthy meal', 'Apple', 2 FROM `groups` WHERE `name` = 'Food & Drink';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Fast food', 'Pizza', 3 FROM `groups` WHERE `name` = 'Food & Drink';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Alcohol', 'Wine', 4 FROM `groups` WHERE `name` = 'Food & Drink';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Excess caffeine', 'Coffee', 5 FROM `groups` WHERE `name` = 'Food & Drink';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Skipped meal', 'Clock', 6 FROM `groups` WHERE `name` = 'Food & Drink';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Hydrated well', 'Droplets', 7 FROM `groups` WHERE `name` = 'Food & Drink';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Self-Care', '#10b981', 'Leaf', 7, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Meditation', 'Brain', 0 FROM `groups` WHERE `name` = 'Self-Care';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Journaling', 'Notebook', 1 FROM `groups` WHERE `name` = 'Self-Care';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Therapy', 'MessageCircle', 2 FROM `groups` WHERE `name` = 'Self-Care';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Personal grooming', 'Sparkles', 3 FROM `groups` WHERE `name` = 'Self-Care';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Bath/shower', 'Droplets', 4 FROM `groups` WHERE `name` = 'Self-Care';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Mindfulness', 'Leaf', 5 FROM `groups` WHERE `name` = 'Self-Care';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Medical appointment', 'Stethoscope', 6 FROM `groups` WHERE `name` = 'Self-Care';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Medication taken', 'Pill', 7 FROM `groups` WHERE `name` = 'Self-Care';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Emotional Regulation', '#ec4899', 'Brain', 8, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Breathing exercise', 'Wind', 0 FROM `groups` WHERE `name` = 'Emotional Regulation';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Grounding', 'Leaf', 1 FROM `groups` WHERE `name` = 'Emotional Regulation';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Emotional journaling', 'Notebook', 2 FROM `groups` WHERE `name` = 'Emotional Regulation';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Cried/released emotions', 'Droplets', 3 FROM `groups` WHERE `name` = 'Emotional Regulation';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Set a boundary', 'Shield', 4 FROM `groups` WHERE `name` = 'Emotional Regulation';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Asked for help', 'HelpCircle', 5 FROM `groups` WHERE `name` = 'Emotional Regulation';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Took a break', 'PauseCircle', 6 FROM `groups` WHERE `name` = 'Emotional Regulation';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Suppressed emotions', 'Lock', 7 FROM `groups` WHERE `name` = 'Emotional Regulation';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Emotional outburst', 'Flame', 8 FROM `groups` WHERE `name` = 'Emotional Regulation';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Leisure & Entertainment', '#06b6d4', 'Tv', 9, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Watching TV', 'Tv', 0 FROM `groups` WHERE `name` = 'Leisure & Entertainment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Movie', 'Film', 1 FROM `groups` WHERE `name` = 'Leisure & Entertainment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Gaming', 'Gamepad2', 2 FROM `groups` WHERE `name` = 'Leisure & Entertainment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Reading', 'BookOpen', 3 FROM `groups` WHERE `name` = 'Leisure & Entertainment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Music', 'Music', 4 FROM `groups` WHERE `name` = 'Leisure & Entertainment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Browsing internet', 'Globe', 5 FROM `groups` WHERE `name` = 'Leisure & Entertainment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Social media', 'Phone', 6 FROM `groups` WHERE `name` = 'Leisure & Entertainment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Podcast', 'Headphones', 7 FROM `groups` WHERE `name` = 'Leisure & Entertainment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Relaxing', 'Sofa', 8 FROM `groups` WHERE `name` = 'Leisure & Entertainment';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Creativity & Hobbies', '#8b5cf6', 'Palette', 10, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Writing', 'Pencil', 0 FROM `groups` WHERE `name` = 'Creativity & Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Drawing', 'Brush', 1 FROM `groups` WHERE `name` = 'Creativity & Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Photography', 'Camera', 2 FROM `groups` WHERE `name` = 'Creativity & Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Crafting', 'Scissors', 3 FROM `groups` WHERE `name` = 'Creativity & Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Cooking', 'Utensils', 4 FROM `groups` WHERE `name` = 'Creativity & Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Music practice', 'Music', 5 FROM `groups` WHERE `name` = 'Creativity & Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Building projects', 'Hammer', 6 FROM `groups` WHERE `name` = 'Creativity & Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Collecting', 'Package', 7 FROM `groups` WHERE `name` = 'Creativity & Hobbies';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Gardening', 'Flower2', 8 FROM `groups` WHERE `name` = 'Creativity & Hobbies';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Nature & Environment', '#22c55e', 'TreePine', 11, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Time outdoors', 'Sun', 0 FROM `groups` WHERE `name` = 'Nature & Environment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Park visit', 'TreePine', 1 FROM `groups` WHERE `name` = 'Nature & Environment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Beach', 'Waves', 2 FROM `groups` WHERE `name` = 'Nature & Environment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Hiking', 'Mountain', 3 FROM `groups` WHERE `name` = 'Nature & Environment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Good weather', 'CloudSun', 4 FROM `groups` WHERE `name` = 'Nature & Environment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Bad weather', 'CloudRain', 5 FROM `groups` WHERE `name` = 'Nature & Environment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Sunlight exposure', 'Sunrise', 6 FROM `groups` WHERE `name` = 'Nature & Environment';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Travel', 'Plane', 7 FROM `groups` WHERE `name` = 'Nature & Environment';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`) VALUES ('Responsibilities & Life Admin', '#78716c', 'Home', 12, 'category');
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Housework', 'Home', 0 FROM `groups` WHERE `name` = 'Responsibilities & Life Admin';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Cleaning', 'Sparkles', 1 FROM `groups` WHERE `name` = 'Responsibilities & Life Admin';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Shopping', 'ShoppingBag', 2 FROM `groups` WHERE `name` = 'Responsibilities & Life Admin';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Errands', 'MapPin', 3 FROM `groups` WHERE `name` = 'Responsibilities & Life Admin';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Financial tasks', 'DollarSign', 4 FROM `groups` WHERE `name` = 'Responsibilities & Life Admin';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Childcare', 'Baby', 5 FROM `groups` WHERE `name` = 'Responsibilities & Life Admin';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Maintenance', 'Wrench', 6 FROM `groups` WHERE `name` = 'Responsibilities & Life Admin';
--> statement-breakpoint
INSERT INTO `group_options` (`group_id`, `name`, `icon`, `sort_order`) SELECT `id`, 'Bureaucracy', 'FileText', 7 FROM `groups` WHERE `name` = 'Responsibilities & Life Admin';
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`, `slider_min`, `slider_max`, `slider_labels`) VALUES ('Sleep Quality', '#6366f1', 'Moon', 13, 'slider', 1, 5, '["Terrible","Poor","Okay","Good","Great"]');
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`, `slider_min`, `slider_max`, `slider_labels`) VALUES ('Positivity', '#eab308', 'Sparkles', 14, 'slider', 1, 5, '["Very low","Low","Neutral","High","Very high"]');
--> statement-breakpoint
INSERT INTO `groups` (`name`, `color`, `icon`, `sort_order`, `type`, `slider_min`, `slider_max`, `slider_labels`) VALUES ('Overwhelm', '#ef4444', 'Zap', 15, 'slider', 1, 5, '["Minimal","Mild","Moderate","High","Overwhelming"]');
