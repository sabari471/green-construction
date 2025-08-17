interface MarketData {
  material_id: string;
  current_price: number;
  price_history: { date: string; price: number }[];
  market_trends: {
    demand_index: number;
    supply_index: number;
    volatility: number;
    seasonal_factor: number;
  };
  regional_variations: { [region: string]: number };
}

export class MaterialPriceService {
  private static readonly API_ENDPOINTS = {
    cement: 'https://api.commodityprices.in/cement',
    steel: 'https://api.metalprices.in/tmt-bars',
    sand: 'https://api.construction-materials.in/sand',
  };

  static async getRealTimePrice(materialId: string, region: string): Promise<number> {
    try {
      // Simulate real-time price fetching from multiple sources
      // In production, integrate with actual commodity price APIs
      const basePrices = {
        '1': 420, // Cement OPC 53
        '2': 75,  // TMT Steel
        '3': 45,  // River Sand
        '4': 50,  // Blue Metal
        '5': 8,   // Red Bricks
        '6': 25   // Concrete Blocks
      };

      const regionalMultipliers = {
        'Chennai': 1.15,
        'Coimbatore': 1.0,
        'Madurai': 0.95,
        'Tiruchirappalli': 0.92,
        'Salem': 0.90,
        'Tirunelveli': 0.88,
        'Erode': 0.95,
        'Vellore': 1.05,
        'Thoothukudi': 1.08,
        'Dindigul': 0.85,
        'Thanjavur': 0.87,
        'Tiruppur': 0.98,
        'Hosur': 1.12,
        'Nagercoil': 0.82,
        'Karur': 0.89
      };

      const basePrice = basePrices[materialId as keyof typeof basePrices] || 100;
      const regionMultiplier = regionalMultipliers[region as keyof typeof regionalMultipliers] || 1.0;
      
      // Add real-time market fluctuation (±3%)
      const marketFluctuation = 0.97 + Math.random() * 0.06;
      
      return Math.round(basePrice * regionMultiplier * marketFluctuation * 100) / 100;
    } catch (error) {
      console.error('Error fetching real-time price:', error);
      return 0;
    }
  }

  static async getMarketAnalysis(materialId: string): Promise<MarketData> {
    try {
      // Simulate comprehensive market analysis
      const currentPrice = await this.getRealTimePrice(materialId, 'Coimbatore');
      
      // Generate historical price data (last 90 days)
      const priceHistory = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      for (let i = 0; i < 90; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // Simulate price variations with seasonal trends
        const seasonalFactor = Math.sin((i / 365) * 2 * Math.PI) * 0.1;
        const randomVariation = (Math.random() - 0.5) * 0.05;
        const price = currentPrice * (1 + seasonalFactor + randomVariation);
        
        priceHistory.push({
          date: date.toISOString().split('T')[0],
          price: Math.round(price * 100) / 100
        });
      }

      // Calculate market indicators
      const demand_index = 0.6 + Math.random() * 0.4; // 0.6-1.0
      const supply_index = 0.7 + Math.random() * 0.3; // 0.7-1.0
      const volatility = Math.random() * 0.3; // 0-30%
      const seasonal_factor = Math.sin((new Date().getMonth() / 12) * 2 * Math.PI) * 0.1;

      return {
        material_id: materialId,
        current_price: currentPrice,
        price_history: priceHistory,
        market_trends: {
          demand_index,
          supply_index,
          volatility,
          seasonal_factor
        },
        regional_variations: {
          'Chennai': 1.15,
          'Coimbatore': 1.0,
          'Madurai': 0.95,
          'Tiruchirappalli': 0.92,
          'Salem': 0.90
        }
      };
    } catch (error) {
      console.error('Error fetching market analysis:', error);
      throw error;
    }
  }

  static async getPriceAlerts(materialId: string, thresholdPercentage: number) {
    // Simulate price alert system
    const currentPrice = await this.getRealTimePrice(materialId, 'Coimbatore');
    const alerts = [];

    // Check for significant price movements
    if (Math.random() > 0.7) { // 30% chance of alert
      const change = (Math.random() - 0.5) * 0.2; // ±10% change
      if (Math.abs(change) > thresholdPercentage / 100) {
        alerts.push({
          type: change > 0 ? 'price_increase' : 'price_decrease',
          percentage: Math.abs(change * 100),
          current_price: currentPrice,
          timestamp: new Date().toISOString()
        });
      }
    }

    return alerts;
  }

  static getGlobalFactors() {
    // Simulate global factors affecting material prices
    return {
      oil_price_impact: Math.random() * 0.1 - 0.05, // ±5%
      currency_fluctuation: Math.random() * 0.08 - 0.04, // ±4%
      global_demand: 0.8 + Math.random() * 0.4, // 0.8-1.2
      supply_chain_index: 0.7 + Math.random() * 0.3, // 0.7-1.0
      government_policy_impact: Math.random() * 0.06 - 0.03, // ±3%
    };
  }
}