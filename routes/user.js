const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');

const User = require('../models/User');
const authMiddleware = require('../middlewares/auth');

const JWT_KEY = config.get('jwtKey');

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { login, password, passwordCheck } = req.body;

    if(!login || !password || !passwordCheck)
      return res.status(400).json({ message: 'Заполните все поля' });

    if(password !== passwordCheck)
      return res.status(400).json({ message: 'Пароли не совпадают' });

    if(password.length < 5)
      return res.status(400).json({ message: 'Длина пароля должна быть не менее 5 символов' });

    const candidate = await User.findOne({ login });
    if(candidate)
      return res.status(400).json({ message: 'Пользователь с таким именем уже зарегистрирован' });

    const hashedPassword = bcrypt.hashSync(password, 7);

    const user = new User({
      login,
      password: hashedPassword
    })

    const token = `Bearer ${jwt.sign({ id: user._id, login }, JWT_KEY, { expiresIn: '1h' })}`;

    await user.save();
    return res.json({
      token,
      user: { id: user._id, login },
      message: 'Пользователь успешно зарегистрирован'
    })
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: 'Что-то пошло не так' });
  }
})

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if(!login || !password)
      return res.status(400).json({ message: 'Заполните все поля' });

    const user = await User.findOne({ login });
    if(!user)
      return res.status(404).json({ message: 'Пользователь с таким именем не найден' });

    const isMatch = bcrypt.compareSync(password, user.password);
    if(!isMatch)
      return res.status(400).json({ message: 'Неверный пароль' });

    const token = `Bearer ${jwt.sign({ id: user._id, login }, JWT_KEY, { expiresIn: '1h' })}`;

    return res.json({
      token,
      user: { id: user._id, login }
    })
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: 'Что-то пошло не так' });
  }
})

router.get('/auth', authMiddleware, async (req, res) => {
  try {
    const { id, login } = req.user;
    const user = await User.findById(id);

    const token = `Bearer ${jwt.sign({ id, login }, JWT_KEY, { expiresIn: '1h' })}`;

    return res.json({
      token,
      user: { id: user._id, login }
    })
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: 'Что-то пошло не так' });
  }
})

router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    return res.json(users);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: 'Что-то пошло не так' });
  }
})

router.delete('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const deletedUser = await User.findByIdAndDelete(user.id);
    return res.json(deletedUser);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: 'Что-то пошло не так' });
  }
})

module.exports = router;