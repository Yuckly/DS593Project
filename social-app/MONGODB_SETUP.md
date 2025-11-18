# MongoDB Setup Guide for Social App

## Quick Start

### 1. Start MongoDB

**Option A: Start MongoDB manually**
```bash
mongod
```
This will start MongoDB on the default port (27017). Keep this terminal window open.

**Option B: Start MongoDB as a background service (macOS with Homebrew)**
```bash
brew services start mongodb-community
```

**Option C: Start MongoDB in the background (if installed manually)**
```bash
mongod --fork --logpath /usr/local/var/log/mongodb/mongo.log
```

### 2. Verify MongoDB is Running

Open a new terminal and run:
```bash
mongosh
```

Or if you have the older `mongo` client:
```bash
mongo
```

You should see a MongoDB shell prompt. Type `exit` to leave.

### 3. Start the Social App

In your project directory:
```bash
cd social-app
npm install
npm start
```

The app will automatically connect to MongoDB at `mongodb://localhost:27017/social-app`

## MongoDB Connection Details

- **Host**: localhost
- **Port**: 27017 (default)
- **Database Name**: social-app
- **Connection String**: `mongodb://localhost:27017/social-app`

## Common MongoDB Commands

### Access MongoDB Shell
```bash
mongosh
# or
mongo
```

### View Databases
```javascript
show dbs
```

### Use the social-app Database
```javascript
use social-app
```

### View Collections (Tables)
```javascript
show collections
```

### View Users
```javascript
db.users.find().pretty()
```

### Count Users
```javascript
db.users.countDocuments()
```

### Delete All Users (for testing)
```javascript
db.users.deleteMany({})
```

### View a Specific User
```javascript
db.users.findOne({ username: "your_username" })
```

## Troubleshooting

### MongoDB Won't Start

1. **Check if MongoDB is already running:**
   ```bash
   pgrep -f mongod
   ```

2. **Check MongoDB logs:**
   ```bash
   tail -f /usr/local/var/log/mongodb/mongo.log
   ```

3. **Create data directory if it doesn't exist:**
   ```bash
   mkdir -p /usr/local/var/mongodb
   mkdir -p /usr/local/var/log/mongodb
   ```

4. **Start with custom data directory:**
   ```bash
   mongod --dbpath /usr/local/var/mongodb --logpath /usr/local/var/log/mongodb/mongo.log
   ```

### Connection Error in App

If you see connection errors, make sure:
1. MongoDB is running (`pgrep -f mongod`)
2. MongoDB is on the default port 27017
3. No firewall is blocking the connection

### Change MongoDB Port

If you need to use a different port, edit `config/database.js`:
```javascript
mongoose.connect('mongodb://localhost:YOUR_PORT/social-app', ...)
```

## Installing MongoDB (if not installed)

### macOS with Homebrew
```bash
brew tap mongodb/brew
brew install mongodb-community
```

### macOS Manual Install
Download from: https://www.mongodb.com/try/download/community

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install -y mongodb
```

### Windows
Download the installer from: https://www.mongodb.com/try/download/community

## Stop MongoDB

**If started manually:**
Press `Ctrl+C` in the terminal where MongoDB is running

**If started as a service:**
```bash
brew services stop mongodb-community
```

**Kill MongoDB process:**
```bash
pkill mongod
```


