const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const upload = require('../config/multerConfig');

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
        return res.status(500).json({ message: err.message });
    }
    next();
};

router.get('/', newsController.getAllNews);
router.get('/:id', newsController.getNewsById);
router.post('/', upload.single('image'), handleMulterError, newsController.createNews);
router.patch('/:id', upload.single('image'), handleMulterError, newsController.updateNews);
router.delete('/:id', newsController.deleteNews);

module.exports = router;
