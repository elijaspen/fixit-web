# FixIt - Service Management & Booking Platform

![Project Status](https://img.shields.io/badge/Status-Capstone_Project-blue)
![Tech Stack](https://img.shields.io/badge/Stack-Laravel_React_Inertia-red)

**FixIt** is a web-based application designed to bridge the gap between customers and service technicians. It streamlines the process of finding verified technicians, managing service requests, negotiating quotes, and processing bookings with an integrated review system.

This project was developed as a **Capstone Project** for the **University of Antique**.

## Key Features

### User Roles
* **Admin:** Verifies technician credentials, manages booking fee payments, and oversees platform activity.
* **Technician:** Manages profile, sets availability (calendar), handles service requests, issues quotes, and tracks earnings.
* **Customer:** Browses technicians (Nearby/Popular), creates service requests, approves quotes, and rates services.

### Core Functionality
* **Service Request Workflow:**
    1.  Customer initiates request.
    2.  Technician issues a quote (Service Fee + Booking Fee).
    3.  Customer approves quote.
    4.  Admin verifies booking fee payment.
    5.  Technician completes service.
* **Real-Time Messaging:** Integrated chat system for direct communication between customers and technicians.
* **Availability Calendar:** Technicians can manage their monthly schedule; customers can view availability before booking.
* **Verified Review System:** Customers can only rate and review a technician after a service is marked as "Completed" to ensure authenticity.
* **Geo-Location:** Sort technicians by "Nearby" (Distance) or "Popularity" (Ratings).

## Techn Stack

* **Backend:** Laravel 12 (PHP)
* **Frontend:** React.js with TypeScript (`.tsx`)
* **Glue:** Inertia.js (Monolith-like SPA experience)
* **Database:** MySQL
* **Styling:** Tailwind CSS & Shadcn UI
* **Real-time:** Laravel Reverb / Pusher (for broadcasting)

## Installation & Setup

Follow these steps to set up the project locally.

### Prerequisites
* PHP >= 8.2
* Composer
* Node.js & NPM
* MySQL

### Steps

1.  **Clone the Repository**
    ```bash
    git clone repo
    cd fixit-web
    ```

2.  **Install Backend Dependencies**
    ```bash
    composer install
    ```

3.  **Install Frontend Dependencies**
    ```bash
    npm install
    ```

4.  **Environment Setup**
    Copy the example environment file and configure your database credentials.
    ```bash
    cp .env.example .env
    ```
    *Open `.env` and update `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.*

5.  **Generate App Key**
    ```bash
    php artisan key:generate
    ```

6.  **Run Migrations & Seeders**
    Set up the database tables and default data.
    ```bash
    php artisan migrate --seed
    ```

7.  **Link Storage**
    Required for uploading receipts and profile images.
    ```bash
    php artisan storage:link
    ```

8.  **Run the Application**
    You need two terminals running simultaneously:

    *Terminal 1 (Backend):*
    ```bash
    php artisan serve
    ```

    *Terminal 2 (Frontend):*
    ```bash
    npm run dev
    ```

## Usage Guide

### For Technicians
1.  Register and upload your **License** and **Certificates** in settings.
2.  Wait for Admin verification.
3.  Set your availability in the **Dashboard Calendar**.
4.  Wait for incoming requests in the **Service Requests** tab.

### For Customers
1.  Browse technicians using the **Nearby** or **Popular** filters.
2.  Click **"Book Now"** or chat to initiate a Service Request.
3.  Wait for the technician to send a quote.
4.  Click **"Approve Quote"** in the chat window to confirm the booking.

### For Admins
1.  Log in to the Admin Panel.
2.  Review Technician documents and toggle verification status.
3.  Go to **Service Requests** to mark Booking Fees as "Paid" to allow technicians to complete jobs.

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
---

**Developed by:** [EJCF2025]
**University of Antique**
