import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, StarHalf, ThumbsUp, ThumbsDown, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: string;
  product_id: string;
  reviewer?: {
    display_name: string;
    avatar_url: string;
  };
}

interface ProductReviewsProps {
  productId: string;
  currentUserId?: string;
  currentUserProfile?: any;
}

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const StarRating = ({ rating, size = 4, interactive = false, onChange }: StarRatingProps) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (interactive ? hoverRating || rating : rating) >= star;
        const halfFilled = (interactive ? hoverRating || rating : rating) >= star - 0.5 && (interactive ? hoverRating || rating : rating) < star;
        
        return (
          <button
            key={star}
            type="button"
            className={`focus:outline-none ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            onClick={() => interactive && onChange && onChange(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            disabled={!interactive}
          >
            {filled ? (
              <Star className={`h-${size} w-${size} fill-warning text-warning`} />
            ) : halfFilled ? (
              <StarHalf className={`h-${size} w-${size} fill-warning text-warning`} />
            ) : (
              <Star className={`h-${size} w-${size} text-muted-foreground`} />
            )}
          </button>
        );
      })}
    </div>
  );
};

const ReviewCard = ({ review }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="border border-border/40 hover:shadow-sm transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage 
              src={review.reviewer?.avatar_url} 
              alt={review.reviewer?.display_name || 'User'} 
            />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {(review.reviewer?.display_name || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">
                  {review.reviewer?.display_name || 'Anonymous User'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(review.created_at)}
                </p>
              </div>
              <StarRating rating={review.rating} size={4} />
            </div>
            
            {review.comment && (
              <p className="text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-lg">
                {review.comment}
              </p>
            )}
            
            <div className="flex items-center space-x-4 pt-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-success h-8">
                <ThumbsUp className="h-3 w-3 mr-1" />
                Helpful
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-8">
                <ThumbsDown className="h-3 w-3 mr-1" />
                Not helpful
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AddReviewModal = ({ isOpen, onClose, productId, onReviewAdded, currentUserProfile }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          reviewer_id: currentUserProfile.id,
          rating: rating,
          comment: comment.trim() || null
        })
        .select(`
          *,
          reviewer:profiles!reviewer_id(display_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      toast({
        title: "Review Added",
        description: "Thank you for your review!",
      });

      onReviewAdded(data);
      onClose();
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error adding review:', error);
      toast({
        title: "Error",
        description: "Failed to add review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            Share your experience with this product
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Your Rating *</Label>
            <div className="flex items-center space-x-2">
              <StarRating 
                rating={rating} 
                size={6} 
                interactive={true} 
                onChange={setRating} 
              />
              <span className="text-sm text-muted-foreground ml-2">
                {rating > 0 && `${rating} star${rating !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="comment">Your Review (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Tell others about your experience with this product..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary-hover"
              disabled={loading || rating === 0}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </div>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const ProductReviews = ({ productId, currentUserId, currentUserProfile }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReview, setShowAddReview] = useState(false);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: [0, 0, 0, 0, 0]
  });

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id(display_name, avatar_url)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      
      // Calculate stats
      const totalReviews = data?.length || 0;
      const averageRating = totalReviews > 0 
        ? data.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;
      
      const ratingDistribution = [0, 0, 0, 0, 0];
      data?.forEach(review => {
        ratingDistribution[review.rating - 1]++;
      });

      setStats({
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews,
        ratingDistribution
      });
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();

    // Set up real-time subscription for reviews
    const reviewsChannel = supabase
      .channel(`reviews-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `product_id=eq.${productId}`
        },
        () => {
          loadReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reviewsChannel);
    };
  }, [productId]);

  const handleReviewAdded = (newReview) => {
    setReviews(prev => [newReview, ...prev]);
    loadReviews(); // Reload to get updated stats
  };

  const userHasReviewed = reviews.some(review => review.reviewer_id === currentUserProfile?.id);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      <Card className="border border-border/40">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <span>Customer Reviews</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {stats.totalReviews > 0 ? (
            <>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">{stats.averageRating}</div>
                  <StarRating rating={stats.averageRating} size={5} />
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center space-x-3">
                      <span className="text-sm font-medium w-6">{star}</span>
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-warning rounded-full h-2 transition-all"
                          style={{
                            width: `${stats.totalReviews > 0 ? (stats.ratingDistribution[star - 1] / stats.totalReviews) * 100 : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">
                        {stats.ratingDistribution[star - 1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {currentUserId && !userHasReviewed && (
                <Button
                  onClick={() => setShowAddReview(true)}
                  className="w-full bg-primary hover:bg-primary-hover"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Write a Review
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
              <p className="text-muted-foreground mb-4">Be the first to share your experience!</p>
              {currentUserId && (
                <Button
                  onClick={() => setShowAddReview(true)}
                  className="bg-primary hover:bg-primary-hover"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Write the First Review
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">All Reviews ({reviews.length})</h3>
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      )}

      {/* Add Review Modal */}
      {currentUserId && (
        <AddReviewModal
          isOpen={showAddReview}
          onClose={() => setShowAddReview(false)}
          productId={productId}
          onReviewAdded={handleReviewAdded}
          currentUserProfile={currentUserProfile}
        />
      )}
    </div>
  );
};

export default ProductReviews;