const Download = require('../models/downloadModel');
const Book = require('../models/bookModel');

/**
 * Service to handle popular books functionality
 */
class PopularBooksService {
  /**
   * Get popular books based on download count
   * @param {Number} limit - Number of books to return
   * @param {Number} days - Optional time period to consider (in days)
   * @returns {Promise<Array>} - Array of popular books with download counts
   */
  async getPopularBooks(limit = 10, days = null) {
    try {
      const matchStage = {};
      
      // If days parameter is provided, filter downloads by date
      if (days) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        matchStage.download_date = { $gte: dateLimit };
      }
      
      const aggregationPipeline = [];
      
      // Add match stage if time filtering is needed
      if (Object.keys(matchStage).length > 0) {
        aggregationPipeline.push({ $match: matchStage });
      }
      
      // Add the rest of the pipeline
      aggregationPipeline.push(
        // Group by book_id and count downloads
        {
          $group: {
            _id: '$book_id',
            downloadCount: { $sum: 1 }
          }
        },
        // Sort by download count in descending order
        {
          $sort: { downloadCount: -1 }
        },
        // Limit to the requested number
        {
          $limit: limit
        },
        // Look up book details
        {
          $lookup: {
            from: 'books',
            localField: '_id',
            foreignField: '_id',
            as: 'bookDetails'
          }
        },
        // Unwind the bookDetails array
        {
          $unwind: '$bookDetails'
        },
        // Project needed fields
        {
          $project: {
            _id: 0,
            bookId: '$_id',
            title: '$bookDetails.title',
            author: '$bookDetails.author',
            description: '$bookDetails.description',
            coverImage: '$bookDetails.cover_image',
            downloadCount: 1
          }
        }
      );
      
      return await Download.aggregate(aggregationPipeline);
    } catch (error) {
      throw new Error(`Error fetching popular books: ${error.message}`);
    }
  }
  
  /**
   * Get top downloads for a specific time period
   * @param {String} period - Time period ('day', 'week', 'month')
   * @param {Number} limit - Number of books to return
   * @returns {Promise<Array>} - Array of top books for the period
   */
  async getTopDownloadsForPeriod(period = 'week', limit = 5) {
    try {
      const dateLimit = new Date();
      
      // Set the date limit based on period
      switch (period) {
        case 'day':
          dateLimit.setDate(dateLimit.getDate() - 1);
          break;
        case 'week':
          dateLimit.setDate(dateLimit.getDate() - 7);
          break;
        case 'month':
          dateLimit.setMonth(dateLimit.getMonth() - 1);
          break;
        default:
          dateLimit.setDate(dateLimit.getDate() - 7); // Default to week
      }
      
      return await this.getPopularBooks(limit, (new Date() - dateLimit) / (1000 * 60 * 60 * 24));
    } catch (error) {
      throw new Error(`Error fetching top downloads for ${period}: ${error.message}`);
    }
  }
}

module.exports = new PopularBooksService();
