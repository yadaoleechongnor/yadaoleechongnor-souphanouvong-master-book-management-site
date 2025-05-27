const News = require('../models/newsModel');
const fs = require('fs');
const path = require('path');

// Get all news
exports.getAllNews = async (req, res) => {
    try {
        const news = await News.find();
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single news by ID
exports.getNewsById = async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) return res.status(404).json({ message: 'News not found' });
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create news
exports.createNews = async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        console.log('Received file:', req.file);

        const newsData = {
            title: req.body.title,
            description: req.body.description,
        };

        if (req.file) {
            newsData.imageUrl = `/uploads/news/${req.file.filename}`;
        }

        const news = new News(newsData);
        const savedNews = await news.save();
        console.log('Saved news:', savedNews);
        res.status(201).json(savedNews);
    } catch (error) {
        console.error('Error creating news:', error);
        res.status(500).json({
            message: 'Failed to create news',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Update news
exports.updateNews = async (req, res) => {
    try {
        const updateData = req.body;
        if (req.file) {
            updateData.imageUrl = `/uploads/news/${req.file.filename}`;
        }

        const news = await News.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true }
        );
        if (!news) return res.status(404).json({ message: 'News not found' });
        res.status(200).json(news);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete news
exports.deleteNews = async (req, res) => {
    try {
        const news = await News.findByIdAndDelete(req.params.id);
        if (!news) return res.status(404).json({ message: 'News not found' });
        res.status(200).json({ message: 'News deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
