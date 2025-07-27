# StockPA.ai 🚀

**Your AI Personal Assistant for Smarter Nigerian Stock Investing**

StockPA.ai is a comprehensive investment platform that provides personalized portfolio analysis, AI-powered recommendations, and performance tracking for Nigerian stock market investors.

## ✨ Features

### 🎯 **Personalized Dashboard**
- **User-exclusive data** - Each user sees only their portfolios and analysis
- **Auto-save portfolios** - Immediate persistence on upload/entry
- **Cross-session persistence** - All data available whenever you log in
- **Portfolio history** - Complete timeline of all portfolios and analyses

### 🤖 **AI-Powered Analysis**
- **3-Model AI System** - Mistral 7B, CodeLlama 13B, Llama3 8B working together
- **Comprehensive recommendations** - BUY/SELL/HOLD with reasoning and target prices
- **Risk assessment** - Detailed risk analysis and confidence scoring
- **Real-time analysis** - Live AI processing of portfolio data

### 📊 **Advanced Analytics**
- **Performance tracking** - Track accuracy of AI recommendations
- **Peer comparison** - See how you rank against other investors
- **Portfolio health** - Concentration risk, diversity, and liquidity analysis
- **Missed opportunities** - Track potential gains from recommendations not followed

### 🔐 **Secure Authentication**
- **Google OAuth** - Secure login with Google accounts
- **JWT tokens** - Secure API access with automatic refresh
- **User isolation** - Complete data separation between users

## 🏗️ Architecture

### **Frontend (React + TypeScript)**
- **Port 8002** - React SPA with Material-UI
- **Auto-save functionality** - Portfolio changes saved immediately
- **Responsive design** - Works on desktop and mobile
- **Real-time feedback** - Loading states and success/error messages

### **Backend (Node.js + Express)**
- **Port 8001** - RESTful API with TypeScript
- **Prisma ORM** - Type-safe database operations
- **JWT authentication** - Secure user sessions
- **AI engine integration** - Direct connection to analysis models

### **Database (PostgreSQL)**
- **Port 8003** - Persistent data storage
- **User portfolios** - All portfolio data with version history
- **AI recommendations** - Complete analysis results and tracking
- **Performance analytics** - User metrics and peer comparisons

### **AI Engine (Ollama)**
- **Port 8005** - Local AI model serving
- **3-Model system** - Multiple models for comprehensive analysis
- **Nigerian market focus** - Specialized for NSE stocks

### **Cache (Redis)**
- **Port 8004** - Session management and caching
- **Performance optimization** - Fast data retrieval

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- Google Cloud Console account (for OAuth)

### 1. Clone and Setup
```bash
git clone https://github.com/gingerol/StockPA.ai.git
cd StockPA.ai
```

### 2. Environment Configuration
Create `.env` file in `/backend/` directory:
```bash
# Database
DATABASE_URL="postgresql://stockpa:stockpa123@localhost:8003/stockpa_db?schema=public"

# JWT Secrets
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Google OAuth (replace with your credentials)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Redis
REDIS_URL=redis://localhost:6379

# AI Engine
OLLAMA_URL=http://localhost:8005
```

### 3. Start Services
```bash
docker-compose up -d
```

Services will start on:
- **Frontend**: http://localhost:8002
- **Backend API**: http://localhost:8001
- **Database**: localhost:8003
- **Redis**: localhost:8004
- **AI Engine**: localhost:8005

### 4. Access Application
1. Go to http://localhost:8002
2. Click "Sign in with Google"
3. Upload your portfolio (CSV or manual entry)
4. Get AI-powered recommendations!

## 📈 User Journey

### **Anonymous Users**
- ✅ View landing page and features
- ❌ No portfolio persistence
- 🔄 Encouraged to sign up for full features

### **Authenticated Users**
1. **Login** → Personalized welcome dashboard
2. **Upload Portfolio** → Auto-saves to database immediately
3. **AI Analysis** → 3-model analysis with comprehensive recommendations
4. **Track Performance** → See how AI recommendations perform
5. **Compare with Peers** → Ranking and percentile scoring
6. **Portfolio Health** → Risk and diversity analysis
7. **Return Anytime** → All data persists across sessions

