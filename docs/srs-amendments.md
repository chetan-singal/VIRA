# VIRA — SRS Amendments (Phase 6)

| # | Section | Amendment |
| --- | --- | --- |
| A1 | §18.3, §22.10, §26, §27 | Cash Bills and Party Bills share one BILL counter; Voucher No. and Payment No. each have their own. Three seed rows, not four. Starting Bill Number seeds BILL. A bill keeps its number for life, so a Cash Bill edited into a Party Bill keeps its original number. (Carried over from Phase 5's known gaps.) |
| A2 | §11, §22.5 | bill.previous_balance — nullable snapshot of the Party's balance before the bill, written on create, edit and restore for Party Bills. Total Due = previous balance + grand total. |
| A3 | §18.3 | A prefix is applied when a number is issued: Cash Bill Prefix for Cash Bills, Party Bill Prefix for Party Bills, Voucher Prefix, Supplier Payment Prefix. No profile or a blank prefix gives the bare number. |
| A4 | §18.3 | First-run setup is refused once any bill, voucher or supplier payment exists. Starting Bill Number and Opening Cash in Hand (with its date) may be changed until the first such record exists (Cash in Hand is moved to match); after that they are refused. |
| A5 | §19.1 | Allowed values: Default Bill Type CASH or PARTY; Date format DD-MM-YYYY, MM-DD-YYYY or YYYY-MM-DD; Theme light or dark; Default focus field lower-case letters and underscores (tightened with the New Bill screen); Default printer free text. |
| A6 | §16.1, §16.4 | Today, This Month and This Year are whole calendar periods. Recent Bills, Payments and Supplier Payments show the latest records overall, deleted ones included and tagged. |
| A7 | §9.2, §14.2 | The Deleted Parties and Deleted Suppliers views list soft-deleted records; each record carries its deleted flag. |