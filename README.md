# NEXORA: Full-Stack E-commerce Store

A complete online store built for an internship task: product listings, product details, shopping cart, order processing, and user registration/login, backed by a PostgreSQL database.

## Features
- **Shop:** product listings with category filters, search, price range, sorting and deals
- **Product page:** image gallery, colors and sizes, specs, related products
- **Cart and checkout:** quantities, free-shipping rule, prices always verified by the server
- **Accounts:** register, log in, log out, edit profile, change password
- **Orders:** stock checks, order history, order tracking status
- **Favorites:** save products to your account (heart button)
- **Contact form:** messages are stored and read by the admin in the admin panel
- **Admin panel:** manage products, orders, favorites and customer messages

## Tech stack
| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (no frameworks) |
| Backend | Python, Django, Django REST Framework |
| Database | PostgreSQL |
| Auth | Token authentication, hashed passwords |

## Project structure
```
nexora-ecommerce/
├── nexora-backend/     Django REST API (accounts, store, orders, contact)
│   ├── config/         settings and main URLs
│   ├── store/          products, categories, favorites
│   ├── orders/         checkout and order history
│   ├── accounts/       register, login, profile
│   ├── contact/        contact-form messages
│   └── README.md       full API reference
└── nexora-frontend/    HTML pages, css/, js/
    └── js/api.js       the only file that talks to the backend
```

## How to run it

**Requirements:** Python 3.10+, PostgreSQL

### 1. Backend
```bash
cd nexora-backend
python -m venv venv
venv\Scripts\activate            # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```
Create an empty database named `nexora` in PostgreSQL, then copy `.env.example` to `.env` and put in your PostgreSQL password.
```bash
python manage.py migrate
python manage.py seed_products   # loads the 12 sample products
python manage.py createsuperuser # your admin login
python manage.py runserver       # API at http://127.0.0.1:8000
```

### 2. Frontend (in a second terminal)
```bash
cd nexora-frontend
python -m http.server 5500
```
Open **http://localhost:5500**

Admin panel: http://127.0.0.1:8000/admin/

## Tests
```bash
cd nexora-backend
python manage.py test
```
The suite covers products, authentication, favorites, orders (including security rules such as server-side pricing and stock checks) and the contact form.

## Security notes
- Passwords are hashed by Django; real secrets live in `.env`, which is not committed.
- The server calculates all prices and checks stock; the browser never sends prices.
- Users can only see their own orders and favorites.
- The contact form is rate limited (5 messages per hour per visitor).
- Before deploying, set `DEBUG=False`, a strong `SECRET_KEY`, real `ALLOWED_HOSTS`, and `CORS_ALLOWED_ORIGINS`.

## Notes
- Product images are loaded from Unsplash, so an internet connection is needed to see them.
- The API address is set in `nexora-frontend/js/api.js`.
