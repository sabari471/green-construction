import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Reply, 
  Send, 
  CheckCircle,
  User,
  Clock 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PostCommentsProps {
  postId: string;
  userProfile: any;
  onReplyCountChange: (newCount: number) => void;
}

const PostComments = ({ postId, userProfile, onReplyCountChange }: PostCommentsProps) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:author_id (
            id,
            display_name,
            role,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
      onReplyCountChange(data?.length || 0);
    } catch (error) {
      console.error('Error loading comments:', error);
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

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !userProfile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: userProfile.id,
          content: newComment.trim(),
          parent_id: replyTo?.id || null
        })
        .select(`
          *,
          profiles:author_id (
            id,
            display_name,
            role,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      setComments([...comments, data]);
      setNewComment("");
      setReplyTo(null);
      onReplyCountChange(comments.length + 1);

      toast({
        title: "Comment posted!",
        description: "Your comment has been added to the discussion.",
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error posting comment",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoteComment = async (commentId, voteType) => {
    if (!userProfile) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to vote on comments.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('post_votes')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', userProfile.id)
        .single();

      if (existingVote && existingVote.vote_type === voteType) {
        toast({
          title: "Already voted",
          description: "You already voted on this comment.",
          variant: "destructive",
        });
        return;
      }

      // Remove existing vote if different type
      if (existingVote) {
        await supabase
          .from('post_votes')
          .delete()
          .eq('id', existingVote.id);
      }

      // Add new vote
      await supabase
        .from('post_votes')
        .insert({
          comment_id: commentId,
          user_id: userProfile.id,
          vote_type: voteType
        });

      // Update comment vote counts
      const { data: comment } = await supabase
        .from('comments')
        .select('upvotes, downvotes')
        .eq('id', commentId)
        .single();

      const newUpvotes = voteType === 'upvote' 
        ? (comment.upvotes || 0) + 1 
        : existingVote?.vote_type === 'upvote' 
          ? Math.max(0, (comment.upvotes || 0) - 1)
          : (comment.upvotes || 0);

      const newDownvotes = voteType === 'downvote' 
        ? (comment.downvotes || 0) + 1 
        : existingVote?.vote_type === 'downvote' 
          ? Math.max(0, (comment.downvotes || 0) - 1)
          : (comment.downvotes || 0);

      await supabase
        .from('comments')
        .update({ 
          upvotes: newUpvotes,
          downvotes: newDownvotes
        })
        .eq('id', commentId);

      // Update local state
      setComments(comments.map(c => 
        c.id === commentId 
          ? { ...c, upvotes: newUpvotes, downvotes: newDownvotes }
          : c
      ));

      toast({
        title: `Comment ${voteType === 'upvote' ? 'upvoted' : 'downvoted'}!`,
        description: "Thank you for your feedback.",
      });
    } catch (error) {
      console.error('Error voting on comment:', error);
      toast({
        title: "Error voting",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const markAsSolution = async (commentId) => {
    if (!userProfile) return;

    try {
      await supabase
        .from('comments')
        .update({ is_solution: true })
        .eq('id', commentId);

      // Mark post as solved
      await supabase
        .from('posts')
        .update({ is_solved: true })
        .eq('id', postId);

      setComments(comments.map(c => 
        c.id === commentId 
          ? { ...c, is_solution: true }
          : c
      ));

      toast({
        title: "Solution marked!",
        description: "This comment has been marked as the solution.",
      });
    } catch (error) {
      console.error('Error marking solution:', error);
      toast({
        title: "Error",
        description: "Could not mark as solution.",
        variant: "destructive",
      });
    }
  };

  // Group comments by parent
  const parentComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      {userProfile && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmitComment} className="space-y-3">
              {replyTo && (
                <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-700">
                      Replying to <span className="font-medium">{replyTo.profiles?.display_name}</span>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {userProfile.avatar_url ? (
                    <AvatarImage src={userProfile.avatar_url} alt={userProfile.display_name} />
                  ) : (
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                      {userProfile.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyTo ? "Write a reply..." : "Share your thoughts..."}
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <Button 
                      type="submit" 
                      size="sm" 
                      disabled={!newComment.trim() || loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {replyTo ? 'Reply' : 'Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {parentComments.map((comment) => {
          const replies = getReplies(comment.id);
          
          return (
            <div key={comment.id} className="space-y-3">
              {/* Main Comment */}
              <Card className={comment.is_solution ? "border-green-400 bg-green-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {comment.profiles?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">
                          {comment.profiles?.display_name || 'Anonymous'}
                        </span>
                        {comment.profiles?.role === 'expert' && (
                          <Badge variant="secondary" className="text-xs">Expert</Badge>
                        )}
                        {comment.is_solution && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Solution
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(comment.created_at)}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <p className="text-gray-700 mb-3 text-sm leading-relaxed">
                        {comment.content}
                      </p>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 hover:bg-green-50 hover:text-green-600"
                            onClick={() => handleVoteComment(comment.id, 'upvote')}
                          >
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            <span className="text-xs">{comment.upvotes || 0}</span>
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleVoteComment(comment.id, 'downvote')}
                          >
                            <ThumbsDown className="h-3 w-3 mr-1" />
                            <span className="text-xs">{comment.downvotes || 0}</span>
                          </Button>
                        </div>
                        
                        {userProfile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setReplyTo(comment)}
                          >
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                          </Button>
                        )}
                        
                        {userProfile && !comment.is_solution && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs hover:bg-green-50 hover:text-green-600"
                            onClick={() => markAsSolution(comment.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark as Solution
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Replies */}
              {replies.length > 0 && (
                <div className="ml-8 space-y-3">
                  {replies.map((reply) => (
                    <Card key={reply.id} className="bg-gray-50">
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarImage src={reply.profiles?.avatar_url} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                              {reply.profiles?.display_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-xs">
                                {reply.profiles?.display_name || 'Anonymous'}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {formatTimeAgo(reply.created_at)}
                              </div>
                            </div>
                            
                            <p className="text-gray-700 text-xs leading-relaxed mb-2">
                              {reply.content}
                            </p>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 hover:bg-green-50 hover:text-green-600"
                                onClick={() => handleVoteComment(reply.id, 'upvote')}
                              >
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                <span className="text-xs">{reply.upvotes || 0}</span>
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleVoteComment(reply.id, 'downvote')}
                              >
                                <ThumbsDown className="h-3 w-3 mr-1" />
                                <span className="text-xs">{reply.downvotes || 0}</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {comments.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">No comments yet</p>
            {!userProfile && (
              <p className="text-sm text-gray-500">Sign in to start the discussion</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PostComments;