-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  location TEXT,
  company TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create categories table for marketplace
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'piece',
  condition TEXT DEFAULT 'new' CHECK (condition IN ('new', 'reusable', 'refurbished')),
  stock_quantity INTEGER DEFAULT 0,
  location TEXT,
  co2_savings DECIMAL(8,2) DEFAULT 0,
  specifications JSONB,
  images TEXT[],
  pdf_docs TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold')),
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create wishlists table
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  shipping_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(reviewer_id, product_id)
);

-- Create chats table for buyer-seller communication
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(buyer_id, seller_id, product_id)
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create forum categories table
CREATE TABLE public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create posts table for community forum
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.forum_categories(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'question', 'blog')),
  tags TEXT[],
  is_solved BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create comments table for forum posts
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create post votes table
CREATE TABLE public.post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- Create follows table for user following
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reply', 'mention', 'like', 'follow', 'order', 'message')),
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create materials table for forecasting
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create material prices table
CREATE TABLE public.material_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create forecast data table
CREATE TABLE public.forecast_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  forecast_date DATE NOT NULL,
  predicted_price DECIMAL(10,2) NOT NULL,
  confidence_level DECIMAL(5,2),
  trend TEXT CHECK (trend IN ('increasing', 'decreasing', 'stable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user forecasts table for saved forecasts
CREATE TABLE public.user_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  materials_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_forecasts ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create categories policies (public read)
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (true);

-- Create products policies
CREATE POLICY "Products are viewable by everyone" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Sellers can insert their own products" ON public.products
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = seller_id AND user_id = auth.uid()
  ));

CREATE POLICY "Sellers can update their own products" ON public.products
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = seller_id AND user_id = auth.uid()
  ));

CREATE POLICY "Sellers can delete their own products" ON public.products
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = seller_id AND user_id = auth.uid()
  ));

-- Create wishlists policies
CREATE POLICY "Users can view their own wishlists" ON public.wishlists
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own wishlists" ON public.wishlists
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_id = auth.uid()
  ));

-- Create orders policies
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id = buyer_id OR id = seller_id) AND user_id = auth.uid()
  ));

CREATE POLICY "Buyers can create orders" ON public.orders
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = buyer_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id = buyer_id OR id = seller_id) AND user_id = auth.uid()
  ));

-- Create reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = reviewer_id AND user_id = auth.uid()
  ));

-- Create chats policies
CREATE POLICY "Users can view their own chats" ON public.chats
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id = buyer_id OR id = seller_id) AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id = buyer_id OR id = seller_id) AND user_id = auth.uid()
  ));

-- Create chat messages policies
CREATE POLICY "Users can view messages in their chats" ON public.chat_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.chats c
    JOIN public.profiles p ON (p.id = c.buyer_id OR p.id = c.seller_id)
    WHERE c.id = chat_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can send messages in their chats" ON public.chat_messages
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.chats c
    JOIN public.profiles p ON p.id = sender_id
    WHERE c.id = chat_id AND p.user_id = auth.uid()
  ));

-- Create forum categories policies (public read)
CREATE POLICY "Forum categories are viewable by everyone" ON public.forum_categories
  FOR SELECT USING (true);

-- Create posts policies
CREATE POLICY "Posts are viewable by everyone" ON public.posts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON public.posts
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = author_id AND user_id = auth.uid()
  ));

CREATE POLICY "Authors can update their own posts" ON public.posts
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = author_id AND user_id = auth.uid()
  ));

-- Create comments policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = author_id AND user_id = auth.uid()
  ));

CREATE POLICY "Authors can update their own comments" ON public.comments
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = author_id AND user_id = auth.uid()
  ));

-- Create post votes policies
CREATE POLICY "Users can manage their own votes" ON public.post_votes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_id = auth.uid()
  ));

-- Create follows policies
CREATE POLICY "Users can manage their own follows" ON public.follows
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = follower_id AND user_id = auth.uid()
  ));

CREATE POLICY "Follows are viewable by everyone" ON public.follows
  FOR SELECT USING (true);

-- Create notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_id = auth.uid()
  ));

-- Create materials policies (public read)
CREATE POLICY "Materials are viewable by everyone" ON public.materials
  FOR SELECT USING (true);

-- Create material prices policies (public read)
CREATE POLICY "Material prices are viewable by everyone" ON public.material_prices
  FOR SELECT USING (true);

-- Create forecast data policies (public read)
CREATE POLICY "Forecast data is viewable by everyone" ON public.forecast_data
  FOR SELECT USING (true);

-- Create user forecasts policies
CREATE POLICY "Users can manage their own forecasts" ON public.user_forecasts
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_id = auth.uid()
  ));

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('product-images', 'product-images', true),
  ('product-docs', 'product-docs', false),
  ('avatars', 'avatars', true),
  ('post-images', 'post-images', true);

-- Create storage policies for product images
CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Create storage policies for product documents
CREATE POLICY "Anyone can view product docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-docs');

CREATE POLICY "Authenticated users can upload product docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-docs' AND auth.role() = 'authenticated');

-- Create storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for post images
CREATE POLICY "Anyone can view post images" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data
INSERT INTO public.categories (name, description, icon) VALUES
  ('Steel & Metal', 'Structural steel, rebar, metal sheets', 'construction'),
  ('Concrete & Cement', 'Concrete blocks, cement, aggregates', 'home'),
  ('Timber & Wood', 'Lumber, plywood, wooden beams', 'tree'),
  ('Electrical', 'Cables, switches, panels', 'zap'),
  ('Plumbing', 'Pipes, fittings, fixtures', 'droplets'),
  ('Insulation', 'Thermal and acoustic insulation', 'shield'),
  ('Roofing', 'Tiles, sheets, membranes', 'home'),
  ('Tools & Equipment', 'Construction tools and machinery', 'wrench');

INSERT INTO public.forum_categories (name, description, color) VALUES
  ('General Discussion', 'General topics about civil engineering', '#3B82F6'),
  ('Sustainable Practices', 'Green construction and sustainability', '#10B981'),
  ('Career & Education', 'Professional development and learning', '#8B5CF6'),
  ('Marketplace Help', 'Support and questions about the marketplace', '#F59E0B'),
  ('Project Showcase', 'Share your construction projects', '#EF4444'),
  ('Technical Q&A', 'Technical questions and solutions', '#6366F1');

INSERT INTO public.materials (name, unit, category, description) VALUES
  ('Cement', 'kg', 'Concrete', 'Portland cement for construction'),
  ('Steel Rebar', 'kg', 'Steel', 'Reinforcement steel bars'),
  ('Concrete', 'm³', 'Concrete', 'Ready-mix concrete'),
  ('Diesel', 'liter', 'Fuel', 'Construction equipment fuel'),
  ('Sand', 'm³', 'Aggregate', 'Construction sand'),
  ('Gravel', 'm³', 'Aggregate', 'Construction gravel'),
  ('Lumber', 'm³', 'Wood', 'Construction timber');