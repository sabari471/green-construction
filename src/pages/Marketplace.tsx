import { useState, useEffect, createContext, useContext, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, Filter, Heart, ShoppingCart, MapPin, Star, Leaf, 
  User, Package, Truck, CreditCard, Plus, Minus, X, Menu,
  ShoppingBag, Bell, Settings, LogOut, ChevronDown, Eye,
  ArrowLeft, CheckCircle, Clock, AlertCircle, Upload, Camera,
  Home, StarHalf, MessageCircle, ThumbsUp, ThumbsDown, Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User as SupabaseUser } from "@supabase/supabase-js";
import ProductReviews from "@/components/ProductReviews";

// Types
interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  unit: string;
  condition: string;
  location: string;
  co2_savings: number;
  images: string[];
  stock_quantity: number;
  rating: number;
  reviews_count: number;
  seller: {
    id: string;
    display_name: string;
    location: string;
    rating: number;
  };
  category: {
    name: string;
  };
  isLiked?: boolean;
}

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

interface CartItem {
  product: Product;
  quantity: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface Order {
  id: string;
  date: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: CartItem[];
}

// App Context for global state
const AppContext = createContext(null);

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.products };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.product] };
    case 'TOGGLE_LIKE':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.productId 
            ? { ...p, isLiked: !p.isLiked }
            : p
        )
      };
    case 'ADD_TO_CART':
      const existingItem = state.cart.find(item => item.product.id === action.product.id);
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.product.id === action.product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        };
      }
      return {
        ...state,
        cart: [...state.cart, { product: action.product, quantity: 1 }]
      };
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item.product.id !== action.productId)
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(item =>
          item.product.id === action.productId
            ? { ...item, quantity: Math.max(0, action.quantity) }
            : item
        ).filter(item => item.quantity > 0)
      };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'ADD_ORDER':
      return { ...state, orders: [...state.orders, action.order] };
    default:
      return state;
  }
};

