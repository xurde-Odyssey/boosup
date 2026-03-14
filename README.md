 BookKeep Pro is a bookkeeping system for a manufacturing business that records sales, purchases, vendors,
  staff, products, expenses, and payment collections in Supabase. It is built for a non-inventory workflow
  where finished products are sold, raw goods are purchased, and business logic is centered around
  receivables, payables, and staff payments.

  What Is Currently Working

  - Dashboard
      - total sales, total purchases, net profit, outstanding payables
      - sales vs purchases chart
      - expense breakdown
      - top customers
      - top sales items
      - quick links for Add Sales and Add Purchase
  - Sales
      - create and update sales invoices
      - multiple sales items for one customer
      - item-level 13% VAT option
      - partial, paid, pending, overdue payment handling
      - transaction history for received payments
      - sales search
      - sales sorting by name, amount, and status
      - recent invoices table with total, paid, remaining, status, date
      - delete confirmation
  - Purchases
      - create and update purchase bills
      - supports saved vendor or one-time typed vendor
      - partial payment ledger logic
      - purchase payment history per bill
      - recent payments section on purchases overview
      - recent expenses section
      - delete confirmation
  - Vendors
      - dedicated vendor section in sidebar
      - create and update vendor profiles
      - vendor payables table
      - vendor profiles table
      - vendor ledger page
      - purchase history by vendor
      - payment history by vendor
      - bill-wise payment history inside vendor purchase history
  - Products
      - product master management
      - used for sales item selection
      - create, update, delete
  - Staff
      - create staff profiles
      - total salary, advance salary, remaining salary logic
      - create, update, delete
  - UX
      - animated action notices for create, update, delete
      - pointer cursor on clickable controls
      - current date auto-filled where needed
      - separate create pages for sales, purchases, vendors, expenses
  - Database
      - Supabase integration is wired
      - schema and RLS policies are included in supabase/schema.sql
