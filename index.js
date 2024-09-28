const express = require('express');
const app = express();
const cors = require('cors');
// 新增: 引入 mongoose
const mongoose = require('mongoose');
require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
// 新增: 解析 URL 編碼的請求體
app.use(express.urlencoded({ extended: true }));
// 新增: 解析 JSON 請求體
app.use(express.json());

// 新增: 連接到 MongoDB
mongoose.connect(process.env.MONGO_URI);

// 新增: 定義 User 模型
const userSchema = new mongoose.Schema({
  username: String,
});
const User = mongoose.model('User', userSchema);

// 新增: 定義 Exercise 模型
const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// 新增: 創建新用戶
app.post('/api/users', async (req, res) => {
  const newUser = new User({ username: req.body.username });
  try {
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Error creating new user' });
  }
});

// 新增: 獲取所有用戶
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// 新增: 添加運動記錄
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });
    await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Error adding exercise' });
  }
});

// 新增: 獲取用戶運動日誌
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let { from, to, limit } = req.query;
    let filter = { userId: user._id };

    if (from) {
      filter.date = { $gte: new Date(from) };
    }
    if (to) {
      filter.date = { ...filter.date, $lte: new Date(to) };
    }

    let exercises = await Exercise.find(filter).limit(parseInt(limit) || 0);

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching exercise log' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});