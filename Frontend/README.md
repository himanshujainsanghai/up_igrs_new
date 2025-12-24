# New Frontend - Grievance Aid System

A fresh frontend implementation aligned with the MongoDB backend, featuring a BJP Orange/Saffron theme.

## 🎨 Features

- ✅ **Complete Backend Integration**: All services mapped to backend routes
- ✅ **BJP Orange Theme**: Saffron/orange color scheme throughout
- ✅ **TypeScript**: Full type safety
- ✅ **Modern Stack**: React 18, Vite, Tailwind CSS, shadcn/ui
- ✅ **API Client**: Centralized axios-based API client with JWT authentication

## 📁 Project Structure

```
frontend/
├── src/
│   ├── lib/              # Core utilities and API client
│   │   ├── api.ts        # Axios client with interceptors
│   │   ├── constants.ts  # App constants
│   │   └── utils.ts      # Utility functions
│   ├── services/         # API service layer (all backend routes)
│   │   ├── auth.service.ts
│   │   ├── complaints.service.ts
│   │   ├── meetings.service.ts
│   │   ├── inventory.service.ts
│   │   ├── ai.service.ts
│   │   ├── upload.service.ts
│   │   ├── feedback.service.ts
│   │   ├── otp.service.ts
│   │   ├── reports.service.ts
│   │   └── location.service.ts
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   ├── contexts/         # React contexts (Auth, Modal, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── components/       # React components
│   │   └── ui/          # shadcn/ui components
│   ├── pages/           # Page components
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles with BJP theme
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 🚀 Getting Started

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_FRONTEND_URL=http://localhost:8080
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## 🔗 Backend Routes Mapping

All frontend services are mapped to backend routes:

- **Auth**: `/api/v1/auth/*`
- **Complaints**: `/api/v1/complaints/*`
- **Meetings**: `/api/v1/meetings/*`
- **Inventory**: `/api/v1/inventory/*`
- **AI**: `/api/v1/ai/*`
- **Upload**: `/api/v1/upload/*`
- **Feedback**: `/api/v1/feedback/*`
- **OTP**: `/api/v1/otp/*`
- **Reports**: `/api/v1/reports/*`
- **Location**: `/api/v1/location/*`

## 🎨 Theme Colors

The BJP Orange/Saffron theme uses:
- Primary: `hsl(30, 100%, 60%)` - Orange/Saffron
- Accent: `hsl(30, 100%, 50%)` - Darker Orange
- All components styled with orange theme

## 📝 Next Steps

1. ✅ Core structure and services completed
2. ⏳ Contexts (Auth, Modal)
3. ⏳ UI Components (with orange theme)
4. ⏳ Pages (Home, Complaints, Track, Admin)
5. ⏳ Modals (FileComplaint, TrackComplaint, etc.)
6. ⏳ Hooks (useAuth, useComplaints, etc.)

## 🔐 Authentication

JWT tokens are stored in localStorage and automatically included in API requests via the axios interceptor.

## 📦 Services

All services follow the same pattern:
- Import from `@/lib/api`
- Use typed responses with `ApiResponse<T>`
- Handle errors through the API client interceptors

Example:
```typescript
import { complaintsService } from '@/services/complaints.service';

const complaints = await complaintsService.getComplaints({
  page: 1,
  limit: 20,
  status: 'pending'
});
```

