-- Add is_anon column to profiles table for Anon mode
ALTER TABLE public.profiles ADD COLUMN is_anon boolean NOT NULL DEFAULT false;