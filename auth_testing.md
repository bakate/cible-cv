# Auth Testing Playbook — Cible CV

## Setup test user + session
```bash
mongosh "$MONGO_URL" --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  role: 'user',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Backend tests (with session_token cookie or header)
```bash
TOK=YOUR_TOKEN
API=https://cv-matcher-41.preview.emergentagent.com/api
curl -s "$API/auth/me" -H "Authorization: Bearer $TOK"
curl -s "$API/generations" -H "Authorization: Bearer $TOK"
```

## Browser tests
Set cookie `session_token` before navigation. Should land on `/` (Wizard) without redirect to /login.

## Admin role
First user to sign in becomes admin automatically (if no admin exists). Override via env `ADMIN_EMAIL`.

## Checklist
- [ ] `/api/auth/me` returns user data with `role`
- [ ] Generations list scoped to current user (admin sees all)
- [ ] base_profile keyed by user_id
- [ ] Logout clears cookie + DB session
