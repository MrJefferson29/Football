const Poll = require('../models/Poll');
const Match = require('../models/Match');
const Highlight = require('../models/Highlight');
const News = require('../models/News');
const FanGroup = require('../models/FanGroup');
const LiveMatch = require('../models/LiveMatch');
const PredictionForum = require('../models/PredictionForum');
const User = require('../models/User');

// @desc    Get all data for home/index screen
// @route   GET /api/home
// @access  Public
exports.getHomeData = async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch all data in parallel
    const [
      dailyPoll,
      clubBattlePoll,
      goatCompetitionPoll,
      todayMatches,
      highlights,
      trendingNews,
      fanGroups,
      liveMatches,
      predictionLeaders
    ] = await Promise.all([
      // Daily Poll
      Poll.findOne({ type: 'daily-poll', isActive: true }).sort({ createdAt: -1 }),
      
      // Club Battle Poll
      Poll.findOne({ type: 'club-battle', isActive: true }).sort({ createdAt: -1 }),
      
      // Goat Competition Poll
      Poll.findOne({ type: 'goat-competition', isActive: true }).sort({ createdAt: -1 }),
      
      // Today's Matches
      Match.find({
        matchDate: { $gte: today, $lt: tomorrow }
      }).sort({ matchTime: 1 }),
      
      // Highlights (latest 3)
      Highlight.find().sort({ createdAt: -1 }).limit(3),
      
      // Trending News
      News.find({ isTrending: true }).sort({ createdAt: -1 }).limit(3),
      
      // Fan Groups
      FanGroup.find().sort({ memberCount: -1 }),
      
      // Live Matches
      LiveMatch.find({ isLive: true })
        .populate('comments.userId', 'username avatar')
        .populate('comments.replies.userId', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(1),
      
      // Prediction Leaders (Forum Heads sorted by points)
      (async () => {
        // Get all forum heads
        const forums = await PredictionForum.find({ isActive: true })
          .select('headUserId')
          .populate('headUserId', 'username avatar points correctPredictions totalPredictions rank');
        
        // Extract unique forum heads and sort by points
        const leaderMap = new Map();
        forums.forEach(forum => {
          if (forum.headUserId && typeof forum.headUserId === 'object') {
            const head = forum.headUserId;
            if (!leaderMap.has(head._id.toString())) {
              leaderMap.set(head._id.toString(), head);
            }
          }
        });
        
        const leaders = Array.from(leaderMap.values())
          .sort((a, b) => (b.points || 0) - (a.points || 0))
          .slice(0, 10); // Top 10 leaders
        
        return leaders;
      })()
    ]);

    res.status(200).json({
      success: true,
      data: {
        polls: {
          dailyPoll: dailyPoll ? {
            id: dailyPoll._id,
            question: dailyPoll.question,
            option1: {
              name: dailyPoll.option1.name,
              image: dailyPoll.option1.image,
              votes: dailyPoll.option1.votes,
              percentage: dailyPoll.option1Percentage
            },
            option2: {
              name: dailyPoll.option2.name,
              image: dailyPoll.option2.image,
              votes: dailyPoll.option2.votes,
              percentage: dailyPoll.option2Percentage
            },
            statistics: dailyPoll.statistics
          } : null,
          clubBattle: clubBattlePoll ? {
            id: clubBattlePoll._id,
            question: clubBattlePoll.question,
            option1: {
              name: clubBattlePoll.option1.name,
              image: clubBattlePoll.option1.image,
              votes: clubBattlePoll.option1.votes,
              percentage: clubBattlePoll.option1Percentage
            },
            option2: {
              name: clubBattlePoll.option2.name,
              image: clubBattlePoll.option2.image,
              votes: clubBattlePoll.option2.votes,
              percentage: clubBattlePoll.option2Percentage
            }
          } : null,
          goatCompetition: goatCompetitionPoll ? {
            id: goatCompetitionPoll._id,
            question: goatCompetitionPoll.question,
            option1: {
              name: goatCompetitionPoll.option1.name,
              image: goatCompetitionPoll.option1.image,
              votes: goatCompetitionPoll.option1.votes,
              percentage: goatCompetitionPoll.option1Percentage
            },
            option2: {
              name: goatCompetitionPoll.option2.name,
              image: goatCompetitionPoll.option2.image,
              votes: goatCompetitionPoll.option2.votes,
              percentage: goatCompetitionPoll.option2Percentage
            }
          } : null
        },
        todayMatches: todayMatches.map(match => ({
          id: match._id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeLogo: match.homeLogo,
          awayLogo: match.awayLogo,
          matchTime: match.matchTime,
          status: match.status,
          league: match.league,
          leagueType: match.leagueType,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          votes: {
            home: match.votes.home,
            draw: match.votes.draw,
            away: match.votes.away,
            homePercentage: match.homePercentage,
            drawPercentage: match.drawPercentage,
            awayPercentage: match.awayPercentage
          }
        })),
        highlights: highlights.map(highlight => ({
          id: highlight._id,
          title: highlight.title,
          description: highlight.description,
          category: highlight.category,
          youtubeUrl: highlight.youtubeUrl,
          thumbnail: highlight.thumbnail,
          duration: highlight.duration,
          views: highlight.views
        })),
        trendingNews: trendingNews.map(news => ({
          id: news._id,
          title: news.title,
          description: news.description,
          category: news.category,
          videoUrl: news.videoUrl,
          youtubeUrl: news.youtubeUrl,
          thumbnail: news.thumbnail,
          isTrending: news.isTrending
        })),
        fanGroups: fanGroups.map(group => ({
          id: group._id,
          name: group.name,
          slogan: group.slogan,
          logo: group.logo,
          color: group.color,
          memberCount: group.memberCount,
          postsCount: group.posts.length
        })),
        liveMatches: liveMatches.map(match => ({
          id: match._id,
          title: match.title,
          description: match.description,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeLogo: match.homeLogo,
          awayLogo: match.awayLogo,
          youtubeUrl: match.youtubeUrl,
          thumbnail: match.thumbnail,
          isLive: match.isLive,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          matchTime: match.matchTime,
          comments: match.comments
        })),
        predictionLeaders: predictionLeaders.map((leader, index) => ({
          position: index + 1,
          id: leader._id,
          username: leader.username,
          avatar: leader.avatar,
          points: leader.points || 0,
          correctPredictions: leader.correctPredictions || 0,
          totalPredictions: leader.totalPredictions || 0,
          accuracy: leader.totalPredictions > 0 
            ? Math.round((leader.correctPredictions || 0) / leader.totalPredictions * 100) 
            : 0,
          rank: leader.rank || 'Bronze'
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

