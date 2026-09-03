-- OAuth users need a session before they finish the lightweight profile setup.
-- Existing profiles remain unchanged; new OAuth profiles may temporarily have no name.
ALTER TABLE public.profiles
  ALTER COLUMN full_name DROP NOT NULL;
