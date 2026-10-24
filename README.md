# Remix of Remix of Intern CRM (53)

Build a beginner-friendly CRM web application for a Product & Technology Intern.

Project Goal

Create a simple, clean, modern and responsive CRM MVP that helps an intern manage leads, customers, follow-ups and activities from one place.

Do NOT add unnecessary enterprise features or advanced AI. Focus on working CRUD functionality, simple navigation and an easy-to-understand UI.

1. Dashboard

Create a professional dashboard with:

Total Leads

New Leads

Active Follow-ups

Converted Customers

Lost Leads

Recent Leads

Upcoming Follow-ups

Recent Activities

Use clean statistic cards, tables and simple visual indicators.

2. Leads Management

Create a Leads page.

Users should be able to:

Add Lead

Edit Lead

Delete Lead

Search Leads

Filter Leads by Status

View Lead Details

Lead fields:

Full Name

Company Name

Email

Phone Number

Lead Source

Status

Assigned To

Next Follow-up Date

Notes

Created Date

Lead Status options:

New

Contacted

Follow-up

Qualified

Converted

Lost

Use colored status badges and confirmation dialogs for delete actions.

3. Lead Details

Create a detailed page for every lead.

Display:

Contact Information

Company Information

Current Status

Notes

Follow-up History

Activity History

Add these actions:

Edit Lead

Add Note

Schedule Follow-up

Convert to Customer

Mark as Lost

When a lead is converted, automatically create/show the customer record.

4. Customers

Create a Customers page.

Customer fields:

Name

Company

Email

Phone

Status

Last Contacted

Notes

Allow users to:

Search Customers

View Customer Details

Edit Customer

Delete Customer

Converted leads should automatically appear in Customers.

5. Follow-ups

Create a Follow-ups page with three sections:

Upcoming

Show future follow-ups.

Overdue

Show follow-ups whose date has passed.

Completed

Show completed follow-ups.

Users should be able to:

Create Follow-up

Edit Follow-up

Complete Follow-up

Delete Follow-up

Follow-up fields:

Lead/Customer

Follow-up Date

Follow-up Type

Description

Status

Follow-up types:

Call

Email

Meeting

WhatsApp

Other

6. Activities

Create an Activity Timeline for every lead/customer.

Activity types:

Call

Email

Meeting

Note

Status Change

Follow-up Completed

Each activity should show:

Activity Type

Date

Description

Automatically create an activity when important actions happen, such as changing lead status, completing a follow-up or converting a lead.

7. Navigation

Create a left sidebar with:

Dashboard

Leads

Customers

Follow-ups

Activities

Settings

The sidebar should be responsive and easy to navigate.

8. UI/UX

Use:

Clean modern design

Professional CRM-style interface

Responsive layout

Simple sidebar

Cards

Tables

Search bars

Filters

Status badges

Modal forms

Confirmation dialogs

Empty states

Loading states

Error messages

Success notifications

Keep animations minimal.

The interface should be understandable for a beginner Product & Technology Intern.

9. Backend / Database

Use Supabase as the backend.

Create these tables:

users

id

name

email

created_at

leads

id

full_name

company_name

email

phone

lead_source

status

assigned_to

next_follow_up

notes

created_at

customers

id

name

company

email

phone

status

last_contacted

notes

created_at

follow_ups

id

lead_id

customer_id

follow_up_date

follow_up_type

description

status

created_at

activities

id

lead_id

customer_id

activity_type

description

activity_date

created_at

Connect the frontend forms to Supabase.

CRUD operations must actually work:

Create

Read

Update

Delete

Do not use only static/mock data for the main functionality.

10. Demo Data

Add realistic demo data so the dashboard is not empty when the application opens.

Create sample:

Leads

Customers

Follow-ups

Activities

Use realistic but fictional information.

11. Important Functional Rules

When a lead is converted:

Change lead status to "Converted".

Create a corresponding customer.

Show the customer in the Customers section.

Add an activity saying that the lead was converted.

When a follow-up is completed:

Change its status to "Completed".

Add an activity to the related lead/customer.

Update the last contacted information where appropriate.

When a lead is marked Lost:

Change status to "Lost".

Add a status-change activity.

12. Settings

Create a simple Settings page.

Include basic options such as:

User Profile

Name

Email

Notification preferences

Keep Settings simple. Do not add unnecessary features.

13. Code Quality

Use a clean and beginner-friendly project structure.

Requirements:

Reusable components

Clear naming

Simple functions

Easy-to-understand code

Proper error handling

Form validation

Responsive design

Add comments only where they help a beginner understand the code.

14. MVP Priority

Prioritize features in this order:

Working CRUD functionality

Supabase database connection

Leads management

Customers management

Follow-ups

Activities

Dashboard

Clean UI/UX

Do NOT add:

Advanced AI

Payment systems

Complex analytics

Enterprise permissions

Unnecessary integrations

Complicated automation

The final application should be a functional, professional-looking CRM MVP that a beginner Product & Technology Intern can understand, test and modify.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b49ee278-faa3-4f87-a493-f267cf224c38).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
