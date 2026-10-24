import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axiosClient, { getErrorMessage } from '../api/client';

// Thunks reject with plain strings so the Redux state stays serialisable.

export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.post('/user/register', userData);
    return data.user;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Registration failed'));
  }
});

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.post('/user/login', credentials);
    return data.user;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Login failed'));
  }
});

export const checkAuth = createAsyncThunk('auth/check', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.get('/user/check');
    return data.user;
  } catch (error) {
    // 401 simply means "not signed in"; it is not an error worth showing.
    return rejectWithValue(error.response?.status === 401 ? null : getErrorMessage(error));
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await axiosClient.post('/user/logout');
    return null;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const deleteAccount = createAsyncThunk('auth/delete', async (_, { rejectWithValue }) => {
  try {
    await axiosClient.delete('/user/deleteProfile');
    return null;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Could not delete account'));
  }
});

const signedOut = (state) => {
  state.user = null;
  state.isAuthenticated = false;
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    initialized: false, // true once the initial session check has finished
    loading: false, // a login/register request is in flight
    error: null,
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.initialized = true;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.initialized = true;
        signedOut(state);
      })
      .addCase(logoutUser.fulfilled, signedOut)
      // Even if the server call fails, drop the local session.
      .addCase(logoutUser.rejected, signedOut)
      .addCase(deleteAccount.fulfilled, signedOut);

    for (const thunk of [loginUser, registerUser]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = false;
          state.user = action.payload;
          state.isAuthenticated = !!action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload || 'Something went wrong';
          signedOut(state);
        });
    }
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
