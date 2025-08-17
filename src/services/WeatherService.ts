interface WeatherData {
  date: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  condition: string;
  impact_score: number;
}

export class WeatherService {
  private static readonly API_KEY = '7b3c4f8a9e2d1c5f8b6a9c3e7d2b1a4f'; // Mock API key for demo
  private static readonly BASE_URL = 'https://api.openweathermap.org/data/2.5';

  static async getWeatherForecast(city: string, days: number = 30): Promise<WeatherData[]> {
    try {
      // For demonstration, we'll simulate real API calls with enhanced mock data
      // In production, you would use actual weather APIs like OpenWeatherMap
      const weatherData: WeatherData[] = [];
      const today = new Date();

      // Tamil Nadu seasonal weather patterns
      const seasonalPatterns = {
        winter: { tempRange: [22, 32], rainChance: 0.1, conditions: ['sunny', 'partly_cloudy'] },
        summer: { tempRange: [28, 42], rainChance: 0.05, conditions: ['sunny', 'hot'] },
        monsoon: { tempRange: [24, 35], rainChance: 0.7, conditions: ['rainy', 'cloudy', 'thunderstorms'] },
        postMonsoon: { tempRange: [25, 35], rainChance: 0.3, conditions: ['partly_cloudy', 'cloudy'] }
      };

      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        
        const month = date.getMonth();
        let season: keyof typeof seasonalPatterns;
        
        if (month >= 11 || month <= 1) season = 'winter';
        else if (month >= 2 && month <= 5) season = 'summer';
        else if (month >= 6 && month <= 9) season = 'monsoon';
        else season = 'postMonsoon';

        const pattern = seasonalPatterns[season];
        const temperature = pattern.tempRange[0] + Math.random() * (pattern.tempRange[1] - pattern.tempRange[0]);
        const willRain = Math.random() < pattern.rainChance;
        const condition = pattern.conditions[Math.floor(Math.random() * pattern.conditions.length)];
        
        let rainfall = 0;
        if (willRain) {
          rainfall = season === 'monsoon' ? Math.random() * 80 : Math.random() * 20;
        }

        const humidity = 65 + Math.random() * 25; // 65-90% typical for Tamil Nadu

        // Calculate construction impact score
        let impact_score = 0;
        if (condition === 'rainy' && rainfall > 20) impact_score = -0.25;
        else if (condition === 'thunderstorms') impact_score = -0.40;
        else if (temperature > 38) impact_score = -0.10; // Extreme heat
        else if (condition === 'sunny' && temperature < 35) impact_score = 0.05;
        else if (condition === 'partly_cloudy') impact_score = 0.02;

        weatherData.push({
          date: date.toISOString().split('T')[0],
          temperature: Math.round(temperature * 10) / 10,
          humidity: Math.round(humidity),
          rainfall: Math.round(rainfall * 10) / 10,
          condition,
          impact_score: Math.round(impact_score * 1000) / 1000
        });
      }

      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Return fallback data
      return this.getFallbackWeatherData(days);
    }
  }

  private static getFallbackWeatherData(days: number): WeatherData[] {
    const fallbackData: WeatherData[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      fallbackData.push({
        date: date.toISOString().split('T')[0],
        temperature: 30 + Math.random() * 8,
        humidity: 70 + Math.random() * 20,
        rainfall: Math.random() * 10,
        condition: ['sunny', 'partly_cloudy', 'rainy'][Math.floor(Math.random() * 3)],
        impact_score: (Math.random() - 0.5) * 0.2
      });
    }

    return fallbackData;
  }

  static async getCurrentWeather(city: string) {
    try {
      // Simulate current weather API call
      const conditions = ['sunny', 'partly_cloudy', 'rainy', 'cloudy'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      
      return {
        temperature: 28 + Math.random() * 12, // 28-40°C range for Tamil Nadu
        humidity: 60 + Math.random() * 30, // 60-90%
        condition,
        windSpeed: 5 + Math.random() * 15, // 5-20 km/h
        pressure: 1010 + Math.random() * 20, // 1010-1030 hPa
        visibility: 8 + Math.random() * 2, // 8-10 km
      };
    } catch (error) {
      console.error('Error fetching current weather:', error);
      return null;
    }
  }
}