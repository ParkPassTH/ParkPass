/*
  # Create payment methods table

  1. New Tables
    - `payment_methods`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, foreign key to profiles)
      - `type` (payment_method_type enum)
      - `qr_code_url` (text, nullable)
      - `bank_name` (text, nullable)
      - `account_number` (text, nullable)
      - `account_name` (text, nullable)
      - `is_active` (boolean)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
  
  2. Security
    - Enable RLS on `payment_methods` table
    - Add policy for owners to manage their own payment methods
*/

-- Create payment_methods table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type payment_method_type NOT NULL,
  qr_code_url text,
  bank_name text,
  account_number text,
  account_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on owner_id
CREATE INDEX IF NOT EXISTS idx_payment_methods_owner_id ON payment_methods USING btree (owner_id);

-- Enable Row Level Security
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policy for owners to manage their own payment methods
CREATE POLICY "Owners can manage own payment methods" 
  ON payment_methods 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = owner_id);

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_payment_method_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_method_updated_at_trigger
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION update_payment_method_updated_at();