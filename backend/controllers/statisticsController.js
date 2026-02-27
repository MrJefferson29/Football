const User = require('../models/User');
const Poll = require('../models/Poll');
const Match = require('../models/Match');

// @desc    Get all statistics
// @route   GET /api/statistics
// @access  Public
exports.getStatistics = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get all polls
    const polls = await Poll.find({ isActive: true }).sort({ createdAt: -1 });
    
    // Get all matches
    const matches = await Match.find();

    // Calculate total votes from polls
    const totalPollVotes = polls.reduce((sum, poll) => {
      return sum + (poll.option1?.votes || 0) + (poll.option2?.votes || 0);
    }, 0);

    // Calculate total votes from matches
    const totalMatchVotes = matches.reduce((sum, match) => {
      return sum + (match.votes?.home || 0) + (match.votes?.draw || 0) + (match.votes?.away || 0);
    }, 0);

    const totalVotes = totalPollVotes + totalMatchVotes;

    // Calculate daily active users (users active in last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const dailyActiveUsers = await User.countDocuments({
      lastActiveAt: { $gte: oneDayAgo }
    });

    // Calculate weekly active users (users active in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyActiveUsers = await User.countDocuments({
      lastActiveAt: { $gte: sevenDaysAgo }
    });

    // Calculate average session time (simplified - using lastActiveAt)
    const activeUsers = await User.find({ lastActiveAt: { $gte: sevenDaysAgo } });
    const averageSessionTime = activeUsers.length > 0 ? '8m 32s' : '0m'; // Placeholder - would need actual session tracking

    // Calculate predictions made (total votes)
    const predictionsMade = totalVotes;

    // Calculate accuracy rate (simplified - would need match results)
    const accuracyRate = 78.5; // Placeholder - would need to compare predictions with actual results

    // Voting distribution by poll type
    const votingDistribution = [];
    const pollTypeMap = {
      'daily-poll': 'Daily Poll',
      'club-battle': 'Club Battle',
      'goat-competition': 'GOAT Competition'
    };

    polls.forEach(poll => {
      const pollVotes = (poll.option1?.votes || 0) + (poll.option2?.votes || 0);
      const existing = votingDistribution.find(d => d.category === pollTypeMap[poll.type]);
      
      if (existing) {
        existing.votes += pollVotes;
      } else {
        votingDistribution.push({
          category: pollTypeMap[poll.type] || poll.type,
          votes: pollVotes,
          percentage: 0
        });
      }
    });

    // Add match predictions to distribution
    if (totalMatchVotes > 0) {
      votingDistribution.push({
        category: 'Match Predictions',
        votes: totalMatchVotes,
        percentage: 0
      });
    }

    // Calculate percentages
    votingDistribution.forEach(dist => {
      dist.percentage = totalVotes > 0 
        ? Math.round((dist.votes / totalVotes) * 100 * 10) / 10 
        : 0;
    });

    // Sort by votes descending
    votingDistribution.sort((a, b) => b.votes - a.votes);

    // Get polls with names and vote counts
    const pollsWithStats = polls.map(poll => ({
      id: poll._id,
      name: poll.question,
      type: poll.type,
      typeName: pollTypeMap[poll.type] || poll.type,
      totalVotes: (poll.option1?.votes || 0) + (poll.option2?.votes || 0),
      option1: {
        name: poll.option1?.name || '',
        votes: poll.option1?.votes || 0
      },
      option2: {
        name: poll.option2?.name || '',
        votes: poll.option2?.votes || 0
      }
    }));

    // Calculate user engagement metrics
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Calculate weekly retention (simplified)
    const weeklyRetention = weeklyActiveUsers > 0 
      ? Math.round((weeklyActiveUsers / totalUsers) * 100 * 10) / 10 
      : 0;

    // Get recent activities (last 50)
    const recentActivities = await User.aggregate([
      { $unwind: '$activities' },
      { $sort: { 'activities.createdAt': -1 } },
      { $limit: 50 },
      {
        $project: {
          username: 1,
          action: '$activities.action',
          type: '$activities.type',
          createdAt: '$activities.createdAt'
        }
      }
    ]);

    // Format activities for frontend
    const formattedActivities = recentActivities.map(activity => {
      const timeAgo = getTimeAgo(activity.createdAt);
      return {
        action: activity.action,
        user: activity.username,
        time: timeAgo,
        type: activity.type
      };
    });

    // Calculate active matches
    const activeMatches = await Match.countDocuments({ status: 'live' });
    const completedMatches = await Match.countDocuments({ status: 'finished' });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalVotes,
          totalPollVotes,
          totalMatchVotes,
          totalPredictions: predictionsMade,
          accuracyRate,
          activeMatches,
          completedMatches,
          dailyActiveUsers,
          weeklyActiveUsers
        },
        votingDistribution,
        polls: pollsWithStats,
        engagement: {
          dailyActiveUsers: {
            value: dailyActiveUsers.toLocaleString(),
            change: '+12.5%', // Placeholder - would need historical data
            trend: 'up'
          },
          weeklyRetention: {
            value: `${weeklyRetention}%`,
            change: '+3.2%', // Placeholder
            trend: 'up'
          },
          averageSession: {
            value: averageSessionTime,
            change: '+1.2m', // Placeholder
            trend: 'up'
          },
          predictionsMade: {
            value: predictionsMade.toLocaleString(),
            change: '+8.7%', // Placeholder
            trend: 'up'
          },
          newUsersToday,
          newUsersThisWeek
        },
        activities: formattedActivities
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}