const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, {
    products: [],
    cart: [],
    orders: [],
    user: null
  });

  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState(null);
  const { toast } = useToast();

  // Initialize auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setCurrentUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Load products from Supabase with real ratings
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data: products, error } = await supabase
          .from('products')
          .select(`
            *,
            seller:profiles!seller_id(*),
            category:categories(*)
          `)
          .eq('status', 'active');

        if (error) throw error;
        
        // Get ratings for each product
        const productsWithRatings = await Promise.all(
          (products || []).map(async (product) => {
            const { data: reviews } = await supabase
              .from('reviews')
              .select('rating')
              .eq('product_id', product.id);
            
            const avgRating = reviews && reviews.length > 0 
              ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
              : 0;
            
            return {
              ...product,
              isLiked: false,
              rating: Number(avgRating.toFixed(1)),
              reviews_count: reviews?.length || 0
            };
          })
        );

        dispatch({ type: 'SET_PRODUCTS', products: productsWithRatings });
      } catch (error) {
        console.error('Error loading products:', error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive"
        });
      }
    };

    loadProducts();

    // Set up real-time subscriptions
    const productsChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          loadProducts(); // Reload products on any change
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews'
        },
        () => {
          loadProducts(); // Reload products when reviews change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
    };
  }, [toast]);

  const addProduct = async (productData) => {
    if (!currentUser || !profile) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add products",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          seller_id: profile.id
        })
        .select(`
          *,
          seller:profiles!seller_id(*),
          category:categories(*)
        `)
        .single();

      if (error) throw error;

      const formattedProduct = {
        ...data,
        isLiked: false,
        rating: 0,
        reviews_count: 0
      };

      dispatch({ type: 'ADD_PRODUCT', product: formattedProduct });
      
      toast({
        title: "Success",
        description: "Product added successfully!",
      });
      
      return true;
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive"
      });
      return false;
    }
  };
  const toggleLike = (productId) => dispatch({ type: 'TOGGLE_LIKE', productId });
  const addToCart = (product) => dispatch({ type: 'ADD_TO_CART', product });
  const removeFromCart = (productId) => dispatch({ type: 'REMOVE_FROM_CART', productId });
  const updateQuantity = (productId, quantity) => dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const addOrder = (order) => dispatch({ type: 'ADD_ORDER', order });
  
  const getCartTotal = () => {
    return state.cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };
  
  const getCartCount = () => {
    return state.cart.reduce((count, item) => count + item.quantity, 0);
  };
  
  return (
    <AppContext.Provider value={{
      ...state,
      currentUser,
      profile,
      addProduct,
      toggleLike,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      addOrder,
      getCartTotal,
      getCartCount
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Professional Product Card Component
const ProductCard = ({ product, onAddToCart, onViewDetails, onToggleLike }) => (
  <Card className="group hover:shadow-elegant transition-all duration-500 border border-border/40 bg-card/50 backdrop-blur-sm animate-fade-in">
    <div className="relative h-56 bg-gradient-to-br from-muted to-secondary rounded-t-lg overflow-hidden">
      <img
        src={product.images[0] || '/placeholder.svg'}
        alt={product.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      
      {/* Professional Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Action Buttons */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        <Button
          size="sm"
          variant="secondary"
          className={`h-10 w-10 p-0 backdrop-blur-lg border shadow-elegant rounded-full ${
            product.isLiked 
              ? 'bg-primary/90 text-primary-foreground border-primary/30' 
              : 'bg-white/90 text-foreground hover:bg-white border-white/30'
          }`}
          onClick={() => onToggleLike(product.id)}
        >
          <Heart className={`h-4 w-4 ${product.isLiked ? 'fill-current' : ''}`} />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-10 w-10 p-0 backdrop-blur-lg bg-white/90 border border-white/30 shadow-elegant hover:bg-white rounded-full"
          onClick={() => onViewDetails(product)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Status Badges */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        {product.condition !== 'new' && (
          <Badge className="bg-success text-success-foreground border-success/30 font-medium shadow-sm">
            <div className="w-1.5 h-1.5 bg-success-foreground rounded-full mr-1.5" />
            {product.condition}
          </Badge>
        )}
        
        {product.co2_savings > 0 && (
          <Badge className="bg-success/10 text-success border border-success/20 shadow-sm backdrop-blur-sm">
            <Leaf className="h-3 w-3 mr-1" />
            {product.co2_savings}kg CO₂ saved
          </Badge>
        )}
      </div>
      
      {/* Professional Stock Indicator */}
      <div className="absolute bottom-4 left-4">
        <Badge 
          variant="outline" 
          className={`backdrop-blur-lg border shadow-sm ${
            product.stock_quantity > 10 
              ? 'bg-success/10 text-success border-success/30' 
              : 'bg-warning/10 text-warning border-warning/30'
          }`}
        >
          {product.stock_quantity} in stock
        </Badge>
      </div>
    </div>

    <CardHeader className="p-6 pb-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <CardTitle className="text-lg line-clamp-2 font-semibold text-card-foreground group-hover:text-primary transition-colors duration-300 leading-tight">
          {product.title}
        </CardTitle>
        <div className="flex items-center bg-warning/10 text-warning px-2 py-1 rounded-lg shrink-0 border border-warning/20">
          <Star className="h-3.5 w-3.5 fill-warning text-warning mr-1" />
          <span className="font-medium text-sm">{product.rating}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary/60" />
          <span className="font-medium">{product.seller.location}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {product.reviews_count} reviews
        </div>
      </div>
    </CardHeader>

    <CardContent className="p-6 pt-0 space-y-5">
      <CardDescription className="line-clamp-2 text-muted-foreground leading-relaxed text-sm">
        {product.description}
      </CardDescription>

      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="text-3xl font-bold text-primary">
            ₹{product.price.toLocaleString('en-IN')}
          </div>
          <div className="text-sm text-muted-foreground">
            per {product.unit}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-success flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Available
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button 
          size="sm" 
          className="flex-1 h-10 bg-primary hover:bg-primary-hover text-primary-foreground shadow-elegant font-medium transition-all duration-200"
          onClick={() => onAddToCart(product)}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="px-6 h-10 border-border/60 hover:bg-muted/60 transition-all duration-200"
          onClick={() => onViewDetails(product)}
        >
          Details
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Add Product Modal
const AddProductModal = ({ isOpen, onClose, onAddProduct }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    unit: '',
    condition: 'new',
    location: '',
    co2_savings: '',
    stock_quantity: '',
    category_id: null,
    images: []
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*');
        
        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let imageUrls = [];
      
      // Upload images if any are selected
      if (selectedImages.length > 0) {
        setUploadingImages(true);
        imageUrls = await uploadImages(selectedImages);
      }
      
      const productData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        unit: formData.unit,
        condition: formData.condition,
        location: formData.location,
        co2_savings: parseInt(formData.co2_savings) || 0,
        images: imageUrls,
        stock_quantity: parseInt(formData.stock_quantity),
        category_id: formData.category_id,
        status: 'active'
      };

      const success = await onAddProduct(productData);
      
      if (success) {
        // Reset form
        setFormData({
          title: '',
          description: '',
          price: '',
          unit: '',
          condition: 'new',
          location: '',
          co2_savings: '',
          stock_quantity: '',
          category_id: null,
          images: []
        });
        setSelectedImages([]);
        onClose();
      }
    } catch (error) {
      console.error('Error submitting product:', error);
      console.error('Failed to add product');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedImages(files);
      // Create preview URLs
      const previews = files.map((file: File) => URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, images: previews }));
    }
  };

  const uploadImages = async (files) => {
    const uploadedUrls = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            List your sustainable construction material or equipment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Product Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select value={formData.unit} onValueChange={(value) => handleChange('unit', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">Piece</SelectItem>
                  <SelectItem value="sqft">Square Feet</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="ton">Ton</SelectItem>
                  <SelectItem value="meter">Meter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="condition">Condition *</Label>
              <Select value={formData.condition} onValueChange={(value) => handleChange('condition', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reusable">Reusable</SelectItem>
                  <SelectItem value="refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category_id} onValueChange={(value) => handleChange('category_id', value)}>
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

            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="City, State"
                required
              />
            </div>

            <div>
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => handleChange('stock_quantity', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="co2">CO₂ Savings (kg)</Label>
              <Input
                id="co2"
                type="number"
                value={formData.co2_savings}
                onChange={(e) => handleChange('co2_savings', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">Product Images</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <label htmlFor="images" className="cursor-pointer">
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Click to upload product images
                  </p>
                  <p className="text-xs text-gray-400">
                    Upload multiple images to showcase your product
                  </p>
                </div>
              </label>
            </div>
            
            {formData.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                      onClick={() => {
        const newImages = formData.images.filter((_, i) => i !== index);
        const newFiles = selectedImages.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, images: newImages }));
        setSelectedImages(newFiles);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary" disabled={loading || uploadingImages}>
              {loading || uploadingImages ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {uploadingImages ? 'Uploading Images...' : 'Adding Product...'}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Header Component  
const Header = ({ user, cartCount, onCartOpen, onAddProduct, currentUser, profile, onAuth }) => {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">GreenConstructHub</span>
              </div>
              
              {/* Home Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center space-x-1 hover:bg-primary/10 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              {currentUser && (
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAddProduct(true)}
                  className="bg-success/10 text-success hover:bg-success/20 border border-success/20"
                  data-sell-button
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Sell Product
                </Button>
              )}
              <a href="#categories" className="text-muted-foreground hover:text-primary transition-colors font-medium">Categories</a>
              <a href="#about" className="text-muted-foreground hover:text-primary transition-colors font-medium">About</a>
            </nav>

            <div className="flex items-center space-x-4">
              {currentUser && (
                <>
                  <Button variant="ghost" size="sm" className="relative hover:bg-muted/60">
                    <Bell className="h-5 w-5" />
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-primary text-primary-foreground">3</Badge>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="relative hover:bg-muted/60"
                    onClick={onCartOpen}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-primary text-primary-foreground">
                        {cartCount}
                      </Badge>
                    )}
                  </Button>

                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </>
              )}

              {!currentUser && (
                <Button onClick={onAuth} className="bg-primary hover:bg-primary-hover">
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {currentUser && (
        <AddProductModal
          isOpen={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          onAddProduct={onAddProduct}
        />
      )}
    </>
  );
};

// Cart Sidebar Component
const CartSidebar = ({ isOpen, onClose, cart, updateQuantity, removeFromCart, total, onCheckout }) => (
  <div className={`fixed inset-0 z-50 ${isOpen ? 'visible' : 'invisible'}`}>
    <div 
      className={`absolute inset-0 bg-black/50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    />
    <div className={`absolute right-0 top-0 h-full w-96 bg-white shadow-xl transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Shopping Cart ({cart.length})</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center space-x-4 border-b pb-4">
                <img 
                  src={item.product.images[0]} 
                  alt={item.product.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-medium line-clamp-1">{item.product.title}</h3>
                  <p className="text-sm text-gray-500">${item.product.price}/{item.product.unit}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {cart.length > 0 && (
        <div className="border-t p-6 space-y-4">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <Button className="w-full" onClick={onCheckout}>
            <CreditCard className="h-4 w-4 mr-2" />
            Proceed to Checkout
          </Button>
        </div>
      )}
    </div>
  </div>
);

// Product Detail Modal
const ProductDetailModal = ({ product, isOpen, onClose, onAddToCart, currentUser, currentUserProfile }) => {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{product.title}</DialogTitle>
          <DialogDescription>
            Sold by {product.seller.display_name} in {product.seller.location}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <img 
              src={product.images[0]} 
              alt={product.title}
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-primary">
                ${product.price}
                <span className="text-sm font-normal text-gray-500">
                  /{product.unit}
                </span>
              </div>
              <Badge variant={product.condition === 'new' ? 'default' : 'secondary'}>
                {product.condition}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                <span>{product.rating} ({product.reviews_count} reviews)</span>
              </div>
              {product.co2_savings > 0 && (
                <div className="flex items-center text-green-600">
                  <Leaf className="h-4 w-4 mr-1" />
                  {product.co2_savings}kg CO₂ saved
                </div>
              )}
            </div>
            
            <p className="text-gray-600">{product.description}</p>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Stock: {product.stock_quantity} units</span>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                <span className="text-sm">{product.location}</span>
              </div>
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Payment Integration Component
const PaymentModal = ({ isOpen, onClose, amount, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState({
    upiId: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  });

  const handlePayment = async () => {
    setProcessing(true);
    
    // Simulate payment processing to onlinepayments.ai@okicici
    setTimeout(() => {
      setProcessing(false);
      onSuccess();
    }, 2000);
  };

  const handleInputChange = (field, value) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Total Amount: ${amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upi">UPI Payment</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'upi' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  placeholder="Enter UPI ID"
                  value={paymentData.upiId}
                  onChange={(e) => handleInputChange('upiId', e.target.value)}
                />
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Payment will be processed to:</strong><br />
                  onlinepayments.ai@okicici
                </p>
              </div>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="nameOnCard">Name on Card</Label>
                <Input
                  id="nameOnCard"
                  value={paymentData.nameOnCard}
                  onChange={(e) => handleInputChange('nameOnCard', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={paymentData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    placeholder="MM/YY"
                    value={paymentData.expiryDate}
                    onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={paymentData.cvv}
                    onChange={(e) => handleInputChange('cvv', e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Secure Payment Gateway</strong><br />
                  Your payment is processed securely through our payment partner.
                </p>
              </div>
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={handlePayment}
            disabled={processing}
          >
            {processing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${amount.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Checkout Modal
const CheckoutModal = ({ isOpen, onClose, cart, total, onOrderComplete }) => {
  const [step, setStep] = useState(1);
  const [showPayment, setShowPayment] = useState(false);
  const [orderData, setOrderData] = useState({
    shipping: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  const handleInputChange = (section, field, value) => {
    setOrderData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handlePaymentSuccess = () => {
    const newOrder = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      total,
      status: 'pending',
      items: cart
    };
    
    onOrderComplete(newOrder);
    setShowPayment(false);
    setStep(3); // Success step
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <div className="flex items-center space-x-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s === step ? 'bg-primary text-white' : 
                    s < step ? 'bg-green-500 text-white' : 
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {s < step ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                  {s < 3 && <div className="w-8 h-0.5 bg-gray-200 mx-2" />}
                </div>
              ))}
            </div>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order Summary</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="font-medium">{item.product.title}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-lg font-semibold pt-2 border-t">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>
                Continue to Shipping
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Shipping Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName"
                    value={orderData.shipping.firstName}
                    onChange={(e) => handleInputChange('shipping', 'firstName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName"
                    value={orderData.shipping.lastName}
                    onChange={(e) => handleInputChange('shipping', 'lastName', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={orderData.shipping.email}
                    onChange={(e) => handleInputChange('shipping', 'email', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address"
                    value={orderData.shipping.address}
                    onChange={(e) => handleInputChange('shipping', 'address', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city"
                    value={orderData.shipping.city}
                    onChange={(e) => handleInputChange('shipping', 'city', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input 
                    id="zipCode"
                    value={orderData.shipping.zipCode}
                    onChange={(e) => handleInputChange('shipping', 'zipCode', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={() => setShowPayment(true)}>
                  Proceed to Payment
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4 py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold">Order Placed Successfully!</h3>
              <p className="text-gray-600">
                Your order has been placed and payment processed. 
                You'll receive an email confirmation shortly.
              </p>
              <Button onClick={onClose} className="w-full">
                Continue Shopping
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        amount={total}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
};

// Main E-commerce Platform Component
const EcommercePlatform = () => {
  const {
    products,
    cart,
    user,
    currentUser,
    profile,
    addProduct,
    toggleLike,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    addOrder,
    getCartTotal,
    getCartCount
  } = useContext(AppContext);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [showFilters, setShowFilters] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  const categories = [
    { id: '1', name: 'Steel & Metal' },
    { id: '2', name: 'Flooring' },
    { id: '3', name: 'Wood' },
    { id: '4', name: 'Energy Systems' }
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category?.name === selectedCategory;
    const matchesCondition = selectedCondition === "all" || product.condition === selectedCondition;
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    
    return matchesSearch && matchesCategory && matchesCondition && matchesPrice;
  });

  const handleAddToCart = (product) => {
    if (!currentUser) {
      window.location.href = '/auth';
      return;
    }
    addToCart(product);
    // Show success message (in real app would use toast)
    alert(`${product.title} added to cart!`);
  };

  const handleAuthRequired = () => {
    window.location.href = '/auth';
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setIsProductDetailOpen(true);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderComplete = (order) => {
    addOrder(order);
    clearCart();
    setIsCheckoutOpen(false);
    alert('Order placed successfully!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        user={user}
        currentUser={currentUser}
        profile={profile}
        cartCount={getCartCount()}
        onCartOpen={() => setIsCartOpen(true)}
        onAddProduct={addProduct}
        onAuth={handleAuthRequired}
      />

      <main className="container mx-auto px-4 lg:px-6 py-8 max-w-7xl">
        {/* Professional Hero Section */}
        <div className="relative bg-gradient-to-br from-primary via-primary-variant to-accent rounded-3xl p-8 lg:p-12 mb-12 overflow-hidden shadow-strong">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary-foreground/20 to-transparent" />
            <div className="absolute top-1/4 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-primary-foreground/20 rounded-full blur-2xl" />
          </div>
          
          <div className="relative max-w-4xl">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 backdrop-blur-sm">
                    <Leaf className="h-3 w-3 mr-1" />
                    Sustainable Construction Hub
                  </Badge>
                  <h1 className="text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight">
                    Professional 
                    <span className="block text-accent-foreground">Construction Materials</span>
                  </h1>
                  <p className="text-xl text-primary-foreground/90 leading-relaxed">
                    Discover certified eco-friendly materials and equipment for your construction projects. 
                    Connect with verified suppliers and build a sustainable future.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-card h-12 px-8 font-semibold"
                    onClick={() => {
                      const productsSection = document.querySelector('[data-products-section]');
                      productsSection?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <Package className="h-5 w-5 mr-2" />
                    Explore Products
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 backdrop-blur-sm h-12 px-8"
                    onClick={() => {
                      if (currentUser) {
                        const sellButton = document.querySelector('[data-sell-button]') as HTMLButtonElement;
                        if (sellButton) {
                          sellButton.click();
                        }
                      } else {
                        handleAuthRequired();
                      }
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    List Your Products
                  </Button>
                </div>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm p-4">
                  <CardContent className="p-0 text-center">
                    <div className="text-2xl font-bold text-primary-foreground">{products.length}+</div>
                    <div className="text-sm text-primary-foreground/80">Active Products</div>
                  </CardContent>
                </Card>
                <Card className="bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm p-4">
                  <CardContent className="p-0 text-center">
                    <div className="text-2xl font-bold text-primary-foreground">500+</div>
                    <div className="text-sm text-primary-foreground/80">Verified Suppliers</div>
                  </CardContent>
                </Card>
                <Card className="bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm p-4">
                  <CardContent className="p-0 text-center">
                    <div className="text-2xl font-bold text-primary-foreground">95%</div>
                    <div className="text-sm text-primary-foreground/80">Customer Satisfaction</div>
                  </CardContent>
                </Card>
                <Card className="bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm p-4">
                  <CardContent className="p-0 text-center">
                    <div className="text-2xl font-bold text-primary-foreground">24/7</div>
                    <div className="text-sm text-primary-foreground/80">Support Available</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Search and Filters */}
        <div className="mb-12 space-y-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search construction materials, equipment, and more..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-base bg-card border-border/60 shadow-card focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:w-auto h-14 px-6 border-border/60 hover:bg-muted/60 shadow-card"
            >
              <Filter className="h-5 w-5 mr-2" />
              Advanced Filters
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <Card className="p-6 lg:p-8 shadow-card border-border/40 bg-card/50 backdrop-blur-sm animate-slide-up">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-card-foreground">Filter Products</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedCondition("all");
                      setPriceRange([0, 5000]);
                    }}
                    className="text-muted-foreground hover:text-accent"
                  >
                    Clear All
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-card-foreground">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-background border-border/60">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-card-foreground">Condition</Label>
                    <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                      <SelectTrigger className="bg-background border-border/60">
                        <SelectValue placeholder="All conditions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Conditions</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="reusable">Reusable</SelectItem>
                        <SelectItem value="refurbished">Refurbished</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-card-foreground">
                      Price Range: ${priceRange[0]} - ${priceRange[1]}
                    </Label>
                    <div className="pt-2">
                      <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        max={5000}
                        step={50}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-card-foreground">Quick Actions</Label>
                    <div className="flex flex-col gap-2">
                      <Badge variant="outline" className="justify-center py-2 cursor-pointer hover:bg-muted/60">
                        <Leaf className="h-3 w-3 mr-1" />
                        Eco-Friendly Only
                      </Badge>
                      <Badge variant="outline" className="justify-center py-2 cursor-pointer hover:bg-muted/60">
                        <Truck className="h-3 w-3 mr-1" />
                        Fast Delivery
                      </Badge>
                    </div>
                  </div>
                 </div>
               </div>
             </Card>
           )}
         </div>

        {/* Products Grid */}
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          data-products-section
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              onViewDetails={handleViewProduct}
              onToggleLike={toggleLike}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or filters
            </p>
            <Button onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
              setSelectedCondition("all");
              setPriceRange([0, 5000]);
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        total={getCartTotal()}
        onCheckout={handleCheckout}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isProductDetailOpen}
        onClose={() => {
          setIsProductDetailOpen(false);
          setSelectedProduct(null);
        }}
        onAddToCart={handleAddToCart}
        currentUser={currentUser}
        currentUserProfile={profile}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        total={getCartTotal()}
        onOrderComplete={handleOrderComplete}
      />
    </div>
  );
};

// Main App Component with Provider
const Marketplace = () => {
  return (
    <AppProvider>
      <EcommercePlatform />
    </AppProvider>
  );
};

export default Marketplace;