const express = require('express');
const app = express();
const path = require('path');

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '')));
app.use('/Utils', express.static(path.join(__dirname, 'Utils')));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
