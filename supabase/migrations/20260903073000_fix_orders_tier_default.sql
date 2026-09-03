-- Legacy orders.tier is required by the live schema, but the current
-- employer publish flow does not expose a tier choice. Keep a neutral
-- default so publishing cannot fail because of an obsolete required field.
ALTER TABLE public.orders
  ALTER COLUMN tier SET DEFAULT 'standard';

UPDATE public.orders
SET tier = 'standard'
WHERE tier IS NULL;
