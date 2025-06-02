# 🚗⚡ GEM T2 Controller Optimizer

A comprehensive web-based tool for optimizing GEM (Global Electric Motorcars) T2 controller settings to improve performance, efficiency, and functionality. Perfect for GEM enthusiasts, mechanics, and weekend adventurers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26.svg)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6.svg)](https://developer.mozilla.org/en-US/docs/Web/CSS)

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Setup](#-api-setup)
- [Trip Planning](#-trip-planning)
- [PDF Import](#-pdf-import)
- [Configuration Presets](#-configuration-presets)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

## ✨ Features

### 🎯 Core Optimization
- **Smart Configuration Wizard**: Step-by-step guided setup for optimal controller settings
- **Multiple Optimization Presets**: Performance, Efficiency, Hill Climbing, Speed, and Weekend Outing modes
- **Custom Configuration**: Create personalized settings based on your specific needs
- **Real-time Validation**: Ensures all settings are within safe operating parameters

### 🌟 Weekend Outing & Trip Planning
- **Single-Page Trip Planner**: Streamlined interface for weekend adventure planning
- **Legal Route Filtering**: Automatic filtering based on Golf Cart vs LSV classification
- **Towing Mode**: Special optimizations for pulling trailers or cargo
- **Exploration Radius**: Selectable radius (2-20 miles) for trip planning
- **Example Routes**: Pre-configured routes like San Carlos to Point Loma
- **Smart Recommendations**: AI-powered suggestions based on vehicle capabilities

### 📄 PDF Import & Export
- **Multi-format PDF Support**: Import from Sentry software exports and optimization comparison documents
- **Intelligent Format Detection**: Automatically detects and handles different PDF formats
- **Value Selection**: Choose between original and optimized values when importing comparison data
- **Export Capabilities**: Generate professional PDF reports of your configurations

### 🔧 Advanced Features
- **Secure API Key Storage**: Encrypted storage for weather and terrain service API keys
- **Caching System**: Optimized performance with intelligent data caching
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Offline Capability**: Core functionality works without internet connection

### 🛡️ Safety & Security
- **Safety Disclaimers**: Clear warnings about controller modifications
- **Validation System**: Prevents dangerous or invalid configurations
- **Backup Recommendations**: Emphasizes saving original settings before modifications
- **Encrypted Storage**: Secure handling of sensitive API keys and user data

## 📸 Screenshots

<!-- Add screenshots here when available -->
*Screenshots will be added soon*

### Main Interface
![Main Interface](docs/screenshots/main-interface.png)
*The main optimization interface with preset selection*

### Trip Planner
![Trip Planner](docs/screenshots/trip-planner.png)
*Interactive trip planning with weather and terrain analysis*

### Configuration Wizard
![Configuration Wizard](docs/screenshots/config-wizard.png)
*Step-by-step configuration wizard*

### PDF Import
![PDF Import](docs/screenshots/pdf-import.png)
*Multi-format PDF import with value selection*

## 🚀 Installation

### Quick Start (Static Files)
1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/gem-t2-optimizer.git
   cd gem-t2-optimizer
   ```

2. **Open in web browser:**
   ```bash
   # Option 1: Direct file access
   open index.html
   
   # Option 2: Local server (recommended)
   python -m http.server 8000
   # Then visit http://localhost:8000
   ```

### Advanced Setup (with Backend)
1. **Clone and setup:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/gem-t2-optimizer.git
   cd gem-t2-optimizer
   ```

2. **Backend setup (optional):**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database configuration
   npm start
   ```

3. **MCP Server setup (optional):**
   ```bash
   cd mcp-server
   npm install
   npm run build
   npm start
   ```

### Requirements
- **Web Browser**: Modern browser with JavaScript enabled
- **Optional**: Node.js 16+ for backend features
- **Optional**: SQLite for trip data storage

## 📖 Usage

### Basic Configuration
1. **Start the Application**: Open `index.html` or `gem-optimizer.html` in your browser
2. **Accept Safety Disclaimer**: Read and accept the safety warnings
3. **Choose Preset**: Select from predefined optimization presets or create custom
4. **Configure Settings**: Follow the step-by-step wizard
5. **Download Results**: Get your optimized controller settings

### Preset Options
- **🏁 Performance**: Maximum speed and acceleration
- **🔋 Efficiency**: Best range and battery life
- **⛰️ Hill Climbing**: Optimized for steep terrain
- **🏎️ Speed Demon**: Top speed focused
- **🌲 Weekend Outing**: Trip-optimized with weather integration

## 🔑 API Setup

### Weather API (OpenWeatherMap)
1. **Get API Key**: Visit [OpenWeatherMap](https://openweathermap.org/api)
2. **Create Account**: Sign up for free account
3. **Generate Key**: Create API key in dashboard
4. **Configure**: Click "⚙️ Configure APIs" in the app and enter your key

### Terrain API (Mapbox - Optional)
1. **Get API Key**: Visit [Mapbox](https://account.mapbox.com/)
2. **Create Account**: Sign up for account
3. **Generate Token**: Create access token
4. **Configure**: Enter in API configuration modal

### API Features Without Keys
- Weather: Falls back to seasonal estimates
- Terrain: Uses free OpenElevation service
- Geocoding: Uses Nominatim (OpenStreetMap)

## 🗺️ Trip Planning

The Weekend Outing preset includes advanced trip planning features:

### Features
- **Route Analysis**: Calculates distance, elevation gain, and terrain difficulty
- **Weather Integration**: Real-time weather data for trip dates
- **Smart Optimization**: Adjusts controller settings based on conditions
- **Destination Suggestions**: Popular GEM-friendly destinations

### Usage
1. Select "🌲 Weekend Outing" preset
2. Enter trip details (destination, dates, event type)
3. Review weather and terrain analysis
4. Get optimized controller settings for your trip

## 📄 PDF Import

### Supported Formats
- **Sentry Software Export**: Standard F.No. and Counts format
- **Optimization Comparison**: Original vs Optimized values format
- **Custom Formats**: Extensible parser for new formats

### Import Process
1. Click "📄 Import from PDF" button
2. Upload or drag-and-drop PDF file
3. Select format if multiple detected
4. Choose values (Original/Optimized/Custom)
5. Preview settings and import

### Supported Data
- Function numbers (F.1 through F.26)
- Controller counts/values
- Function descriptions
- Original and optimized comparisons

## ⚙️ Configuration Presets

### Performance Preset
- Maximizes speed and acceleration
- Optimized for flat terrain
- Best for racing or performance driving

### Efficiency Preset
- Extends battery range
- Gentle acceleration curves
- Ideal for daily commuting

### Hill Climbing Preset
- Enhanced torque for steep grades
- Optimized field current settings
- Perfect for hilly terrain

### Speed Demon Preset
- Maximum top speed configuration
- Aggressive acceleration
- For experienced drivers only

### Weekend Outing Preset
- Weather-adaptive settings
- Trip-specific optimizations
- Balanced performance and efficiency

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Development Setup
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/gem-t2-optimizer.git
cd gem-t2-optimizer

# Install dependencies (if using backend)
cd backend && npm install
cd ../mcp-server && npm install

# Start development server
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Important Disclaimer

**This tool is for educational and informational purposes only.** Modifying your GEM T2 controller settings can affect vehicle performance, safety, and longevity. Always:

- Save your original settings before making changes
- Make changes with key switch OFF and vehicle secured
- Test modifications gradually starting with low speeds
- Confirm your vehicle is in proper working condition before modifications
- Follow all manufacturer recommendations and safety guidelines

**Use at your own risk.** The authors are not responsible for any damage to your vehicle or injury resulting from the use of this tool.

## 🆘 Support

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/gem-t2-optimizer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/gem-t2-optimizer/discussions)
- **Documentation**: Check the `/docs` folder for detailed guides

### Known Issues
- PDF parsing may vary with different document formats
- Weather API has rate limits on free tier
- Some older GEM models may have different function mappings

### Roadmap
- [ ] Mobile app version
- [ ] Cloud settings sync
- [ ] Community preset sharing
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

---

**Made with ❤️ for the GEM community**

*This is an independent tool not affiliated with GEM, Polaris, or General Electric.*