## 🎯 Key Workflows

### **Portfolio Upload → Analysis → Tracking**
```
User uploads CSV/manual entry
     ↓
Portfolio auto-saves to database
     ↓
User clicks "Analyze with AI (3 Models)"
     ↓
3-model AI analysis runs
     ↓
BUY/SELL/HOLD recommendations generated
     ↓
Results saved permanently
     ↓
Performance tracking begins
     ↓
Dashboard analytics update
```

### **Personalized Analytics**
- **Performance Widget** - Accuracy rates, returns, missed opportunities
- **Peer Comparison** - Rankings and percentile comparisons
- **Portfolio Health** - Concentration risk and diversity scores
- **History Timeline** - Complete analysis and action history

## 🛠️ Development

### **Backend Development**
```bash
cd backend
npm install
npm run dev  # Development with hot reload
npm run build  # Production build
```

### **Frontend Development**  
```bash
cd frontend
npm install
npm start  # Development server
npm run build  # Production build
```

### **Database Operations**
```bash
cd backend
npx prisma migrate dev  # Run migrations
npx prisma studio  # Database GUI
npx prisma generate  # Regenerate client
```

## 🔧 API Endpoints

### **Authentication**
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### **Portfolios**
- `POST /api/portfolios` - Save portfolio
- `GET /api/portfolios` - Get user portfolios
- `POST /api/portfolios/analyze` - Run AI analysis
- `GET /api/portfolios/:id/analysis` - Get analysis results

### **Dashboard Analytics**
- `GET /api/dashboard/performance` - User performance metrics
- `GET /api/dashboard/peer-comparison` - Peer rankings
- `GET /api/dashboard/portfolio-health/:id` - Portfolio health score

## 🎨 Tech Stack

**Frontend:**
- React 18 with TypeScript
- Material-UI (MUI) for components
- Zustand for state management
- React Query for data fetching
- Recharts for data visualization

**Backend:**
- Node.js with Express
- TypeScript for type safety
- Prisma ORM with PostgreSQL
- JWT authentication
- Passport.js for OAuth

**AI/ML:**
- Ollama for local model serving
- Mistral 7B for market intelligence
- CodeLlama 13B for technical analysis
- Llama3 8B for fundamental analysis

**Infrastructure:**
- Docker Compose for development
- PostgreSQL for data persistence
- Redis for caching and sessions
- Nginx for production (optional)

## 🚀 Production Deployment

### **Environment Variables**
Set production values for:
- `DATABASE_URL` - Production database
- `GOOGLE_CLIENT_ID/SECRET` - Production OAuth credentials
- `JWT_SECRET/REFRESH_SECRET` - Strong production secrets
- `REDIS_URL` - Production Redis instance

### **Docker Production**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### **Security Considerations**
- ✅ JWT tokens with automatic refresh
- ✅ User data isolation by design
- ✅ OAuth with Google for secure authentication
- ✅ Environment-based configuration
- ✅ SQL injection prevention with Prisma
- ✅ Rate limiting on API endpoints

## 📊 Features Summary

| Feature | Anonymous | Authenticated | Description |
|---------|-----------|---------------|-------------|
| Portfolio Upload | ❌ | ✅ | CSV upload or manual entry |
| AI Analysis | ❌ | ✅ | 3-model recommendation system |
| Data Persistence | ❌ | ✅ | Cross-session data storage |
| Performance Tracking | ❌ | ✅ | Recommendation accuracy tracking |
| Peer Comparison | ❌ | ✅ | Rankings against other users |
| Portfolio Health | ❌ | ✅ | Risk and diversity analysis |
| Export Features | ❌ | ✅ | Data download and sharing |

## 🎯 Mission

StockPA.ai democratizes professional-grade investment analysis for Nigerian stock market participants, providing AI-powered insights that were previously available only to institutional investors.

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support, email support@stockpa.ai or create an issue in this repository.

---

**Built with ❤️ for Nigerian investors**

🚀 *Making smart investing accessible to everyone*