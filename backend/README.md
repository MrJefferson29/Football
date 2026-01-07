# Football App Backend

Backend server for the Football App built with Node.js, Express, MongoDB, and Socket.io.

## Features

- User authentication with JWT
- Polls system (Daily Poll, Club Battle, GOAT Competition)
- Match voting system
- Highlights and News management
- Live matches with comments
- Real-time chat with Socket.io
- Fan groups with admin-only posting
- Statistics aggregation
- Cloudinary image upload

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory:
```
MONGODB_URI=mongodb://localhost:27017/football-app
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRE=7d
PORT=5000

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

3. Start MongoDB (if running locally)

4. Run the server:
```bash
npm run dev
```

The server will run on `http://192.168.50.179:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Polls
- `GET /api/polls` - Get all active polls
- `GET /api/polls/:type` - Get poll by type (daily-poll, club-battle, goat-competition)
- `POST /api/polls` - Create/update poll (Admin only)
- `POST /api/polls/:id/vote` - Vote on poll (Protected)
- `GET /api/polls/:id/results` - Get poll results

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/today` - Get today's matches
- `GET /api/matches/:id` - Get match by ID
- `POST /api/matches` - Create match (Admin only)
- `POST /api/matches/:id/vote` - Vote on match (Protected)

### Highlights
- `GET /api/highlights` - Get all highlights
- `POST /api/highlights` - Create highlight (Admin only)
- `PUT /api/highlights/:id` - Update highlight (Admin only)
- `DELETE /api/highlights/:id` - Delete highlight (Admin only)

### News
- `GET /api/news` - Get all news
- `GET /api/news/trending` - Get trending news
- `POST /api/news` - Create news (Admin only)
- `PUT /api/news/:id` - Update news (Admin only)
- `DELETE /api/news/:id` - Delete news (Admin only)

### Live Matches
- `GET /api/live-matches` - Get all live matches
- `GET /api/live-matches/:id` - Get live match by ID
- `POST /api/live-matches` - Create live match (Admin only)
- `POST /api/live-matches/:id/comments` - Add comment (Protected)
- `POST /api/live-matches/:id/comments/:commentId/reply` - Reply to comment (Protected)
- `POST /api/live-matches/:id/comments/:commentId/like` - Like comment (Protected)

### Chat
- `GET /api/chat` - Get chat messages
- `POST /api/chat` - Send message (Protected)
- `POST /api/chat/:id/like` - Like message (Protected)

### Fan Groups
- `GET /api/fan-groups` - Get all fan groups
- `GET /api/fan-groups/:id` - Get fan group by ID
- `POST /api/fan-groups` - Create fan group (Admin only)
- `POST /api/fan-groups/:id/join` - Join fan group (Protected)
- `POST /api/fan-groups/:id/posts` - Create post (Admin only)
- `POST /api/fan-groups/:id/posts/:postId/comments` - Comment on post (Protected)
- `POST /api/fan-groups/:id/posts/:postId/like` - Like post (Protected)

### Statistics
- `GET /api/statistics` - Get all statistics

### Upload
- `POST /api/upload` - Upload image to Cloudinary (Protected)

## Socket.io Events

### Client to Server
- `join-chat` - Join live chat room
- `send-message` - Send a chat message
- `join-fan-group` - Join a fan group room

### Server to Client
- `new-message` - New chat message received
- `new-comment` - New comment on live match
- `new-post` - New post in fan group

## Database Models

- **User** - User accounts with authentication
- **Poll** - Polls for voting (daily-poll, club-battle, goat-competition)
- **Match** - Football matches with voting
- **Highlight** - Video highlights
- **News** - News articles
- **LiveMatch** - Live streaming matches with comments
- **ChatMessage** - Chat messages
- **FanGroup** - Fan groups with posts

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Admin Routes

Admin-only routes require the user to have `role: 'admin'` in their user document.

