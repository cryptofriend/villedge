-- Add username column to webauthn_credentials table
ALTER TABLE public.webauthn_credentials 
ADD COLUMN username TEXT UNIQUE;

-- Create an index on username for faster lookups
CREATE INDEX idx_webauthn_credentials_username ON public.webauthn_credentials(username);