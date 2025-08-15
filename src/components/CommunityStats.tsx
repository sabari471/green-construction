import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CommunityStats = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalPosts: 0,
    postsThisWeek: 0,
    activeUsers: 0,
    solvedQuestions: 0,
    onlineUsers: new Set()
  });

  useEffect(() => {
    loadStats();
    
    // Set up real-time subscriptions
    const postsChannel = supabase
      .channel('posts-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => loadStats()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        () => loadStats()
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => loadStats()
      )
      .subscribe();

    // Presence for online users
    const presenceChannel = supabase.channel('community-presence')
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        const onlineUsers = new Set(Object.keys(newState));
        setStats(prev => ({ ...prev, onlineUsers, activeUsers: onlineUsers.size }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setStats(prev => {
          const newOnlineUsers = new Set(prev.onlineUsers);
          newOnlineUsers.add(key);
          return { ...prev, onlineUsers: newOnlineUsers, activeUsers: newOnlineUsers.size };
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setStats(prev => {
          const newOnlineUsers = new Set(prev.onlineUsers);
          newOnlineUsers.delete(key);
          return { ...prev, onlineUsers: newOnlineUsers, activeUsers: newOnlineUsers.size };
        });
      })
      .subscribe();

    // Track current user presence
    const trackPresence = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await presenceChannel.track({
          user_id: session.user.id,
          online_at: new Date().toISOString(),
        });
      }
    };

    trackPresence();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  const loadStats = async () => {
    try {
      // Get total members count
      const { count: membersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total posts count
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      // Get posts this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { count: weeklyPostsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      // Get solved questions count
      const { count: solvedCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_solved', true);

      setStats(prev => ({
        ...prev,
        totalMembers: membersCount || 0,
        totalPosts: postsCount || 0,
        postsThisWeek: weeklyPostsCount || 0,
        solvedQuestions: solvedCount || 0
      }));

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getActivityLevel = () => {
    const percentage = stats.totalMembers > 0 ? (stats.activeUsers / stats.totalMembers) * 100 : 0;
    if (percentage >= 70) return { text: 'Very Active', color: 'bg-green-100 text-green-800' };
    if (percentage >= 40) return { text: 'Active', color: 'bg-blue-100 text-blue-800' };
    if (percentage >= 20) return { text: 'Moderate', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Low Activity', color: 'bg-gray-100 text-gray-800' };
  };

  const activity = getActivityLevel();

  return (
    <div className="space-y-4">
      {/* Real-time header stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{formatNumber(stats.totalMembers)} members</span>
          </div>
          <div className="flex items-center space-x-1">
            <MessageSquare className="h-4 w-4" />
            <span>{stats.postsThisWeek} posts this week</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{stats.activeUsers} online now</span>
          </div>
        </div>
        <Badge className={activity.color}>
          {activity.text}
        </Badge>
      </div>

      {/* Detailed stats card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Community Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Posts</span>
              <span className="font-semibold">{formatNumber(stats.totalPosts)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Online Now</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-green-600">{stats.activeUsers}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Questions Solved</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="font-semibold text-green-600">{stats.solvedQuestions}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This Week</span>
              <span className="font-semibold text-blue-600">{stats.postsThisWeek}</span>
            </div>
          </div>

          {/* Activity indicator */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Community Activity</span>
              <Badge variant="secondary" className={activity.color}>
                {activity.text}
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (stats.activeUsers / Math.max(1, stats.totalMembers)) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick activity indicators */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="font-semibold text-green-700">{stats.postsThisWeek}</div>
          <div className="text-green-600">Posts This Week</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="font-semibold text-blue-700">{((stats.solvedQuestions / Math.max(1, stats.totalPosts)) * 100).toFixed(0)}%</div>
          <div className="text-blue-600">Solution Rate</div>
        </div>
      </div>
    </div>
  );
};

export default CommunityStats;