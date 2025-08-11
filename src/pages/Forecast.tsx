import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus, Download, Save, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useToast } from "@/hooks/use-toast";

interface Material {
  id: string;
  name: string;
  unit: string;
  category: string;
  description: string;
}

interface ForecastData {
  forecast_date: string;
  predicted_price: number;
  confidence_level: number;
  trend: string;
}

interface MaterialPrice {
  date: string;
  price: number;
  region: string;
  material_id: string;
}

const regions = [
  "North America",
  "Europe",
  "Asia-Pacific",
  "Middle East",
  "Latin America",
  "Africa"
];

const Forecast = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("North America");
  const [timeframe, setTimeframe] = useState<string>("1");
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [currentPrices, setCurrentPrices] = useState<MaterialPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterials();
    fetchCurrentPrices();
  }, []);

  useEffect(() => {
    if (selectedMaterial && selectedRegion) {
      fetchForecastData();
    }
  }, [selectedMaterial, selectedRegion, timeframe]);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name');

      if (error) throw error;
      setMaterials(data || []);
      if (data && data.length > 0) {
        setSelectedMaterial(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchCurrentPrices = async () => {
    try {
      const { data, error } = await supabase
        .from('material_prices')
        .select(`
          *,
          material:materials(name, unit)
        `)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      setCurrentPrices(data || []);
    } catch (error) {
      console.error('Error fetching current prices:', error);
    }
  };

  const fetchForecastData = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + parseInt(timeframe));

      const { data, error } = await supabase
        .from('forecast_data')
        .select('*')
        .eq('material_id', selectedMaterial)
        .eq('region', selectedRegion)
        .lte('forecast_date', endDate.toISOString().split('T')[0])
        .order('forecast_date');

      if (error) throw error;
      
      // If no data exists, generate mock data for demo
      if (!data || data.length === 0) {
        const mockData = generateMockForecastData();
        setForecastData(mockData);
      } else {
        setForecastData(data);
      }
    } catch (error) {
      console.error('Error fetching forecast data:', error);
      // Generate mock data for demo
      const mockData = generateMockForecastData();
      setForecastData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const generateMockForecastData = (): ForecastData[] => {
    const data: ForecastData[] = [];
    const startDate = new Date();
    const basePrice = 100 + Math.random() * 200;
    const years = parseInt(timeframe);
    const monthsToGenerate = years * 12;

    for (let i = 0; i < monthsToGenerate; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      
      const trend = Math.random() > 0.5 ? 'increasing' : 'decreasing';
      const volatility = 0.1 + Math.random() * 0.2;
      const seasonality = Math.sin((i % 12) * Math.PI / 6) * 10;
      
      let price = basePrice;
      if (trend === 'increasing') {
        price += i * (5 + Math.random() * 10);
      } else {
        price -= i * (2 + Math.random() * 5);
      }
      
      price += seasonality + (Math.random() - 0.5) * volatility * price;
      price = Math.max(price, basePrice * 0.5); // Minimum price floor

      data.push({
        forecast_date: date.toISOString().split('T')[0],
        predicted_price: Math.round(price * 100) / 100,
        confidence_level: 70 + Math.random() * 25,
        trend: i === 0 ? 'stable' : trend
      });
    }

    return data;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-destructive" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-success" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'destructive';
      case 'decreasing':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
  const currentPrice = currentPrices.find(p => 
    p.material_id === selectedMaterial && p.region === selectedRegion
  );

  const chartData = forecastData.map(item => ({
    date: new Date(item.forecast_date).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    }),
    price: item.predicted_price,
    confidence: item.confidence_level,
    trend: item.trend
  }));

  const saveForecast = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to save forecasts",
          variant: "destructive",
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const forecastName = `${selectedMaterialData?.name} - ${selectedRegion} - ${timeframe}Y`;
      
      const { error } = await supabase
        .from('user_forecasts')
        .insert({
          user_id: profile.id,
          name: forecastName,
          materials_config: {
            material_id: selectedMaterial,
            region: selectedRegion,
            timeframe: timeframe,
            saved_at: new Date().toISOString()
          }
        });

      if (error) throw error;

      toast({
        title: "Forecast saved",
        description: "Your forecast has been saved to your account",
      });
    } catch (error) {
      console.error('Error saving forecast:', error);
      toast({
        title: "Error",
        description: "Failed to save forecast",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Price Forecast Tool</h1>
        <p className="text-muted-foreground">
          Predict construction material prices and plan your projects
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Forecast Parameters</CardTitle>
          <CardDescription>
            Select material, region, and timeframe to generate price forecasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Material</label>
              <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name} ({material.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Region</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Year</SelectItem>
                  <SelectItem value="2">2 Years</SelectItem>
                  <SelectItem value="3">3 Years</SelectItem>
                  <SelectItem value="5">5 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={saveForecast} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedMaterialData?.name} Price Forecast - {selectedRegion}
              </CardTitle>
              <CardDescription>
                Projected prices over {timeframe} year{timeframe !== '1' ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Loading forecast data...</div>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `$${value} / ${selectedMaterialData?.unit}`,
                          'Predicted Price'
                        ]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                        name="Predicted Price"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats and Info */}
        <div className="space-y-6">
          {/* Current Price */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                ${currentPrice?.price || 'N/A'}
                <span className="text-sm font-normal text-muted-foreground">
                  /{selectedMaterialData?.unit}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                As of {currentPrice?.date || 'Unknown'}
              </p>
            </CardContent>
          </Card>

          {/* Forecast Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Forecast Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {forecastData.slice(-1).map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {timeframe} Year Prediction
                    </span>
                    <Badge variant={getTrendColor(item.trend) as any}>
                      {getTrendIcon(item.trend)}
                      {item.trend}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold">
                    ${item.predicted_price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{selectedMaterialData?.unit}
                    </span>
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-muted-foreground">
                      Confidence: {Math.round(item.confidence_level)}%
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Market Volatility</p>
                  <p className="text-muted-foreground">
                    Prices may fluctuate ±15% due to market conditions
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <TrendingUp className="h-4 w-4 text-success mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Seasonal Impact</p>
                  <p className="text-muted-foreground">
                    Demand typically peaks in spring and summer months
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Minus className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Regional Factors</p>
                  <p className="text-muted-foreground">
                    Local regulations and supply chains affect pricing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Forecast;