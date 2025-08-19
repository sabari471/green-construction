import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { 
  Search, Plus, MessageSquare, ThumbsUp, Clock, User, CheckCircle, 
  Bell, Filter, TrendingUp, Users, Eye, Pin, Award, Heart, Send,
  LogIn, LogOut, UserPlus, X, Tag, Image, Link, ChevronDown, ChevronUp,
  Bookmark, BookmarkCheck, Share2, ExternalLink, AlertCircle, Zap, Home
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PostComments from "@/components/PostComments";
import CommunityStats from "@/components/CommunityStats";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";


const Community = () => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [trendingPosts, setTrendingPosts] = useState([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // New post form state
  const [newPost, setNewPost] = useState({
    title: "", 
    content: "", 
    post_type: "discussion", 
    category_id: "", 
    tags: ""
  });

  // Load data on component mount
  useEffect(() => {
    loadPosts();
    loadCategories();
    loadUserAuth();
    loadTrendingPosts();
    setupRealtimeSubscriptions();
    
    return () => {
      // Cleanup handled in setupRealtimeSubscriptions
    };
  }, []);

  const setupRealtimeSubscriptions = () => {
    // Posts real-time updates
    const postsChannel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          handleNewPost(payload.new);
          toast({
            title: "New discussion posted!",
            description: `"${payload.new.title}" by ${payload.new.author_name || 'Someone'}`,
            action: (
              <Button variant="outline" size="sm" onClick={() => {
                // Scroll to new post or highlight it
              }}>
                View
              </Button>
            ),
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          updatePost(payload.new);
        }
      )
      .subscribe();

    // Comments real-time updates  
    const commentsChannel = supabase
      .channel('comments-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          // Update reply count for the post
          setPosts(prev => prev.map(post => 
            post.id === payload.new.post_id 
              ? { ...post, reply_count: (post.reply_count || 0) + 1 }
              : post
          ));
        }
      )
      .subscribe();

    // Community presence tracking
    const presenceChannel = supabase.channel('community-presence')
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        setOnlineUsers(new Set(Object.keys(newState)));
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .subscribe();

    // Track current user presence
    if (user) {
      presenceChannel.track({
        user_id: user.id,
        display_name: userProfile?.display_name || user.email,
        online_at: new Date().toISOString(),
      });
    }

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(presenceChannel);
    };
  };

  const loadUserAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      setUserProfile(profile);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  };

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (
            id,
            display_name,
            role,
            avatar_url
          ),
          forum_categories:category_id (
            id,
            name,
            color
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
      
      // Also update view counts for posts
      if (data?.length > 0) {
        data.forEach(post => incrementViewCount(post.id));
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Error loading posts",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingPosts = async () => {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (
            id,
            display_name,
            role,
            avatar_url
          ),
          forum_categories:category_id (
            id,
            name,
            color
          )
        `)
        .gte('created_at', oneDayAgo.toISOString())
        .order('upvotes', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTrendingPosts(data || []);
    } catch (error) {
      console.error('Error loading trending posts:', error);
    }
  };

  const handleNewPost = (newPost) => {
    // Add the new post to the beginning of the posts array
    loadPosts(); // Reload to get full post data with joins
  };

  const updatePost = (updatedPost) => {
    setPosts(prev => prev.map(post => 
      post.id === updatedPost.id 
        ? { ...post, ...updatedPost }
        : post
    ));
  };

  const incrementViewCount = async (postId) => {
    try {
      await supabase.rpc('increment_view_count', { post_id: postId });
    } catch (error) {
      // Silently fail for view count increments
      console.log('View count increment failed:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Filter and sort posts
  const filteredAndSortedPosts = posts
    .filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
      const matchesCategory = selectedCategory === "all" || post.category_id === selectedCategory;
      const matchesType = selectedType === "all" || post.post_type === selectedType;
      
      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return (b.upvotes || 0) - (a.upvotes || 0);
        case "activity":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case "unanswered":
          return ((a.reply_count || 0) === 0 ? -1 : 1) - ((b.reply_count || 0) === 0 ? -1 : 1);
        default: // recent
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const getPostTypeColor = (type) => {
    switch (type) {
      case 'question': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'discussion': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'blog': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out successfully",
      description: "Come back soon!",
    });
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    if (newPost.title && newPost.content && newPost.category_id) {
      try {
        const tags = newPost.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        const { data, error } = await supabase
          .from('posts')
          .insert({
            title: newPost.title,
            content: newPost.content,
            post_type: newPost.post_type,
            tags: tags,
            author_id: userProfile.id,
            category_id: newPost.category_id
          })
          .select(`
            *,
            profiles:author_id (
              id,
              display_name,
              role,
              avatar_url
            ),
            forum_categories:category_id (
              id,
              name,
              color
            )
          `)
          .single();

        if (error) throw error;

        setPosts([data, ...posts]);
        setShowPostDialog(false);
        setNewPost({ title: "", content: "", post_type: "discussion", category_id: "", tags: "" });
        
        toast({
          title: "Post created successfully!",
          description: "Your post is now live in the community.",
        });
      } catch (error) {
        console.error('Error creating post:', error);
        toast({
          title: "Error creating post",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpvote = async (postId) => {
    if (!user || !userProfile) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to upvote posts.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('post_votes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userProfile.id)
        .single();

      if (existingVote) {
        toast({
          title: "Already voted",
          description: "You can only vote once per post.",
          variant: "destructive",
        });
        return;
      }

      // Add vote
      const { error: voteError } = await supabase
        .from('post_votes')
        .insert({
          post_id: postId,
          user_id: userProfile.id,
          vote_type: 'upvote'
        });

      if (voteError) throw voteError;

      // Get current post to update upvotes
      const { data: currentPost, error: fetchError } = await supabase
        .from('posts')
        .select('upvotes')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      // Update post upvotes count
      const { error: updateError } = await supabase
        .from('posts')
        .update({ upvotes: (currentPost.upvotes || 0) + 1 })
        .eq('id', postId);

      if (updateError) throw updateError;

      // Update local state
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, upvotes: (post.upvotes || 0) + 1 }
          : post
      ));

      toast({
        title: "Post upvoted!",
        description: "Thank you for your feedback.",
      });
    } catch (error) {
      console.error('Error upvoting post:', error);
      toast({
        title: "Error upvoting post",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const togglePostExpansion = (postId) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleReplyCountChange = (postId, newCount) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, reply_count: newCount }
        : post
    ));
  };

  const toggleBookmark = async (postId) => {
    if (!user || !userProfile) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to bookmark posts.",
        variant: "destructive",
      });
      return;
    }

    try {
      const isBookmarked = bookmarkedPosts.has(postId);
      
      if (isBookmarked) {
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', userProfile.id)
          .eq('product_id', postId);
        
        setBookmarkedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        
        toast({
          title: "Bookmark removed",
          description: "Post removed from your bookmarks.",
        });
      } else {
        await supabase
          .from('wishlists')
          .insert({
            user_id: userProfile.id,
            product_id: postId
          });
        
        setBookmarkedPosts(prev => new Set([...prev, postId]));
        
        toast({
          title: "Post bookmarked!",
          description: "Post added to your bookmarks.",
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: "Error",
        description: "Could not update bookmark.",
        variant: "destructive",
      });
    }
  };

  const sharePost = async (post) => {
    const shareUrl = `${window.location.origin}/community#post-${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.content.substring(0, 100) + '...',
          url: shareUrl,
        });
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copied!",
        description: "Post link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Professional Hero Header */}
      <div className="relative bg-gradient-to-br from-primary via-primary-variant to-accent py-20 lg:py-24 overflow-hidden">
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary-foreground/20 to-transparent" />
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-primary/20 rounded-full blur-2xl animate-pulse delay-1000" />
        </div>
        
        <div className="container mx-auto px-4 lg:px-6 max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 backdrop-blur-sm">
                  <Users className="h-3 w-3 mr-1" />
                  Professional Engineering Community
                </Badge>
                <h1 className="text-4xl lg:text-7xl font-bold text-primary-foreground leading-tight">
                  Engineering 
                  <span className="block text-accent-foreground bg-gradient-to-r from-accent-foreground to-primary-foreground bg-clip-text">
                    Excellence Together
                  </span>
                </h1>
                <p className="text-xl lg:text-2xl text-primary-foreground/90 leading-relaxed font-light">
                  Connect with professional civil engineers worldwide. Share knowledge, solve challenges, 
                  and advance the field of sustainable construction through collaborative innovation.
                </p>
              </div>
              
              <div className="pt-6">
                <CommunityStats />
              </div>
            </div>
            
            {/* Enhanced Community Features Grid */}
            <div className="grid grid-cols-2 gap-6">
              {[
                {
                  icon: MessageSquare,
                  title: "Technical Discussions",
                  description: "Share project challenges and innovative solutions",
                  color: "text-blue-400"
                },
                {
                  icon: Award,
                  title: "Expert Insights",
                  description: "Learn from certified industry professionals",
                  color: "text-yellow-400"
                },
                {
                  icon: CheckCircle,
                  title: "Verified Solutions",
                  description: "Get peer-reviewed answers from experts",
                  color: "text-green-400"
                },
                {
                  icon: TrendingUp,
                  title: "Industry Trends",
                  description: "Stay updated with latest developments",
                  color: "text-purple-400"
                }
              ].map((feature, index) => (
                <Card key={index} className="bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm p-6 hover:bg-primary-foreground/15 transition-all duration-300 group">
                  <CardContent className="p-0 space-y-4">
                    <feature.icon className={`h-8 w-8 ${feature.color} group-hover:scale-110 transition-transform duration-300`} />
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-primary-foreground">{feature.title}</div>
                      <div className="text-sm text-primary-foreground/80 leading-relaxed">{feature.description}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-6 py-8 max-w-7xl">
        {/* Action Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 pt-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Community Discussions</h2>
            <p className="text-muted-foreground text-base lg:text-lg">
              Join conversations that shape the future of construction
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex items-center space-x-3 lg:space-x-4">
            {user && userProfile ? (
              <>
                <div className="hidden lg:flex items-center space-x-3 bg-card/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-border/40">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    {userProfile.avatar_url ? (
                      <AvatarImage src={userProfile.avatar_url} alt={userProfile.display_name} />
                    ) : (
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {userProfile.display_name?.charAt(0) || user.email?.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground">{userProfile.display_name || user.email}</div>
                    <div className="text-xs text-muted-foreground">{userProfile.role || 'Member'}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="border-border/60 hover:bg-muted/60">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
                <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-elegant h-10 px-6 font-semibold">
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">New Discussion</span>
                      <span className="sm:hidden">Post</span>
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleSignIn} className="border-border/60 hover:bg-muted/60">
                  <LogIn className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Sign In</span>
                  <span className="sm:hidden">Login</span>
                </Button>
                <Button size="sm" onClick={handleSignIn} className="bg-primary hover:bg-primary-hover shadow-elegant">
                  <UserPlus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Join Community</span>
                  <span className="sm:hidden">Join</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Professional Login Prompt */}
        {!user && (
          <Card className="mb-8 border-accent/30 bg-gradient-to-r from-accent-soft to-info-soft shadow-card">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-accent" />
                    <h3 className="font-bold text-accent-foreground">Join Our Professional Network</h3>
                  </div>
                  <p className="text-accent-foreground/80 leading-relaxed">
                    Connect with certified engineers, participate in technical discussions, and advance your career. 
                    Unlock exclusive access to industry insights and project collaborations.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <Button variant="outline" size="sm" onClick={handleSignIn} className="border-accent/40 text-accent hover:bg-accent/10">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                  <Button size="sm" onClick={handleSignIn} className="bg-accent hover:bg-accent-hover text-accent-foreground shadow-card">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Free
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden">
            <Button 
              variant="outline" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mb-4 w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              {sidebarOpen ? 'Hide' : 'Show'} Filters
            </Button>
          </div>

          {/* Sidebar */}
          <div className={`lg:col-span-1 space-y-6 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
            {/* Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Button
                  variant={selectedCategory === "all" ? "default" : "ghost"}
                  className="w-full justify-start text-sm"
                  onClick={() => setSelectedCategory("all")}
                >
                  All Categories
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {posts.length}
                  </Badge>
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "ghost"}
                    className="w-full justify-start text-sm"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-3"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate">{category.name}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {category.post_count || 0}
                    </Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Real-time Community Stats */}
            <div className="hidden lg:block">
              <CommunityStats />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search posts, tags, or content..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Tabs value={selectedType} onValueChange={setSelectedType} className="flex-1">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                        <TabsTrigger value="question" className="text-xs">Questions</TabsTrigger>
                        <TabsTrigger value="discussion" className="text-xs">Discussions</TabsTrigger>
                        <TabsTrigger value="blog" className="text-xs">Articles</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="popular">Most Popular</SelectItem>
                        <SelectItem value="activity">Latest Activity</SelectItem>
                        <SelectItem value="unanswered">Unanswered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts List */}
            <div className="space-y-4">
              {filteredAndSortedPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-all duration-200 border-l-4" style={{ borderLeftColor: post.forum_categories?.color || '#3b82f6' }}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex gap-3 lg:gap-4">
                      {/* User Avatar - Hidden on mobile */}
                      <Avatar className="h-8 w-8 lg:h-10 lg:w-10 flex-shrink-0 hidden sm:block">
                        <AvatarImage src={post.profiles?.avatar_url} />
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {post.profiles?.display_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      {/* Post Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {post.is_pinned && <Pin className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />}
                          <Badge className={`${getPostTypeColor(post.post_type)} text-xs font-medium`}>
                            {post.post_type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs hidden sm:inline-flex"
                            style={{ borderColor: post.forum_categories?.color || '#3b82f6', color: post.forum_categories?.color || '#3b82f6' }}
                          >
                            {post.forum_categories?.name || 'General'}
                          </Badge>
                          {post.is_solved && post.post_type === 'question' && (
                            <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Solved
                            </Badge>
                          )}
                        </div>

                        {/* Title */}
                        <h3 
                          className="text-base lg:text-lg font-semibold mb-2 hover:text-blue-600 cursor-pointer line-clamp-2"
                          onClick={() => togglePostExpansion(post.id)}
                        >
                          {post.title}
                        </h3>

                        {/* Content Preview */}
                        <p className="text-gray-600 mb-3 lg:mb-4 line-clamp-2 text-sm leading-relaxed">
                          {post.content}
                        </p>

                        {/* Tags - Show fewer on mobile */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3 lg:mb-4">
                            {post.tags.slice(0, window.innerWidth < 640 ? 2 : 4).map((tag, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="text-xs px-2 py-1 hover:bg-gray-200 cursor-pointer"
                                onClick={() => setSearchTerm(tag)}
                              >
                                #{tag}
                              </Badge>
                            ))}
                            {post.tags.length > (window.innerWidth < 640 ? 2 : 4) && (
                              <Badge variant="secondary" className="text-xs">
                                +{post.tags.length - (window.innerWidth < 640 ? 2 : 4)} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs lg:text-sm mb-3">
                          <div className="flex items-center space-x-2 lg:space-x-4 text-gray-500">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span className="font-medium text-gray-700 truncate max-w-24 lg:max-w-none">{post.profiles?.display_name || 'Anonymous'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTimeAgo(post.created_at)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 lg:space-x-4">
                            <div className="flex items-center space-x-1 text-gray-500">
                              <Eye className="h-3 w-3" />
                              <span>{post.view_count || 0}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 lg:h-8 px-2 hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => togglePostExpansion(post.id)}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              <span className="text-xs">{post.reply_count || 0}</span>
                              {expandedPosts.has(post.id) ? (
                                <ChevronUp className="h-3 w-3 ml-1" />
                              ) : (
                                <ChevronDown className="h-3 w-3 ml-1" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 lg:h-8 px-2 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleUpvote(post.id)}
                            >
                              <Heart className="h-3 w-3 mr-1" />
                              <span className="text-xs">{post.upvotes || 0}</span>
                            </Button>
                          </div>
                        </div>

                        {/* Expandable Comments Section */}
                        {expandedPosts.has(post.id) && (
                          <div className="border-t pt-4">
                            <PostComments 
                              postId={post.id} 
                              userProfile={userProfile}
                              onReplyCountChange={(newCount) => handleReplyCountChange(post.id, newCount)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {filteredAndSortedPosts.length === 0 && !loading && (
              <Card className="text-center py-8 lg:py-12">
                <CardContent>
                  <MessageSquare className="h-8 w-8 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-2">
                    No posts found
                  </h3>
                  <p className="text-sm lg:text-base text-gray-600 mb-6">
                    Try adjusting your search criteria or be the first to start a discussion!
                  </p>
                  {user ? (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowPostDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Post
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleSignIn}>
                      Sign In to Create Post
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>


        {/* Create Post Dialog */}
        <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
              <DialogDescription>
                Share your thoughts, ask questions, or start a discussion with the community.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <Label htmlFor="post-title">Title</Label>
                <Input
                  id="post-title"
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  placeholder="What's your question or topic?"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="post-type">Post Type</Label>
                  <Select value={newPost.post_type} onValueChange={(value) => setNewPost({...newPost, post_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="discussion">Discussion</SelectItem>
                      <SelectItem value="blog">Article/Blog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                 <div>
                   <Label htmlFor="post-category">Category</Label>
                   <Select value={newPost.category_id} onValueChange={(value) => setNewPost({...newPost, category_id: value})}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select category" />
                     </SelectTrigger>
                     <SelectContent>
                       {categories.map((category) => (
                         <SelectItem key={category.id} value={category.id}>
                           {category.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
              </div>

              <div>
                <Label htmlFor="post-content">Content</Label>
                <Textarea
                  id="post-content"
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  placeholder="Describe your question or share your thoughts in detail..."
                  rows={6}
                  required
                />
              </div>

              <div>
                <Label htmlFor="post-tags">Tags (comma-separated)</Label>
                <Input
                  id="post-tags"
                  type="text"
                  value={newPost.tags}
                  onChange={(e) => setNewPost({...newPost, tags: e.target.value})}
                  placeholder="concrete, sustainability, project-management"
                />
                <p className="text-xs text-gray-500 mt-1">Add relevant tags to help others find your post</p>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="submit" className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Publish Post
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPostDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Community;