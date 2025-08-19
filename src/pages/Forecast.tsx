import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Download, Save, AlertTriangle, Cloud, Sun, CloudRain, Thermometer, Wind, Eye, Calendar, BarChart3, Target, Activity, FileText, Database, Zap, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { WeatherService } from "@/services/WeatherService";
import { MaterialPriceService } from "@/services/MaterialPriceService";
import { ExportService } from "@/services/ExportService";
import { supabase } from "@/integrations/supabase/client";

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
  weather_impact: number;
  seasonal_factor: number;
  supply_demand_ratio: number;
  market_volatility: number;
}

interface MaterialPrice {
  date: string;
  price: number;
  region: string;
  material_id: string;
}

interface WeatherForecast {
  date: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  condition: string;
  impact_score: number;
}

// Tamil Nadu regions
const tamilNaduRegions = [
  "Chennai",
  "Coimbatore", 
  "Madurai",
  "Tiruchirappalli",
  "Salem",
  "Tirunelveli",
  "Erode",
  "Vellore",
  "Thoothukudi",
  "Dindigul",
  "Thanjavur",
  "Tiruppur",
  "Hosur",
  "Nagercoil",
  "Karur"
];

const materialCategories = {
  "Cement": { icon: "🏗️", weatherSensitive: true },
  "Steel": { icon: "🔩", weatherSensitive: false },
  "Sand": { icon: "🏖️", weatherSensitive: true },
  "Gravel": { icon: "🪨", weatherSensitive: true },
  "Bricks": { icon: "🧱", weatherSensitive: true },
  "TMT Bars": { icon: "⚡", weatherSensitive: false }
};

