import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../utils/apiClient';
import { RootState } from './index';

export interface OrderItemInput { id: string; qty: number }
export interface PlacedOrder { _id: string; tableId?: string; tableNumber?: string; items: any[]; status: string; timestamp?: string }

interface OrderState {
  placing: boolean;
  error?: string;
}

const initialState: OrderState = { placing: false };

export const placeCounterOrder = createAsyncThunk<PlacedOrder, { restaurantId: string; tableNumber?: string; items: { id: string; qty: number }[]; discount?: number }>(
  'order/placeCounterOrder',
  async ({ restaurantId, tableNumber, items, discount }) => {
    const effectiveTable = (tableNumber && tableNumber.trim()) || 'Cash Counter';
    // Convert to API expected format
    // Use public create with menu item details
    const menuRes = await apiClient.get(`/api/restaurants/${restaurantId}/menu`);
    const itemMap: Record<string, any> = {};
    for (const i of menuRes.data || []) itemMap[i._id] = i;
    const apiItems = items.map(i => ({ menuItem: i.id, quantity: i.qty, name: itemMap[i.id]?.name, price: itemMap[i.id]?.price }));

    const totalAmount = apiItems.reduce((s, it) => s + (it.price || 0) * it.quantity, 0);
    // Ensure a table exists with the desired tableNumber (e.g., "Cash Counter")
    try {
      const tablesRes = await apiClient.get(`/api/restaurants/${restaurantId}/tables`);
      const exists = (tablesRes.data || []).some((t: any) => String(t.tableNumber).toLowerCase() === effectiveTable.toLowerCase());
      if (!exists) {
        await apiClient.post(`/api/restaurants/${restaurantId}/tables`, { tableNumber: effectiveTable });
      }
    } catch (e) {
      // Ignore table creation errors; the public endpoint will validate again
    }

    // Place the order using public endpoint (it converts tableNumber to ObjectId internally)
    // Pull GST settings from first table to apply GST consistently
    let gstEnabled = false;
    let gstPercentage = 0;
    try {
      const tablesRes = await apiClient.get(`/api/restaurants/${restaurantId}/tables`);
      const first = (tablesRes.data || [])[0];
      if (first) {
        gstEnabled = !!first.gstEnabled;
        gstPercentage = Number(first.gstPercentage) || 0;
      }
    } catch {}

    const gstAmount = gstEnabled ? (totalAmount * gstPercentage) / 100 : 0;
    const safeDiscount = Math.min(discount || 0, totalAmount + gstAmount);
    const discountedTotal = Math.max(0, totalAmount + gstAmount - safeDiscount);
    const res = await apiClient.post(`/api/orders/public/${restaurantId}`, {
      tableId: effectiveTable,
      items: apiItems,
      totalAmount: discountedTotal,
      description: [
        (discount && safeDiscount > 0) ? `Discount: ₹${safeDiscount}` : null,
        gstEnabled ? `GST(${gstPercentage}%): ₹${gstAmount.toFixed(2)}` : null,
      ].filter(Boolean).join(' | ') || undefined,
    });
    return res.data;
  }
);

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(placeCounterOrder.pending, (state) => { state.placing = true; state.error = undefined; })
      .addCase(placeCounterOrder.fulfilled, (state) => { state.placing = false; })
      .addCase(placeCounterOrder.rejected, (state, action) => { state.placing = false; state.error = action.error.message; });
  }
});

export const selectOrderPlacing = (s: RootState) => s.order.placing;
export default orderSlice.reducer;
