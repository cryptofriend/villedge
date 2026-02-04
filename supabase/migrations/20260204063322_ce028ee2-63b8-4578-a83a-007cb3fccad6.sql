-- Add bot_token_secret_name column to villages table
ALTER TABLE public.villages 
ADD COLUMN bot_token_secret_name text;

-- Pre-populate existing villages with their bot tokens
UPDATE public.villages SET bot_token_secret_name = 'TELEGRAM_BOT_TOKEN' WHERE id = 'proof-of-retreat';
UPDATE public.villages SET bot_token_secret_name = 'PROTOVILLE_BOT_TOKEN' WHERE id = 'protoville';

-- Add comment for clarity
COMMENT ON COLUMN public.villages.bot_token_secret_name IS 'Name of the secret containing this village''s Telegram bot token';