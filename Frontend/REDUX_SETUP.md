# Redux Setup Documentation

## ✅ Redux Toolkit Integration Complete

Redux Toolkit has been integrated into the frontend with proper typing and hooks.

## 📦 Installed Packages

- `redux` - Core Redux library
- `@reduxjs/toolkit` - Redux Toolkit for simplified Redux
- `react-redux` - React bindings for Redux

## 🏗️ Store Structure

```
src/store/
├── index.ts              # Store configuration
├── hooks.ts              # Typed Redux hooks
└── slices/
    ├── auth.slice.ts     # Authentication state
    ├── complaints.slice.ts  # Complaints state
    ├── meetings.slice.ts    # Meetings state
    └── ui.slice.ts          # UI state (modals, sidebar, notifications)
```

## 🔌 Redux Slices

### 1. Auth Slice (`auth.slice.ts`)
- **State**: user, token, isAuthenticated, isAdmin, loading, error
- **Async Thunks**:
  - `login(email, password)` - User login
  - `getMe()` - Get current user
  - `logout()` - User logout
- **Actions**: setUser, setToken, clearError, initializeAuth

### 2. Complaints Slice (`complaints.slice.ts`)
- **State**: complaints array, currentComplaint, statistics, filters, pagination
- **Async Thunks**:
  - `fetchComplaints(filters)` - Fetch complaints list
  - `fetchComplaintById(id)` - Fetch single complaint
  - `createComplaint(complaint)` - Create new complaint
  - `updateComplaint(id, updates)` - Update complaint
  - `fetchStatistics()` - Fetch complaint statistics
- **Actions**: setFilters, clearFilters, setCurrentComplaint, clearError

### 3. Meetings Slice (`meetings.slice.ts`)
- **State**: meetings array, currentMeeting, pagination
- **Async Thunks**:
  - `fetchMeetings(page, limit)` - Fetch meetings list
  - `fetchMeetingById(id)` - Fetch single meeting
  - `createMeeting(meeting)` - Create new meeting
  - `updateMeeting(id, updates)` - Update meeting
- **Actions**: setCurrentMeeting, clearError

### 4. UI Slice (`ui.slice.ts`)
- **State**: activeModal, modalProps, sidebarOpen, notifications
- **Actions**:
  - `openModal(type, props)` - Open modal
  - `closeModal()` - Close modal
  - `setSidebarOpen(open)` - Set sidebar state
  - `toggleSidebar()` - Toggle sidebar
  - `addNotification(notification)` - Add notification
  - `removeNotification(id)` - Remove notification
  - `clearNotifications()` - Clear all notifications

## 🎣 Custom Hooks

### useAuth()
```typescript
const { user, isAuthenticated, isAdmin, login, logout } = useAuth();
```

### useComplaints()
```typescript
const {
  complaints,
  loading,
  fetchComplaints,
  createComplaint,
  setFilters
} = useComplaints();
```

### useMeetings()
```typescript
const {
  meetings,
  loading,
  fetchMeetings,
  createMeeting
} = useMeetings();
```

### useUI()
```typescript
const {
  activeModal,
  openModal,
  closeModal,
  sidebarOpen,
  toggleSidebar
} = useUI();
```

## 📝 Usage Examples

### Using Redux in Components

```typescript
import { useAuth } from '@/hooks/useAuth';
import { useComplaints } from '@/hooks/useComplaints';

function MyComponent() {
  const { user, isAuthenticated, login } = useAuth();
  const { complaints, loading, fetchComplaints } = useComplaints();

  useEffect(() => {
    if (isAuthenticated) {
      fetchComplaints({ page: 1, limit: 20 });
    }
  }, [isAuthenticated]);

  return (
    <div>
      {loading ? 'Loading...' : complaints.map(...)}
    </div>
  );
}
```

### Direct Redux Access (if needed)

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchComplaints } from '@/store/slices/complaints.slice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const complaints = useAppSelector((state) => state.complaints.complaints);

  const handleFetch = () => {
    dispatch(fetchComplaints({ page: 1 }));
  };

  return <button onClick={handleFetch}>Fetch</button>;
}
```

## 🔄 Redux DevTools

Redux DevTools is automatically enabled in development. Install the browser extension to debug Redux state.

## 🚀 Benefits

1. **Centralized State Management**: All app state in one place
2. **Type Safety**: Fully typed with TypeScript
3. **Time Travel Debugging**: Redux DevTools support
4. **Predictable Updates**: Actions → Reducers → State
5. **Async Handling**: Built-in async thunk support
6. **Optimistic Updates**: Easy to implement
7. **Persistence Ready**: Can easily add redux-persist

## 📚 Next Steps

1. ✅ Redux store configured
2. ✅ Slices created for auth, complaints, meetings, UI
3. ✅ Custom hooks for easy component usage
4. ⏳ Add more slices as needed (inventory, feedback, etc.)
5. ⏳ Add redux-persist for state persistence (optional)

## 🔗 Integration with React Query

Redux and React Query can work together:
- **Redux**: For client-side state (UI state, auth state, cached user data)
- **React Query**: For server state (API data with caching, refetching, etc.)

Both are available and can be used based on the use case.

