// src/store/slices/authSlice.ts - ENHANCED VERSION
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, LoginCredentials, AuthResponse } from '@/types';
import { authService } from '@/services/authService';

const initialState: AuthState = {
isAuthenticated: false,
user: null,
token: null,
loading: false,
error: null,
};

const handleAsyncError = (error: any): string => {
  return error.response?.data?.message || error.message || 'An unexpected error occurred';
};

// Send verification code
export const sendVerificationCode = createAsyncThunk(
  'auth/sendVerificationCode',
  async (phoneNumber: string, { rejectWithValue }) => {
    try {
      const response = await authService.sendVerificationCode(phoneNumber);
      return response;
    } catch (error: any) {
      return rejectWithValue(handleAsyncError(error));
    }
  }
);

// Login with phone and verification code
export const loginWithPhone = createAsyncThunk(
  'auth/loginWithPhone',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.loginWithPhone(credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAsyncError(error));
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async (userData: { phoneNumber: string; displayName: string; dateOfBirth: Date }, { rejectWithValue }) => {
    try {
      const response = await authService.signup(userData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleAsyncError(error));
    }
  }
);

// Logout user
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error: any) {
      // Continue with logout even if server call fails
      console.warn('Logout server call failed:', error);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    updateCoreUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    resetAuthState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Send verification code
      .addCase(sendVerificationCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendVerificationCode.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(sendVerificationCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Login with phone
      .addCase(loginWithPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithPhone.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginWithPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Signup user
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = null;
        state.loading = false;
      });
  },
});

export const {
  clearError,
  setUser,
  updateCoreUser,
  setToken,
  resetAuthState
} = authSlice.actions;

export default authSlice.reducer;
