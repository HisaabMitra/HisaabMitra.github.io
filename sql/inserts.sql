-- sql/inserts.sql

-- Pre-populate some dummy customer accounts for testing lookups
INSERT INTO public.accounts (account_no, customer_name, phone_no, current_balance)
VALUES 
('ACC1001', 'John Doe', '9876543210', 5000.00),
('ACC1002', 'Jane Smith', '8765432109', 12500.50),
('ACC1003', 'Alex Rivera', '7654321098', 350.00)
ON CONFLICT (account_no) DO NOTHING;
