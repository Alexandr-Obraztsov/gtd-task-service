const express = require('express');
const tasksRouter = require('./routes/tasks.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ message: 'GTD Task Service API. Смотрите /tasks' });
});

app.use('/tasks', tasksRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
