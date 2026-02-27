# Football App - Setup Guide

## Backend Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Cloudinary account (for image uploads)

### Installation Steps

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create `.env` file:**
Create a `.env` file in the `backend` directory with the following content:
```
MONGODB_URI=mongodb://localhost:27017/football-app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
PORT=5000

CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

4. **Start MongoDB:**
If using local MongoDB:
```bash
# On Windows
mongod

# On Mac/Linux
sudo systemctl start mongod
```

Or use MongoDB Atlas and update the `MONGODB_URI` in `.env`.

5. **Start the backend server:**
```bash
npm run dev
```

The server will start on `http://192.168.50.179:5000`

### Creating an Admin User

After starting the server, you can create an admin user by:

1. Register a user via the API:
```bash
POST http://192.168.50.179:5000/api/auth/register
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "admin123"
}
```

2. Then manually update the user in MongoDB to set `role: 'admin'`:
```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

## Frontend Setup

### Installation Steps

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies (if not already installed):**
```bash
npm install
```

3. **Install additional dependencies for API calls:**
```bash
npm install @react-native-async-storage/async-storage
```

4. **Update API configuration:**
The API base URL is already configured in `frontend/constants/api.ts` as `http://192.168.50.179:5000/api`

5. **Start the frontend:**
```bash
npm start
```

## API Integration

### Authentication

The frontend API utilities are located in `frontend/utils/api.ts`. To use them:

1. **Store JWT token after login:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '@/utils/api';

// After successful login
const response = await authAPI.login(email, password);
await AsyncStorage.setItem('token', response.token);
await AsyncStorage.setItem('user', JSON.stringify(response.user));
```

2. **Update `frontend/utils/api.ts` to use AsyncStorage:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('token');
};
```

### Socket.io Integration

For real-time chat, install socket.io-client in the frontend:
```bash
cd frontend
npm install socket.io-client
```

Then use it in your chat component:
```typescript
import io from 'socket.io-client';
import { SOCKET_URL } from '@/constants/api';

const socket = io(SOCKET_URL);

socket.on('connect', () => {
  socket.emit('join-chat', userId);
});

socket.on('new-message', (message) => {
  // Handle new message
});
```

## Features Implemented

### ✅ Backend Features

1. **User Authentication**
   - Registration with username, email, password
   - Login with JWT token
   - Protected routes with middleware

2. **Polls System**
   - Daily Poll (admin editable)
   - Club Battle (admin editable)
   - GOAT Competition (admin editable)
   - User voting with vote tracking

3. **Matches System**
   - Today's matches (admin can add)
   - Match voting (home/draw/away)
   - Score predictions

4. **Highlights**
   - Admin can upload highlights
   - Title, description, category, YouTube URL, thumbnail

5. **News**
   - Admin can upload news
   - Title, video/YouTube URL, thumbnail, category
   - Trending category automatically marked as trending

6. **Live Matches**
   - Admin can create live matches
   - YouTube streaming support
   - User comments and replies
   - Like comments

7. **Chat System**
   - Real-time chat with Socket.io
   - All users can chat
   - Like messages

8. **Fan Groups**
   - Admin creates fan groups
   - Users can join
   - Only admins can post
   - Users can comment and like posts

9. **Statistics**
   - Aggregates all voting statistics
   - Poll statistics
   - Match statistics

10. **Image Upload**
    - Cloudinary integration
    - Admin can upload images

### ✅ Frontend Features

1. **API Configuration**
   - API endpoints defined in `constants/api.ts`
   - API utility functions in `utils/api.ts`

2. **Ready for Integration**
   - All API functions are ready to use
   - Need to integrate with existing components

## Next Steps

1. **Update Frontend Components:**
   - Replace hardcoded data with API calls
   - Add authentication screens (login/register)
   - Integrate Socket.io for real-time chat
   - Add token storage with AsyncStorage

2. **Add Error Handling:**
   - Network error handling
   - Token expiration handling
   - Loading states

3. **Add Admin Panel:**
   - Create admin screens for managing polls, matches, highlights, etc.
   - Image upload functionality

## Testing the API

You can test the API using Postman or curl:

### Register User
```bash
curl -X POST http://192.168.50.179:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://192.168.50.179:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Get Polls (Public)
```bash
curl http://192.168.50.179:5000/api/polls
```

### Get Today's Matches (Public)
```bash
curl http://192.168.50.179:5000/api/matches/today
```

## Troubleshooting

1. **MongoDB Connection Error:**
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env file
   - For MongoDB Atlas, ensure IP is whitelisted

2. **Port Already in Use:**
   - Change PORT in .env file
   - Or kill the process using port 5000

3. **Cloudinary Upload Fails:**
   - Verify Cloudinary credentials in .env
   - Check image file size (max 5MB)

4. **JWT Token Issues:**
   - Ensure JWT_SECRET is set in .env
   - Token expires after 7 days (configurable)

## API Base URL

All API endpoints are prefixed with: `http://192.168.50.179:5000/api`

Make sure this IP address is accessible from your frontend device/emulator.

