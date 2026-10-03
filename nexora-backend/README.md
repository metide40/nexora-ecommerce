# NEXORA Backend (Django + PostgreSQL)

REST API for the NEXORA e-commerce frontend.

## 1. Setup (first time)

```bash
cd nexora-backend
python -m venv venv
venv\Scripts\activate          # Windows   (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
```

Create the database in PostgreSQL (pgAdmin or psql):

```sql
CREATE DATABASE nexora;
```

Copy `.env.example` to `.env` and put in your Postgres password.

```bash
python manage.py migrate          # creates all tables
python manage.py seed_products    # loads the 12 products
python manage.py createsuperuser  # admin login
python manage.py runserver        # API at http://127.0.0.1:8000
```

Admin panel: http://127.0.0.1:8000/admin/ (manage products, view orders)
Run the tests: `python manage.py test`

(No Postgres yet? Set `USE_SQLITE=1` in `.env` to try everything with a local file.)

## 2. API reference

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/products/` | - | List. Params: `category`, `search`, `deals=1`, `featured=1`, `min_price`, `max_price`, `sort` (`price-asc`, `price-desc`, `rating`, `featured`) |
| GET | `/api/products/<id>/` | - | Product details |
| GET | `/api/categories/` | - | Categories with product counts |
| POST | `/api/auth/register/` | - | `{name, email, password, confirmPassword}` -> `{token, user}` |
| POST | `/api/auth/login/` | - | `{email, password}` -> `{token, user}` |
| POST | `/api/auth/logout/` | Token | Invalidates the token |
| GET | `/api/auth/me/` | Token | Current user |
| POST | `/api/orders/` | Token | Place order (see below) |
| GET | `/api/orders/` | Token | My order history |
| GET | `/api/orders/<orderNumber>/` | Token | One of my orders |
| PATCH | `/api/auth/me/` | Token | `{name}`: update profile (email can't change, it's the login id) |
| POST | `/api/auth/change-password/` | Token | `{currentPassword, newPassword, confirmPassword}` -> new `{token, user}` (old tokens are revoked) |
| GET | `/api/favorites/` | Token | My saved products (newest first, same shape as `/api/products/`) |
| POST | `/api/favorites/` | Token | `{productId}`: save a product (safe to repeat) |
| DELETE | `/api/favorites/<productId>/` | Token | Remove from favorites |
| POST | `/api/contact/` | - | `{name, email, message}`. Saved for the admin. Limited to 5 per hour per visitor |

Authenticated requests send the header: `Authorization: Token <token>`

### Placing an order
```json
POST /api/orders/
{
  "email": "a@b.com", "firstName": "Abel", "lastName": "T",
  "address": "1 Main St", "apartment": "", "city": "Addis", "state": "AA",
  "zip": "1000", "phone": "0911000000",
  "items": [{"productId": 1, "quantity": 2, "color": "Black", "size": null}]
}
```
Prices are **never** sent by the browser. The server reads them from the
database, calculates shipping (free over $75, else $9.99), checks stock, and
reduces it. Errors come back as HTTP 400 with a JSON message.

## 3. Database tables
`auth_user`, `authtoken_token`, `store_category`, `store_product`,
`store_productimage`, `orders_order`, `orders_orderitem`, `contact_contactmessage`, `store_favorite`

## 4. Reading customer messages (admin)
Log in at http://127.0.0.1:8000/admin/ -> **Contact messages**.
Unread messages are listed first. Tick **Is read** (or use the Action menu) after
replying, and use the notes field for private comments. Reply to the customer
by email using the address shown in the list.
