import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../utils/apiClient';
import { RootState } from './index';

export interface Category { _id: string; name: string }
export interface MenuItem { _id: string; name: string; price: number; category?: string; imageUrl?: string }

interface MenuState {
  categories: Category[];
  itemsByCategory: Record<string, MenuItem[]>;
  loading: boolean;
  error?: string;
  selectedCategoryId?: string;
}

const initialState: MenuState = {
  categories: [],
  itemsByCategory: {},
  loading: false,
};

export const fetchCategories = createAsyncThunk< Category[], { restaurantId: string } >(
  'menu/fetchCategories',
  async ({ restaurantId }) => {
    try {
      const res = await apiClient.get(`/api/restaurants/${restaurantId}/categories/${restaurantId}`);
      let list = res.data as Category[];
      if (!Array.isArray(list) || list.length === 0) {
        // Fallback: derive from menu items if categories collection is empty
        const menuRes = await apiClient.get(`/api/restaurants/${restaurantId}/menu`);
        const names: string[] = Array.from(new Set((menuRes.data || []).map((i: any) => i.category).filter(Boolean)));
        list = names.map((name) => ({ _id: name, name }));
      }
      return list;
    } catch (err) {
      // On error, fallback to menu-derived categories
      const menuRes = await apiClient.get(`/api/restaurants/${restaurantId}/menu`);
      const names: string[] = Array.from(new Set((menuRes.data || []).map((i: any) => i.category).filter(Boolean)));
      return names.map((name) => ({ _id: name, name }));
    }
  }
);

export const fetchItemsForCategory = createAsyncThunk< { categoryId: string; items: MenuItem[] }, { restaurantId: string; categoryName: string; categoryId: string } >(
  'menu/fetchItemsForCategory',
  async ({ restaurantId, categoryName, categoryId }) => {
    // Fetch full menu then filter on client (reuse existing endpoint)
    const res = await apiClient.get(`/api/restaurants/${restaurantId}/menu`);
    const items: MenuItem[] = (res.data || []).filter((i: any) => (i.category || '').toLowerCase() === categoryName.toLowerCase());
    return { categoryId, items };
  }
);

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setSelectedCategory(state, action: PayloadAction<string | undefined>) {
      state.selectedCategoryId = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchCategories.pending, (state) => { state.loading = true; state.error = undefined; })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false; state.error = action.error.message;
      })
      .addCase(fetchItemsForCategory.pending, (state) => { state.loading = true; })
      .addCase(fetchItemsForCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.itemsByCategory[action.payload.categoryId] = action.payload.items;
      })
      .addCase(fetchItemsForCategory.rejected, (state, action) => {
        state.loading = false; state.error = action.error.message;
      });
  }
});

export const { setSelectedCategory } = menuSlice.actions;
export const selectCategories = (s: RootState) => s.menu.categories;
export const selectSelectedCategoryId = (s: RootState) => s.menu.selectedCategoryId;
export const selectItemsFor = (categoryId?: string) => (s: RootState) => (categoryId ? s.menu.itemsByCategory[categoryId] : undefined) || [];

export default menuSlice.reducer;