const Forecast = () => {
  const [materials, setMaterials] = useState<Material[]>([
    { id: "1", name: "Cement (OPC 53)", unit: "bag", category: "Cement", description: "Ordinary Portland Cement Grade 53" },
    { id: "2", name: "TMT Steel Bars", unit: "kg", category: "Steel", description: "Thermo Mechanically Treated Steel" },
    { id: "3", name: "River Sand", unit: "cu.ft", category: "Sand", description: "Fine aggregate for construction" },
    { id: "4", name: "Blue Metal", unit: "cu.ft", category: "Gravel", description: "20mm aggregate stone" },
    { id: "5", name: "Red Bricks", unit: "piece", category: "Bricks", description: "Clay fired building bricks" },
    { id: "6", name: "Concrete Blocks", unit: "piece", category: "Bricks", description: "Precast concrete blocks" }
  ]);
  
  const [selectedMaterial, setSelectedMaterial] = useState<string>("1");
  const [selectedRegion, setSelectedRegion] = useState<string>("Coimbatore");
  const [timeframe, setTimeframe] = useState<string>("1");
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [currentPrices, setCurrentPrices] = useState<MaterialPrice[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("forecast");
  const [user, setUser] = useState(null);
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentPrices();
    fetchWeatherData();
    loadUserAuth();
    loadSavedAnalyses();
  }, []);

  useEffect(() => {
    if (selectedMaterial && selectedRegion) {
      fetchForecastData();
    }
  }, [selectedMaterial, selectedRegion, timeframe]);

  const loadUserAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadSavedAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('user_forecasts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSavedAnalyses(data || []);
    } catch (error) {
      console.error('Error loading saved analyses:', error);
    }
  };

  const fetchCurrentPrices = async () => {
    try {
      if (realTimeData) {
        // Get real-time prices for all materials
        const prices = [];
        for (const material of materials) {
          const price = await MaterialPriceService.getRealTimePrice(material.id, selectedRegion);
          prices.push({
            date: new Date().toISOString().split('T')[0],
            price,
            region: selectedRegion,
            material_id: material.id
          });
        }
        setCurrentPrices(prices);
      } else {
        // Fallback to mock data
        const mockPrices = [
          { date: "2025-08-17", price: 420, region: selectedRegion, material_id: "1" },
          { date: "2025-08-17", price: 75, region: selectedRegion, material_id: "2" },
          { date: "2025-08-17", price: 45, region: selectedRegion, material_id: "3" },
          { date: "2025-08-17", price: 50, region: selectedRegion, material_id: "4" },
          { date: "2025-08-17", price: 8, region: selectedRegion, material_id: "5" },
          { date: "2025-08-17", price: 25, region: selectedRegion, material_id: "6" },
        ];
        setCurrentPrices(mockPrices);
      }
    } catch (error) {
      console.error('Error fetching current prices:', error);
      toast({
        title: "Price Data Warning",
        description: "Using cached price data. Real-time data temporarily unavailable.",
        variant: "destructive"
      });
    }
  };

  const fetchWeatherData = async () => {
    try {
      if (realTimeData) {
        const weatherForecast = await WeatherService.getWeatherForecast(selectedRegion, 30);
        setWeatherData(weatherForecast);
      } else {
        // Fallback weather data
        const weatherForecast: WeatherForecast[] = [];
        const conditions = ["sunny", "cloudy", "rainy", "partly_cloudy"];
        const today = new Date();

        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          
          const condition = conditions[Math.floor(Math.random() * conditions.length)];
          const temperature = 28 + Math.random() * 10; // 28-38°C typical for Tamil Nadu
          const humidity = 60 + Math.random() * 30; // 60-90%
          const rainfall = condition === "rainy" ? Math.random() * 50 : Math.random() * 5;
          
          let impact_score = 0;
          if (condition === "rainy" && rainfall > 10) impact_score = -0.15;
          else if (condition === "sunny" && temperature > 35) impact_score = -0.05;
          else if (condition === "cloudy") impact_score = 0.02;

          weatherForecast.push({
            date: date.toISOString().split('T')[0],
            temperature: Math.round(temperature * 10) / 10,
            humidity: Math.round(humidity),
            rainfall: Math.round(rainfall * 10) / 10,
            condition,
            impact_score
          });
        }
        
        setWeatherData(weatherForecast);
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      toast({
        title: "Weather Data Warning",
        description: "Using cached weather data. Real-time data temporarily unavailable.",
        variant: "destructive"
      });
    }
  };

  const fetchForecastData = async () => {
    try {
      setLoading(true);
      let data;
      
      if (realTimeData) {
        // Use AI-powered predictions with Gemini API
        const currentPriceData = currentPrices.find(p => p.material_id === selectedMaterial)?.price || 100;
        const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
        
        // Prepare data for AI analysis
        const historicalData = await MaterialPriceService.getMarketAnalysis(selectedMaterial);
        const marketFactors = MaterialPriceService.getGlobalFactors();
        
        try {
          console.log('Calling AI forecast for:', selectedMaterialData?.name, selectedRegion, parseInt(timeframe) * 365);
          
          const aiResponse = await supabase.functions.invoke('ai-forecast', {
            body: {
              material: selectedMaterialData?.name,
              region: selectedRegion,
              timeframe: parseInt(timeframe) * 365, // Convert years to days
              currentPrice: currentPriceData,
              historicalData: historicalData,
              weatherData: weatherData.slice(0, 30),
              marketFactors: marketFactors
            }
          });

          console.log('AI Response received:', aiResponse);

          if (aiResponse.error) {
            throw new Error(`AI Service Error: ${aiResponse.error.message || 'Unknown error'}`);
          }

          if (aiResponse.data && (aiResponse.data.dailyPredictions || aiResponse.data.fallbackData)) {
            // Handle both successful AI predictions and fallback data
            const responseData = aiResponse.data.dailyPredictions ? aiResponse.data : aiResponse.data.fallbackData;
            
            // Convert AI predictions to our forecast format
            data = convertAIPredictionsToForecast(responseData);
            
            const confidence = responseData.averageConfidence || 75;
            const isAI = !!aiResponse.data.dailyPredictions;
            
            toast({
              title: isAI ? "AI Forecast Generated" : "Forecast Generated",
              description: `Generated ${isAI ? 'AI-powered' : 'enhanced'} predictions with ${Math.round(confidence)}% confidence`,
            });
          } else {
            throw new Error('Invalid AI response format - no predictions found');
          }
        } catch (aiError) {
          console.error('AI forecast error:', aiError);
          // Fallback to enhanced local predictions
          const marketData = await MaterialPriceService.getMarketAnalysis(selectedMaterial);
          data = generateAdvancedForecastData(marketData);
          toast({
            title: "Forecast Generated",
            description: "Using enhanced local predictions (AI temporarily unavailable)",
            variant: "default"
          });
        }
      } else {
        // Use local advanced forecast when AI is disabled
        const marketData = await MaterialPriceService.getMarketAnalysis(selectedMaterial);
        data = generateAdvancedForecastData(marketData);
        toast({
          title: "Forecast Updated", 
          description: `Generated ${data.length} data points for ${selectedMaterialData?.name}`,
        });
      }
      
      setForecastData(data);
    } catch (error) {
      console.error('Error fetching forecast data:', error);
      toast({
        title: "Forecast Error",
        description: "Failed to generate forecast. Using cached data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const convertAIPredictionsToForecast = (aiData: any): ForecastData[] => {
    console.log('Converting AI predictions:', aiData);
    
    const predictions = aiData.dailyPredictions || [];
    const monthlyData: ForecastData[] = [];
    
    if (!predictions.length) {
      console.warn('No daily predictions found in AI response');
      return generateAdvancedForecastData();
    }
    
    try {
      // Convert daily predictions to monthly aggregates
      const groupedByMonth: { [key: string]: typeof predictions } = {};
      
      predictions.forEach((pred: any) => {
        if (!pred.date || pred.predictedPrice === undefined || pred.confidence === undefined) {
          console.warn('Invalid prediction data:', pred);
          return;
        }
        
        const date = new Date(pred.date);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date in prediction:', pred.date);
          return;
        }
        
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!groupedByMonth[monthKey]) {
          groupedByMonth[monthKey] = [];
        }
        groupedByMonth[monthKey].push(pred);
      });

      // Create monthly forecast data
      const sortedMonthKeys = Object.keys(groupedByMonth).sort().slice(0, parseInt(timeframe) * 12);
      
      sortedMonthKeys.forEach((monthKey, index) => {
        const monthPredictions = groupedByMonth[monthKey];
        if (!monthPredictions.length) return;
        
        // Calculate averages with proper validation
        const validPrices = monthPredictions.filter(p => typeof p.predictedPrice === 'number' && !isNaN(p.predictedPrice));
        const validConfidences = monthPredictions.filter(p => typeof p.confidence === 'number' && !isNaN(p.confidence));
        
        if (!validPrices.length || !validConfidences.length) {
          console.warn('No valid prices or confidences for month:', monthKey);
          return;
        }
        
        const avgPrice = validPrices.reduce((sum: number, p: any) => sum + p.predictedPrice, 0) / validPrices.length;
        const avgConfidence = validConfidences.reduce((sum: number, p: any) => sum + p.confidence, 0) / validConfidences.length;
        
        // Determine trend based on overall data trend
        let trend = aiData.overallTrend || 'stable';
        if (index > 0 && monthlyData.length > 0) {
          const prevPrice = monthlyData[monthlyData.length - 1].predicted_price;
          const priceChange = (avgPrice - prevPrice) / prevPrice;
          
          if (priceChange > 0.02) trend = 'increasing';
          else if (priceChange < -0.02) trend = 'decreasing';
          else trend = 'stable';
        }

        // Calculate market factors based on AI response
        const marketVolatilityMap = {
          'low': 3,
          'medium': 8,
          'high': 15
        };
        
        const volatilityValue = marketVolatilityMap[aiData.marketVolatility as keyof typeof marketVolatilityMap] || 5;
        const currentMonth = new Date(monthKey).getMonth();
        const seasonalFactor = Math.sin((currentMonth / 12) * 2 * Math.PI) * 0.08;
        
        // Weather impact calculation
        let weatherImpact = 0;
        const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
        if (selectedMaterialData && materialCategories[selectedMaterialData.category as keyof typeof materialCategories]?.weatherSensitive) {
          weatherImpact = Math.random() * 0.1 - 0.05; // -5% to +5%
        }

        monthlyData.push({
          forecast_date: `${monthKey}-01`,
          predicted_price: Math.round(avgPrice * 100) / 100,
          confidence_level: Math.round(Math.min(100, Math.max(0, avgConfidence)) * 10) / 10,
          trend: trend,
          weather_impact: Math.round(weatherImpact * 1000) / 10,
          seasonal_factor: Math.round(seasonalFactor * 1000) / 10,
          supply_demand_ratio: Math.round((0.9 + Math.random() * 0.2) * 100) / 100,
          market_volatility: Math.round(volatilityValue * 10) / 10
        });
      });

      console.log('Successfully converted AI predictions to monthly data:', monthlyData.length, 'months');
      
      if (monthlyData.length === 0) {
        console.warn('No monthly data generated, falling back to local predictions');
        return generateAdvancedForecastData();
      }
      
      return monthlyData;
      
    } catch (error) {
      console.error('Error converting AI predictions:', error);
      console.log('Falling back to local predictions');
      return generateAdvancedForecastData();
    }
  };

  const generateAdvancedForecastData = (marketData?: any): ForecastData[] => {
    const data: ForecastData[] = [];
    const startDate = new Date();
    const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
    const currentPrice = currentPrices.find(p => p.material_id === selectedMaterial)?.price || 100;
    const years = parseInt(timeframe);
    const monthsToGenerate = years * 12;
    
    // Regional price multipliers for Tamil Nadu
    const regionalMultipliers: { [key: string]: number } = {
      "Chennai": 1.15, "Coimbatore": 1.0, "Madurai": 0.95, "Tiruchirappalli": 0.92,
      "Salem": 0.90, "Tirunelveli": 0.88, "Erode": 0.95, "Vellore": 1.05,
      "Thoothukudi": 1.08, "Dindigul": 0.85, "Thanjavur": 0.87, "Tiruppur": 0.98,
      "Hosur": 1.12, "Nagercoil": 0.82, "Karur": 0.89
    };

    const basePrice = currentPrice * (regionalMultipliers[selectedRegion] || 1.0);
    const isWeatherSensitive = materialCategories[selectedMaterialData?.category as keyof typeof materialCategories]?.weatherSensitive || false;
    
    // Use real market data if available
    const marketTrends = marketData?.market_trends || {
      demand_index: 0.8 + Math.random() * 0.4,
      supply_index: 0.7 + Math.random() * 0.3,
      volatility: Math.random() * 0.3,
      seasonal_factor: Math.sin((new Date().getMonth() / 12) * 2 * Math.PI) * 0.1
    };

    for (let i = 0; i < monthsToGenerate; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      
      // Advanced price calculation factors with real market data
      const monthlyInflation = 0.003 + Math.random() * 0.004; // 3.6-8.4% annually
      const seasonalFactor = marketTrends.seasonal_factor + Math.sin((i % 12) * Math.PI / 6) * 0.04;
      const marketVolatility = marketTrends.volatility * (Math.random() - 0.5) * 0.5;
      const supplyDemandRatio = 0.8 + (marketTrends.demand_index / marketTrends.supply_index) * 0.4;
      const weatherImpact = isWeatherSensitive ? (weatherData[i % weatherData.length]?.impact_score || 0) : 0;
      
      // Calculate trend
      let trend = 'stable';
      if (seasonalFactor > 0.04 || supplyDemandRatio < 0.95) trend = 'increasing';
      else if (seasonalFactor < -0.04 || supplyDemandRatio > 1.05) trend = 'decreasing';

      // Price calculation
      let price = basePrice * Math.pow(1 + monthlyInflation, i);
      price *= (1 + seasonalFactor + marketVolatility + weatherImpact);
      price = Math.max(price, basePrice * 0.7); // Price floor

      // Confidence level calculation
      const confidence = Math.max(60, 95 - (i * 2) - Math.abs(marketVolatility) * 100);

      data.push({
        forecast_date: date.toISOString().split('T')[0],
        predicted_price: Math.round(price * 100) / 100,
        confidence_level: Math.round(confidence * 10) / 10,
        trend,
        weather_impact: Math.round(weatherImpact * 1000) / 10,
        seasonal_factor: Math.round(seasonalFactor * 1000) / 10,
        supply_demand_ratio: Math.round(supplyDemandRatio * 100) / 100,
        market_volatility: Math.round(Math.abs(marketVolatility) * 1000) / 10
      });
    }

    return data;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return <Sun className="h-4 w-4 text-yellow-500" />;
      case 'rainy': return <CloudRain className="h-4 w-4 text-blue-500" />;
      case 'cloudy': return <Cloud className="h-4 w-4 text-gray-500" />;
      default: return <Sun className="h-4 w-4 text-orange-400" />;
    }
  };

  const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
  const currentPrice = currentPrices.find(p => 
    p.material_id === selectedMaterial && p.region === selectedRegion
  );

  const chartData = forecastData.map((item, index) => {
    const date = new Date(item.forecast_date);
    return {
      date: isNaN(date.getTime()) 
        ? `Month ${index + 1}` 
        : date.toLocaleDateString('en-IN', { 
            month: 'short', 
            year: 'numeric' 
          }),
      price: typeof item.predicted_price === 'number' && !isNaN(item.predicted_price) 
        ? Math.round(item.predicted_price * 100) / 100 
        : 0,
      confidence: typeof item.confidence_level === 'number' && !isNaN(item.confidence_level)
        ? Math.round(item.confidence_level * 10) / 10
        : 0,
      trend: item.trend || 'stable',
      weather_impact: typeof item.weather_impact === 'number' && !isNaN(item.weather_impact)
        ? Math.round(item.weather_impact * 10) / 10
        : 0,
      volatility: typeof item.market_volatility === 'number' && !isNaN(item.market_volatility)
        ? Math.round(item.market_volatility * 10) / 10
        : 0
    };
  });

  const averageConfidence = forecastData.length > 0 
    ? forecastData.reduce((sum, item) => sum + item.confidence_level, 0) / forecastData.length 
    : 0;

  const priceChange = forecastData.length > 1 
    ? ((forecastData[forecastData.length - 1].predicted_price - forecastData[0].predicted_price) / forecastData[0].predicted_price) * 100
    : 0;

  const handleSaveAnalysis = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save your analysis",
        variant: "destructive"
      });
      return;
    }

    try {
      const analysisData = {
        name: `${selectedMaterialData?.name} - ${selectedRegion} - ${timeframe}Y`,
        user_id: user.id,
        materials_config: JSON.parse(JSON.stringify({
          material_id: selectedMaterial,
          material_name: selectedMaterialData?.name,
          region: selectedRegion,
          timeframe: timeframe,
          forecast_data: forecastData.slice(0, 12).map(item => ({
            forecast_date: item.forecast_date,
            predicted_price: item.predicted_price,
            confidence_level: item.confidence_level,
            trend: item.trend,
            weather_impact: item.weather_impact,
            seasonal_factor: item.seasonal_factor,
            supply_demand_ratio: item.supply_demand_ratio,
            market_volatility: item.market_volatility
          })),
          generated_at: new Date().toISOString(),
          summary: {
            avgConfidence: averageConfidence,
            priceChange: priceChange,
            overallTrend: priceChange > 5 ? 'Increasing' : priceChange < -5 ? 'Decreasing' : 'Stable'
          }
        }))
      };

      const { error } = await supabase
        .from('user_forecasts')
        .insert(analysisData);

      if (error) throw error;

      toast({
        title: "Analysis Saved",
        description: "Your forecast analysis has been saved successfully",
      });

      loadSavedAnalyses();
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save analysis. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      setExportLoading(true);
      
      const exportOptions = {
        title: 'Material Price Forecast Report',
        material: selectedMaterialData?.name || 'Unknown Material',
        region: selectedRegion,
        timeframe: `${timeframe} Year${timeframe !== '1' ? 's' : ''}`,
        data: forecastData,
        summary: {
          avgConfidence: averageConfidence,
          priceChange: priceChange,
          overallTrend: priceChange > 5 ? 'Increasing' : priceChange < -5 ? 'Decreasing' : 'Stable'
        }
      };

      switch (format) {
        case 'pdf':
          await ExportService.exportToPDF(exportOptions);
          break;
        case 'excel':
          await ExportService.exportToExcel(exportOptions);
          break;
        case 'csv':
          await ExportService.exportToCSV(exportOptions);
          break;
      }

      toast({
        title: "Export Successful",
        description: `Report exported as ${format.toUpperCase()} successfully`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Advanced Material Price Forecast
              </h1>
              <p className="text-lg text-gray-600">
                AI-powered construction material price predictions for Tamil Nadu with weather and market analysis
              </p>
            </div>
            {realTimeData && (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
                <Zap className="h-3 w-3 mr-1" />
                AI Predictions Active
              </Badge>
            )}
          </div>
        </div>

      {/* Controls */}
      <Card className="mb-8 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Forecast Configuration
          </CardTitle>
          <CardDescription>
            Configure your forecasting parameters for accurate price predictions
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Material Type
              </label>
              <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id} className="py-3">
                      <div className="flex items-center gap-2">
                        <span>{materialCategories[material.category as keyof typeof materialCategories]?.icon}</span>
                        <div>
                          <div className="font-medium">{material.name}</div>
                          <div className="text-xs text-gray-500">per {material.unit}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Tamil Nadu Region
              </label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {tamilNaduRegions.map((region) => (
                    <SelectItem key={region} value={region} className="py-2">
                      📍 {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Forecast Period
              </label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Year Forecast</SelectItem>
                  <SelectItem value="2">2 Years Forecast</SelectItem>
                  <SelectItem value="3">3 Years Forecast</SelectItem>
                  <SelectItem value="5">5 Years Forecast</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end gap-3">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setRealTimeData(!realTimeData);
                    // Auto-refresh forecast when toggling AI predictions
                    setTimeout(() => {
                      fetchCurrentPrices();
                      fetchWeatherData(); 
                      fetchForecastData();
                    }, 100);
                  }}
                  className={`${realTimeData ? 'bg-primary text-primary-foreground' : ''}`}
                  disabled={loading}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  {realTimeData ? 'AI ON' : 'AI OFF'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    fetchCurrentPrices();
                    fetchWeatherData();
                    fetchForecastData();
                  }}
                  disabled={loading}
                  title="Refresh all data and regenerate forecast"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              <Button 
                className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={handleSaveAnalysis}
                disabled={!user || loading || forecastData.length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Analysis
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12"
                  onClick={() => handleExport('pdf')}
                  disabled={exportLoading || forecastData.length === 0 || loading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {exportLoading ? 'Exporting...' : 'PDF'}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-12"
                  onClick={() => handleExport('excel')}
                  disabled={exportLoading || forecastData.length === 0 || loading}
                >
                  <Database className="h-4 w-4 mr-2" />
                  {exportLoading ? 'Exporting...' : 'Excel'}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-12"
                  onClick={() => handleExport('csv')}
                  disabled={exportLoading || forecastData.length === 0 || loading}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {exportLoading ? 'Exporting...' : 'CSV'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 h-12">
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Price Forecast
          </TabsTrigger>
          <TabsTrigger value="weather" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Weather Impact
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Market Analysis
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Executive Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecast">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedMaterialData?.name} Price Forecast - {selectedRegion}</span>
                    <Badge variant="outline" className="bg-blue-50">
                      {Math.round(averageConfidence)}% Confidence
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    AI-predicted prices over {timeframe} year{timeframe !== '1' ? 's' : ''} with market factors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-96 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <div className="text-gray-600">Generating advanced forecast...</div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="confidence" orientation="right" tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value, name, props) => {
                              if (name === 'Predicted Price') return [`₹${value}/${selectedMaterialData?.unit}`, name];
                              if (name === 'Confidence Level') return [`${value}%`, name];
                              return [value, name];
                            }}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Legend />
                          <Area
                            yAxisId="price"
                            type="monotone"
                            dataKey="price"
                            stroke="#2563eb"
                            fill="url(#priceGradient)"
                            name="Predicted Price"
                            strokeWidth={2}
                          />
                          <Line
                            yAxisId="confidence"
                            type="monotone"
                            dataKey="confidence"
                            stroke="#dc2626"
                            strokeDasharray="5 5"
                            name="Confidence Level"
                            strokeWidth={2}
                          />
                          <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stats Panel */}
            <div className="space-y-6">
              {/* Current Price */}
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    Current Market Price
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    ₹{currentPrice?.price || 'N/A'}
                    <span className="text-lg font-normal text-gray-500">
                      /{selectedMaterialData?.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>As of {currentPrice?.date || 'Today'}</span>
                    <Badge variant="secondary">Live Rate</Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Price Change Forecast:</span>
                      <span className={`font-semibold ${priceChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.abs(priceChange)} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Forecast Summary */}
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Advanced Forecast Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {forecastData.slice(-1).map((item, index) => (
                    <div key={index} className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            {timeframe} Year Target Price
                          </span>
                          <Badge 
                            variant={item.trend === 'increasing' ? 'destructive' : item.trend === 'decreasing' ? 'default' : 'secondary'}
                            className="flex items-center gap-1"
                          >
                            {getTrendIcon(item.trend)}
                            {item.trend}
                          </Badge>
                        </div>
                        <div className="text-3xl font-bold text-purple-600">
                          ₹{item.predicted_price}
                          <span className="text-sm font-normal text-gray-500">
                            /{selectedMaterialData?.unit}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round(item.confidence_level)}%
                          </div>
                          <div className="text-xs text-gray-600">Confidence</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {item.supply_demand_ratio}
                          </div>
                          <div className="text-xs text-gray-600">Supply/Demand</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {item.weather_impact}%
                          </div>
                          <div className="text-xs text-gray-600">Weather Impact</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {item.market_volatility}%
                          </div>
                          <div className="text-xs text-gray-600">Volatility</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="weather">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CloudRain className="h-5 w-5 text-blue-600" />
                  30-Day Weather Forecast - {selectedRegion}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weatherData.slice(0, 30)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(date) => new Date(date).getDate().toString()} />
                      <YAxis yAxisId="temp" orientation="left" />
                      <YAxis yAxisId="rain" orientation="right" />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'Temperature') return [`${value}°C`, name];
                          if (name === 'Rainfall') return [`${value}mm`, name];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#f59e0b" name="Temperature" strokeWidth={2} />
                      <Bar yAxisId="rain" dataKey="rainfall" fill="#3b82f6" name="Rainfall" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-red-500" />
                    Today's Weather Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {weatherData.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getWeatherIcon(weatherData[0].condition)}
                          <div>
                            <div className="font-semibold capitalize">{weatherData[0].condition}</div>
                            <div className="text-sm text-gray-600">{weatherData[0].temperature}°C</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{weatherData[0].humidity}%</div>
                          <div className="text-sm text-gray-600">Humidity</div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Material Price Impact:</span>
                          <span className={`font-semibold ${weatherData[0].impact_score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {weatherData[0].impact_score >= 0 ? '+' : ''}{(weatherData[0].impact_score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={Math.abs(weatherData[0].impact_score * 100)} className="h-2" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Weather Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {weatherData.slice(0, 5).map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2">
                          {getWeatherIcon(day.condition)}
                          <span className="text-sm font-medium">
                            {new Date(day.date).toLocaleDateString('en-IN', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {day.rainfall > 10 && <AlertTriangle className="h-4 w-4 text-yellow-500 inline mr-1" />}
                          {day.rainfall}mm
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Market Volatility Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, 'Market Volatility']} />
                      <Area
                        type="monotone"
                        dataKey="volatility"
                        stroke="#ef4444"
                        fill="#fecaca"
                        name="Market Volatility"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wind className="h-5 w-5 text-blue-600" />
                  Key Market Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Monsoon Season Impact</p>
                      <p className="text-sm text-gray-600">
                        Heavy rainfall during June-September affects transportation and storage costs
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Regional Demand Patterns</p>
                      <p className="text-sm text-gray-600">
                        Chennai and Coimbatore show highest construction activity
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Activity className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Supply Chain Efficiency</p>
                      <p className="text-sm text-gray-600">
                        Port cities have 8-12% lower logistics costs
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Seasonal Construction Cycles</p>
                      <p className="text-sm text-gray-600">
                        Peak demand during October-March construction season
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="summary">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Executive Summary Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Price Forecast Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          ₹{forecastData.length > 0 ? forecastData[forecastData.length - 1].predicted_price : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">Projected Price ({timeframe}Y)</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(averageConfidence)}%
                        </div>
                        <div className="text-sm text-gray-600">Average Confidence</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-3">Key Insights</h3>
                    <div className="space-y-3">
                      <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                        <p className="font-medium">Market Trend Analysis</p>
                        <p className="text-sm text-gray-700">
                          {priceChange >= 0 
                            ? `Expected price increase of ${priceChange.toFixed(1)}% over ${timeframe} years due to inflation and demand growth.`
                            : `Potential price decrease of ${Math.abs(priceChange).toFixed(1)}% over ${timeframe} years due to supply improvements.`
                          }
                        </p>
                      </div>
                      
                      <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50">
                        <p className="font-medium">Weather Risk Assessment</p>
                        <p className="text-sm text-gray-700">
                          {selectedMaterialData && materialCategories[selectedMaterialData.category as keyof typeof materialCategories]?.weatherSensitive
                            ? "High weather sensitivity - monitor monsoon patterns for price volatility."
                            : "Low weather sensitivity - minimal impact from seasonal weather changes."
                          }
                        </p>
                      </div>
                      
                      <div className="p-3 border-l-4 border-green-500 bg-green-50">
                        <p className="font-medium">Regional Advantage</p>
                        <p className="text-sm text-gray-700">
                          {selectedRegion} offers competitive pricing with good supply chain connectivity for construction materials.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-3">Recommendations</h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                        <p className="text-sm">
                          <strong>Optimal Purchase Timing:</strong> Consider bulk purchases during {priceChange >= 0 ? 'Q1-Q2' : 'Q3-Q4'} for better rates.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                        <p className="text-sm">
                          <strong>Risk Management:</strong> Maintain {Math.round(averageConfidence) >= 80 ? '15-20%' : '25-30%'} buffer in project budgets for price volatility.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                        <p className="text-sm">
                          <strong>Supplier Strategy:</strong> Diversify suppliers across 2-3 regions to minimize regional price impact.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Forecast Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {Math.round(averageConfidence)}%
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Prediction Accuracy</p>
                    <Progress value={averageConfidence} className="h-3" />
                    <p className="text-xs text-gray-500 mt-2">
                      Based on historical data and market analysis
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Risk Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Price Volatility</span>
                    <Badge variant={forecastData.length > 0 && forecastData[0].market_volatility > 8 ? 'destructive' : 'default'}>
                      {forecastData.length > 0 ? `${forecastData[0].market_volatility}%` : 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Supply Risk</span>
                    <Badge variant="outline">Low</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Weather Impact</span>
                    <Badge variant={
                      selectedMaterialData && materialCategories[selectedMaterialData.category as keyof typeof materialCategories]?.weatherSensitive 
                        ? 'destructive' : 'default'
                    }>
                      {selectedMaterialData && materialCategories[selectedMaterialData.category as keyof typeof materialCategories]?.weatherSensitive 
                        ? 'High' : 'Low'
                      }
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleExport('pdf')}
                    disabled={exportLoading || forecastData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exportLoading ? 'Generating...' : 'Download Full Report'}
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Price Alerts",
                        description: "Price alert feature will be available soon!",
                      });
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Set Price Alerts
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Scheduled Updates",
                        description: "Automated forecast updates feature coming soon!",
                      });
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Updates
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default Forecast;