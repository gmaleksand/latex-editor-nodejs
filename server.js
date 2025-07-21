const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.static('public'));
app.use('/uploads', express.static(__dirname + '/uploads'));

const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // You might want to sanitize the filename here
        cb(null, file.originalname);
    }
  })
});

app.post('/compile', upload.single('latex'), (req, res) => {
  const latexCode = req.body.latex;
  const tempDir = 'temp';
  const texFilePath = path.join(tempDir, 'main.tex');
  const dviFilePath = path.join(tempDir, 'main.dvi');
  const pngFilePath = path.join(tempDir, 'main.png');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  fs.writeFileSync(texFilePath, latexCode);

  //const command = `pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${texFilePath}`;
  command = `latex -interaction=nonstopmode -output-directory=${tempDir} ${texFilePath} -output-format=dvi`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('Error compiling LaTeX');
    }

    //const pdfToPngCommand = `pdftoppm -png -singlefile ${pdfFilePath} ${path.join(tempDir, 'main')}`;
    const dviToPngCommand = `dvipng ${dviFilePath} -o ${pngFilePath} -T tight -D 192`;

    exec(dviToPngCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res.status(500).send('Error converting DVI to PNG');
      }

      res.sendFile(path.resolve(pngFilePath));
    });
  });
});

// Handle uploads with Multer
app.post('/upload', upload.array('images'), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    // Process uploaded files
    const fileInfo = req.files.map(file => ({
      originalName: file.originalname,
      fileName: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path
    }));

    res.send(fileInfo);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
