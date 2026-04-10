-- Supabase Database Schema for Meal Prep Buddy
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (linked to auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  city text,
  hometown text,
  taste_tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table profiles enable row level security;

-- Policies for profiles
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Ingredients table
create table if not exists ingredients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  category text default 'other',
  quantity text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on ingredients
alter table ingredients enable row level security;

-- Policies for ingredients
create policy "Users can view own ingredients"
  on ingredients for select
  using (auth.uid() = user_id);

create policy "Users can insert own ingredients"
  on ingredients for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ingredients"
  on ingredients for update
  using (auth.uid() = user_id);

create policy "Users can delete own ingredients"
  on ingredients for delete
  using (auth.uid() = user_id);

-- Recipes history table
create table if not exists recipes_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  input_ingredients text[] not null,
  recommended_recipes jsonb not null,
  shopping_list text[] not null default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on recipes_history
alter table recipes_history enable row level security;

-- Policies for recipes_history
create policy "Users can view own history"
  on recipes_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on recipes_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own history"
  on recipes_history for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists ingredients_user_id_idx on ingredients(user_id);
create index if not exists recipes_history_user_id_idx on recipes_history(user_id);

-- Function to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

-- Trigger to call the function on user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Recipe Feedback Table (用户反馈表)
-- ============================================

create table if not exists recipe_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  recipe_history_id uuid references recipes_history on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5),
  feedback_type text check (feedback_type in ('helpful', 'not_helpful', 'needs_improvement')),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on recipe_feedback
alter table recipe_feedback enable row level security;

-- Policies for recipe_feedback
create policy "Users can view own feedback"
  on recipe_feedback for select
  using (auth.uid() = user_id);

create policy "Users can insert own feedback"
  on recipe_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can update own feedback"
  on recipe_feedback for update
  using (auth.uid() = user_id);

-- Indexes for feedback queries
create index if not exists recipe_feedback_user_id_idx on recipe_feedback(user_id);
create index if not exists recipe_feedback_history_id_idx on recipe_feedback(recipe_history_id);
create index if not exists recipe_feedback_rating_idx on recipe_feedback(rating);
