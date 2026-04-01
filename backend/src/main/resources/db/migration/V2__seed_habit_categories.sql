INSERT INTO habit_categories (name, description, icon)
VALUES
  ('Hydration', 'Water and healthy drinking habits', 'droplets'),
  ('Activity', 'Walking, workouts and daily movement', 'activity'),
  ('Sleep', 'Sleep routine and recovery habits', 'moon'),
  ('Nutrition', 'Healthy eating and meal routines', 'apple'),
  ('Mindfulness', 'Meditation, breathing and mental wellness', 'sparkles')
ON CONFLICT (name) DO NOTHING;