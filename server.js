const express = require('express');
import controllerRouting from './routes/index';

const app = express();
const PORT = process.env.PORT || 5000;

// Load routes
app.use(express.json());

controllerRouting(app);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
