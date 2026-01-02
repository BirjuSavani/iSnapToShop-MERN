const { logger } = require('../utils/logger');
const Event = require('../models/Event');

// Log an event
exports.logEvent = async ({ applicationId, companyId, type, query, imageId }) => {
  try {
    if (!applicationId || !companyId || !type) {
      logger.warn(`Missing required fields in logEvent`, { applicationId, companyId, type });
      return null;
    }

    const event = new Event({
      applicationId,
      companyId,
      type,
      query,
      imageId,
    });

    await event.save();

    logger.info('Event logged', {
      applicationId,
      companyId,
      type,
      query,
      imageId,
    });

    return event;
  } catch (error) {
    logger.error('Failed to log event', { error });
    // Sentry.captureException('Error in logEvent function', error);
    return null;
  }
};

exports.getReport = async (req, res) => {
  try {
    const { applicationId, startDate, endDate, companyId } = req.query;

    if (!applicationId) {
      return res.status(400).json({ error: 'applicationId is required' });
    }

    const now = new Date();

    // Normalize startDate to 00:00:00 and endDate to 23:59:59
    const start = startDate
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : now;

    // Base filter for all data
    const baseMatch = {
      applicationId,
      timestamp: {
        $gte: start,
        $lte: end,
      },
    };

    // 1. Aggregate counts by type
    const typeCounts = await Event.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert counts to map for easy use
    const countsMap = {};
    for (const c of typeCounts) {
      countsMap[c._id] = c.count;
    }

    // 2. Match rate = image_search / (image_search + image_not_found)
    const searches = countsMap['image_search'] || 0;
    const notFound = countsMap['image_not_found'] || 0;
    const totalSearches = searches + notFound;
    const matchRate = totalSearches > 0 ? (searches / totalSearches) * 100 : 0;

    // 3. Avg daily searches
    const diffTime = Math.abs(end - start);
    const diffDays = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);
    const avgDailySearches = totalSearches / diffDays;

    // 4. Search trends (grouped by day)
    const searchTrends = await Event.aggregate([
      {
        $match: {
          ...baseMatch,
          type: 'image_search',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    const trendsFormatted = searchTrends.map(item => {
      const { year, month, day } = item._id;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date: dateStr, count: item.count };
    });

    // Background proxy creation (optional)
    // if (companyId && applicationId) {
    //   ensureProxyPath({ company_id: companyId, application_id: applicationId }).catch(err =>
    //     logger.warn('Background proxy creation failed:', err.message)
    //   );
    // }

    // Final response
    res.json({
      report: typeCounts,
      matchRate: matchRate.toFixed(2),
      avgDailySearches: avgDailySearches.toFixed(2),
      searchTrends: trendsFormatted,
    });
  } catch (error) {
    logger.error('Error getting analytics report:', error);
    // Sentry.captureException('Error in getReport function', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
